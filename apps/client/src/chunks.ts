import {
  BufferGeometry, DoubleSide, Float32BufferAttribute, Mesh, MeshLambertMaterial,
  Scene, Uint16BufferAttribute, Vector3,
} from 'three';
import { childTiles, faceDirection, parentTile, tileAngularRadius, tileCentre, tileKey, tileUv, type Face, type Tile } from './planet';
import type { Sampler, WorldConfig } from './worldgen';

const RESOLUTION = 16;
const MAX_LEVEL = 14;
const MAX_VISIBLE = 150;
const MAX_CACHED = 220;
const PIXELS_PER_TILE = 230;

const biomeColors: Record<number, [number, number, number]> = {
  0: [0.08, 0.31, 0.48], // ocean
  1: [0.72, 0.66, 0.44], // coast
  2: [0.75, 0.56, 0.29], // desert
  3: [0.34, 0.59, 0.31], // grassland
  4: [0.13, 0.39, 0.25], // forest
  5: [0.47, 0.57, 0.52], // tundra
  6: [0.43, 0.44, 0.43], // mountain
  7: [0.84, 0.88, 0.88], // snow
};

interface CachedTile {
  tile: Tile;
  mesh: Mesh;
  usedAt: number;
  triangles: number;
}

export interface ChunkMetrics {
  visible: number;
  cached: number;
  queued: number;
  triangles: number;
  generationMs: number;
}

export class ChunkManager {
  private readonly cache = new Map<string, CachedTile>();
  private desired: Tile[] = [];
  private queue: Tile[] = [];
  private lastPlan = 0;
  private generationMs = 0;
  private visibleCount = 0;
  private triangleCount = 0;
  private readonly material = new MeshLambertMaterial({ vertexColors: true, flatShading: true, side: DoubleSide });

  constructor(
    private readonly scene: Scene,
    private readonly sampler: Sampler,
    private readonly config: WorldConfig,
  ) {}

  update(cameraPosition: Vector3, localSurfaceRadius: number, viewportWidth: number, viewportHeight: number, fovDegrees: number, now: number): void {
    if (now - this.lastPlan > 120 || this.desired.length === 0) {
      this.desired = planVisibleTiles(cameraPosition, localSurfaceRadius, viewportWidth, viewportHeight, fovDegrees);
      this.lastPlan = now;
      this.queue = this.buildQueue(cameraPosition);
    }
    this.generateWithinBudget();
    this.showBestAvailable(now);
    this.evictUnused();
  }

  metrics(): ChunkMetrics {
    return {
      visible: this.visibleCount,
      cached: this.cache.size,
      queued: this.queue.length,
      triangles: this.triangleCount,
      generationMs: this.generationMs,
    };
  }

  dispose(): void {
    for (const entry of this.cache.values()) {
      this.scene.remove(entry.mesh);
      entry.mesh.geometry.dispose();
    }
    this.cache.clear();
    this.material.dispose();
  }

  private buildQueue(cameraPosition: Vector3): Tile[] {
    const requested = new Map<string, Tile>();
    for (let face = 0; face < 6; face++) {
      const root: Tile = { face: face as Face, level: 0, x: 0, y: 0 };
      if (!this.cache.has(tileKey(root))) requested.set(tileKey(root), root);
    }
    for (const tile of this.desired) {
      if (!this.cache.has(tileKey(tile))) requested.set(tileKey(tile), tile);
    }
    return [...requested.values()].sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return cameraPosition.distanceToSquared(tileCentre(a).multiplyScalar(this.config.planet.radius_km))
        - cameraPosition.distanceToSquared(tileCentre(b).multiplyScalar(this.config.planet.radius_km));
    });
  }

  private generateWithinBudget(): void {
    const start = performance.now();
    let count = 0;
    while (this.queue.length > 0 && count < 3 && performance.now() - start < 7) {
      const tile = this.queue.shift()!;
      if (this.cache.has(tileKey(tile))) continue;
      const before = performance.now();
      const mesh = buildTileMesh(tile, this.config, this.sampler, this.material);
      this.generationMs = performance.now() - before;
      mesh.visible = false;
      this.scene.add(mesh);
      const triangles = (mesh.geometry.getIndex()?.count ?? 0) / 3;
      this.cache.set(tileKey(tile), { tile, mesh, usedAt: performance.now(), triangles });
      count++;
    }
  }

  private showBestAvailable(now: number): void {
    for (const entry of this.cache.values()) entry.mesh.visible = false;
    const render = new Map<string, Tile>();
    for (const leaf of this.desired) {
      let candidate: Tile | null = leaf;
      while (candidate && !this.cache.has(tileKey(candidate))) candidate = parentTile(candidate);
      if (candidate) render.set(tileKey(candidate), candidate);
    }
    // Keep a parent visible until every desired descendant has arrived, avoiding overlap.
    for (const [key, tile] of render) {
      let ancestor = parentTile(tile);
      while (ancestor) {
        if (render.has(tileKey(ancestor))) {
          render.delete(key);
          break;
        }
        ancestor = parentTile(ancestor);
      }
    }
    this.visibleCount = 0;
    this.triangleCount = 0;
    for (const key of render.keys()) {
      const entry = this.cache.get(key)!;
      entry.mesh.visible = true;
      entry.usedAt = now;
      this.visibleCount++;
      this.triangleCount += entry.triangles;
    }
  }

  private evictUnused(): void {
    if (this.cache.size <= MAX_CACHED) return;
    const candidates = [...this.cache.values()]
      .filter(entry => !entry.mesh.visible && entry.tile.level > 0)
      .sort((a, b) => a.usedAt - b.usedAt);
    for (const entry of candidates) {
      if (this.cache.size <= MAX_CACHED) break;
      this.scene.remove(entry.mesh);
      entry.mesh.geometry.dispose();
      this.cache.delete(tileKey(entry.tile));
    }
  }
}

function planVisibleTiles(cameraPosition: Vector3, radius: number, viewportWidth: number, viewportHeight: number, fovDegrees: number): Tile[] {
  const leaves: Array<{ tile: Tile; pixels: number }> = [];
  const distance = cameraPosition.length();
  const cameraDirection = cameraPosition.clone().normalize();
  const cameraForward = cameraDirection.clone().negate();
  const horizonAngle = distance > radius ? Math.acos(Math.min(1, radius / distance)) : 0;
  const focalPixels = viewportHeight / (2 * Math.tan(fovDegrees * Math.PI / 360));
  const halfDiagonalFov = Math.atan(Math.tan(fovDegrees * Math.PI / 360)
    * Math.hypot(1, viewportWidth / viewportHeight));

  function projectedSize(tile: Tile): number | null {
    const centre = tileCentre(tile);
    const angularRadius = tileAngularRadius(tile);
    if (cameraDirection.angleTo(centre) > horizonAngle + angularRadius + 0.03) return null;
    const surfacePoint = centre.clone().multiplyScalar(radius);
    const toSurface = Math.max(0.01, cameraPosition.distanceTo(surfacePoint));
    const span = 2 * radius * Math.sin(angularRadius);
    const coneRadius = Math.atan2(span / 2, toSurface);
    const toTile = surfacePoint.sub(cameraPosition);
    if (cameraForward.angleTo(toTile) > halfDiagonalFov + coneRadius + 0.12) return null;
    return span * focalPixels / toSurface;
  }
  for (let face = 0; face < 6; face++) {
    const tile: Tile = { face: face as Face, level: 0, x: 0, y: 0 };
    const pixels = projectedSize(tile);
    if (pixels !== null) leaves.push({ tile, pixels });
  }
  // Refine the largest on-screen tile first. Count only children that actually
  // intersect the view, so culling never consumes the leaf budget.
  while (true) {
    let best = -1;
    let largest = PIXELS_PER_TILE;
    for (let i = 0; i < leaves.length; i++) {
      if (leaves[i]!.tile.level < MAX_LEVEL && leaves[i]!.pixels > largest) {
        best = i;
        largest = leaves[i]!.pixels;
      }
    }
    if (best < 0) break;
    const children = childTiles(leaves[best]!.tile)
      .map(tile => ({ tile, pixels: projectedSize(tile) }))
      .filter((entry): entry is { tile: Tile; pixels: number } => entry.pixels !== null);
    if (leaves.length - 1 + children.length > MAX_VISIBLE) {
      leaves[best]!.pixels = 0;
      continue;
    }
    leaves.splice(best, 1, ...children);
  }
  return leaves.map(entry => entry.tile);
}

function buildTileMesh(tile: Tile, config: WorldConfig, sampler: Sampler, material: MeshLambertMaterial): Mesh {
  const seed = Number(config.seed);
  const samples = sampler.sample_chunk(seed, config.generator_version, tile.face, tile.level, tile.x, tile.y, RESOLUTION);
  const side = RESOLUTION + 1;
  if (samples.length !== side * side * 4) throw new Error(`Invalid worldgen chunk length for ${tileKey(tile)}.`);

  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const radius = config.planet.radius_km;
  const seaLevel = config.planet.sea_level_m;
  const vertex = (x: number, y: number, depthKm = 0): number => {
    const i = (y * side + x) * 4;
    const heightM = Math.max(samples[i]!, seaLevel);
    const biome = samples[i + 3]!;
    const [u, v] = tileUv(tile, x, y, RESOLUTION);
    const direction = faceDirection(tile.face, u, v);
    const point = direction.clone().multiplyScalar(radius + heightM / 1000 - depthKm);
    positions.push(point.x, point.y, point.z);
    normals.push(direction.x, direction.y, direction.z);
    const color = biomeColors[biome] ?? biomeColors[3]!;
    colors.push(...color);
    return positions.length / 3 - 1;
  };
  for (let y = 0; y <= RESOLUTION; y++) {
    for (let x = 0; x <= RESOLUTION; x++) vertex(x, y);
  }
  const gridIndex = (x: number, y: number): number => y * side + x;
  for (let y = 0; y < RESOLUTION; y++) {
    for (let x = 0; x < RESOLUTION; x++) {
      const a = gridIndex(x, y), b = gridIndex(x + 1, y);
      const c = gridIndex(x, y + 1), d = gridIndex(x + 1, y + 1);
      indices.push(a, c, b, b, c, d);
    }
  }

  // Radial skirts cover cracks at face boundaries and mismatched quadtree LODs.
  const edges: Array<Array<[number, number]>> = [
    Array.from({ length: side }, (_, i) => [i, 0]),
    Array.from({ length: side }, (_, i) => [RESOLUTION, i]),
    Array.from({ length: side }, (_, i) => [RESOLUTION - i, RESOLUTION]),
    Array.from({ length: side }, (_, i) => [0, RESOLUTION - i]),
  ];
  const skirtDepthKm = 12;
  for (const edge of edges) {
    let previous: { top: number; bottom: number } | null = null;
    for (const [x, y] of edge) {
      const pair = { top: gridIndex(x, y), bottom: vertex(x, y, skirtDepthKm) };
      if (previous) indices.push(previous.top, pair.top, previous.bottom, pair.top, pair.bottom, previous.bottom);
      previous = pair;
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setIndex(new Uint16BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();
  return new Mesh(geometry, material);
}

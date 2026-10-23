import { Vector3 } from 'three';

export type Face = 0 | 1 | 2 | 3 | 4 | 5;

export interface Tile {
  face: Face;
  level: number;
  x: number;
  y: number;
}

export const tileKey = ({ face, level, x, y }: Tile): string => `${face}/${level}/${x}/${y}`;

// Keep this orientation identical to the Rust worldgen crate.
export function faceDirection(face: Face, u: number, v: number): Vector3 {
  switch (face) {
    case 0: return new Vector3(1, v, -u).normalize();
    case 1: return new Vector3(-1, v, u).normalize();
    case 2: return new Vector3(u, 1, -v).normalize();
    case 3: return new Vector3(u, -1, v).normalize();
    case 4: return new Vector3(u, v, 1).normalize();
    case 5: return new Vector3(-u, v, -1).normalize();
  }
}

export function tileUv(tile: Tile, gridX: number, gridY: number, resolution: number): [number, number] {
  const count = 2 ** tile.level;
  return [
    -1 + 2 * (tile.x + gridX / resolution) / count,
    -1 + 2 * (tile.y + gridY / resolution) / count,
  ];
}

export function tileCentre(tile: Tile): Vector3 {
  const [u, v] = tileUv(tile, 0.5, 0.5, 1);
  return faceDirection(tile.face, u, v);
}

export function tileAngularRadius(tile: Tile): number {
  const centre = tileCentre(tile);
  let max = 0;
  for (const [x, y] of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
    const [u, v] = tileUv(tile, x, y, 1);
    max = Math.max(max, centre.angleTo(faceDirection(tile.face, u, v)));
  }
  return max;
}

export function parentTile(tile: Tile): Tile | null {
  if (tile.level === 0) return null;
  return { face: tile.face, level: tile.level - 1, x: Math.floor(tile.x / 2), y: Math.floor(tile.y / 2) };
}

export function childTiles(tile: Tile): Tile[] {
  const level = tile.level + 1;
  const x = tile.x * 2;
  const y = tile.y * 2;
  return [
    { face: tile.face, level, x, y },
    { face: tile.face, level, x: x + 1, y },
    { face: tile.face, level, x, y: y + 1 },
    { face: tile.face, level, x: x + 1, y: y + 1 },
  ];
}

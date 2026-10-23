import { AmbientLight, Color, DirectionalLight, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { ChunkManager } from './chunks';
import { tileAtDirection, tileKey } from './planet';
import { RollingSamples } from './rolling-samples';
import { loadSampler, loadWorldConfig } from './worldgen';
import './styles.css';

const canvas = document.querySelector<HTMLCanvasElement>('#globe');
const status = document.querySelector<HTMLDivElement>('#status');
const metrics = document.querySelector<HTMLDivElement>('#metrics');
if (!canvas || !status || !metrics) throw new Error('Planet viewer elements are missing.');

function setStatus(message: string, error = false): void {
  status!.textContent = message;
  status!.classList.toggle('error', error);
}

async function start(): Promise<void> {
  const gl = canvas!.getContext('webgl2', { antialias: true });
  if (!gl) throw new Error('This browser or device does not provide WebGL2.');

  const config = await loadWorldConfig();
  setStatus(`Seed ${config.seed} · generator v${config.generator_version} · loading WASM…`);
  const sampler = await loadSampler();
  const radius = config.planet.radius_km;
  const scene = new Scene();
  scene.background = new Color(0x050d16);
  scene.add(new AmbientLight(0xffffff, 1.35));
  const sun = new DirectionalLight(0xfff3db, 1.4);
  sun.position.set(2, 1, 3);
  scene.add(sun);

  const renderer = new WebGLRenderer({ canvas: canvas!, context: gl, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const camera = new PerspectiveCamera(50, 1, 0.01, radius * 12);
  const chunks = new ChunkManager(scene, sampler, config);
  let longitude = 0.3;
  let latitude = 0.38;
  let clearanceKm = radius * 1.5;
  let sampledTile = '';
  let sampledSurfaceKm = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  function resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  canvas!.addEventListener('pointerdown', event => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas!.setPointerCapture(event.pointerId);
  });
  canvas!.addEventListener('pointerup', () => { dragging = false; });
  canvas!.addEventListener('pointercancel', () => { dragging = false; });
  canvas!.addEventListener('pointermove', event => {
    if (!dragging) return;
    longitude -= (event.clientX - lastX) * 0.006;
    latitude = Math.max(-Math.PI / 2 + 0.02, Math.min(Math.PI / 2 - 0.02, latitude + (event.clientY - lastY) * 0.006));
    lastX = event.clientX;
    lastY = event.clientY;
  });
  canvas!.addEventListener('wheel', event => {
    event.preventDefault();
    const surfaceRadius = radius + sampledSurfaceKm;
    const zoomedDistance = (surfaceRadius + clearanceKm) * Math.exp(event.deltaY * 0.001);
    clearanceKm = Math.max(0.08, Math.min(radius * 4, zoomedDistance - surfaceRadius));
  }, { passive: false });
  canvas!.addEventListener('dblclick', () => {
    longitude = 0.3;
    latitude = 0.38;
    clearanceKm = radius * 1.5;
  });

  setStatus(`Seed ${config.seed} · generator v${config.generator_version} · ${radius.toFixed(1)} km radius`);
  const startTime = performance.now();
  const frameTimes = new RollingSamples(120);
  let previousFrame = 0;
  let frameCount = 0;
  let fps = 0;
  let fpsStart = startTime;
  let lastMetrics = 0;
  let halted = false;

  function animate(now: number): void {
    if (halted) return;
    requestAnimationFrame(animate);
    if (previousFrame > 0 && now - previousFrame < 1000) frameTimes.add(now - previousFrame);
    previousFrame = now;
    const direction = new Vector3(
      Math.cos(latitude) * Math.cos(longitude),
      Math.sin(latitude),
      Math.cos(latitude) * Math.sin(longitude),
    );
    // Sample a small patch around the camera's radial ground point. Its
    // highest vertex is a conservative surface for collision clearance.
    const surfaceTile = tileAtDirection(direction, 17);
    const surfaceKey = tileKey(surfaceTile);
    if (surfaceKey !== sampledTile) {
      const samples = sampler.sample_chunk(Number(config.seed), config.generator_version,
        surfaceTile.face, surfaceTile.level, surfaceTile.x, surfaceTile.y, 4);
      let highestMetres = config.planet.sea_level_m;
      for (let i = 0; i < samples.length; i += 4) highestMetres = Math.max(highestMetres, samples[i]!);
      sampledSurfaceKm = highestMetres / 1000;
      sampledTile = surfaceKey;
    }
    const distance = radius + sampledSurfaceKm + clearanceKm;
    camera.position.copy(direction.multiplyScalar(distance));
    camera.lookAt(0, 0, 0);
    // Near plane tracks altitude so ground zoom has depth precision without clipping.
    camera.near = Math.max(0.005, Math.min(1, clearanceKm / 20));
    camera.updateProjectionMatrix();
    try {
      chunks.update(camera.position, radius + sampledSurfaceKm, window.innerWidth, window.innerHeight, camera.fov, now);
      renderer.render(scene, camera);
    } catch (error) {
      halted = true;
      setStatus(`Rendering stopped: ${String(error)}`, true);
      return;
    }
    frameCount++;
    if (now - fpsStart >= 1000) {
      fps = frameCount * 1000 / (now - fpsStart);
      fpsStart = now;
      frameCount = 0;
    }
    if (now - lastMetrics >= 500) {
      const values = chunks.metrics();
      metrics!.dataset.chunkIds = values.selectedIds.join(',');
      const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
      const memoryText = memory ? `${(memory.usedJSHeapSize / 1048576).toFixed(1)} MiB JS heap` : 'unavailable';
      const altitude = clearanceKm;
      const frameP95 = frameTimes.p95();
      const generationP95 = values.generationP95Ms;
      metrics!.innerHTML = `
        <div><span>Ground clearance</span><b>${altitude.toFixed(altitude < 1 ? 2 : 0)} km</b></div>
        <div><span>Surface elevation</span><b>${sampledSurfaceKm.toFixed(2)} km</b></div>
        <div><span>FPS</span><b>${fps.toFixed(0)}</b></div>
        <div><span>Frame time p95</span><b>${frameP95 === null ? 'unavailable' : `${frameP95.toFixed(1)} ms`}</b></div>
        <div><span>Triangles</span><b>${renderer.info.render.triangles.toLocaleString()}</b></div>
        <div><span>Chunks</span><b>${values.visible} visible · ${values.cached} cached</b></div>
        <div><span>Pending chunks</span><b>${values.queued}</b></div>
        <div><span>Last chunk generation</span><b>${values.generationMs.toFixed(1)} ms</b></div>
        <div><span>Chunk generation p95</span><b>${generationP95 === null ? 'unavailable' : `${generationP95.toFixed(1)} ms`}</b></div>
        <div><span>Browser memory</span><b>${memoryText}</b></div>`;
      lastMetrics = now;
    }
  }
  requestAnimationFrame(animate);
  window.addEventListener('beforeunload', () => {
    chunks.dispose();
    renderer.dispose();
  });
}

start().catch(error => setStatus(String(error), true));

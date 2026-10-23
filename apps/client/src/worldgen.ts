export interface WorldConfig {
  seed: string;
  generator_version: number;
  planet: {
    radius_km: number;
    sea_level_m: number;
  };
}

export interface Sampler {
  sample_chunk(
    seed: number,
    generatorVersion: number,
    face: number,
    level: number,
    tileX: number,
    tileY: number,
    resolution: number,
  ): Int32Array;
}

interface WorldgenModule extends Sampler {
  default: (input?: string) => Promise<unknown>;
}

export async function loadWorldConfig(): Promise<WorldConfig> {
  const response = await fetch('/world-config');
  if (!response.ok) throw new Error(`World configuration request failed (${response.status}).`);
  const config: unknown = await response.json();
  if (!isWorldConfig(config)) throw new Error('Server returned an invalid world configuration.');
  return config;
}

function isWorldConfig(value: unknown): value is WorldConfig {
  if (!value || typeof value !== 'object') return false;
  const config = value as Partial<WorldConfig>;
  const planet = config.planet;
  const seed = config.seed;
  return typeof seed === 'string' && /^\d+$/.test(seed) && Number(seed) <= 0xffffffff
    && Number.isInteger(config.generator_version) && (config.generator_version ?? 0) > 0
    && !!planet && Number.isFinite(planet.radius_km) && planet.radius_km > 0
    && Number.isFinite(planet.sea_level_m);
}

export async function loadSampler(): Promise<Sampler> {
  // wasm-pack --target web writes these artifacts to public/worldgen.
  const moduleUrl = '/worldgen/worldgen.js';
  let module: WorldgenModule;
  try {
    module = await import(/* @vite-ignore */ moduleUrl) as WorldgenModule;
    await module.default('/worldgen/worldgen_bg.wasm');
  } catch (error) {
    throw new Error(`World generator WASM is unavailable. Run npm run build:worldgen. ${String(error)}`);
  }
  if (typeof module.sample_chunk !== 'function') {
    throw new Error('World generator WASM does not expose sample_chunk.');
  }
  return module;
}

# Worldgen crate

Version 1 samples terrain directly from a seed and a unit spherical direction. The proposed client/server configuration is:

```json
{"seed":"12345","generator_version":1,"planet":{"radius_km":2014.6,"sea_level_m":0}}
```

The radius follows the Stage 1 choice of 1/10 Earth's surface area; it is used by the renderer, not by the terrain noise. The canonical numeric contract is [S1-01](https://github.com/clickbytes/kubik/issues/3). Height is in metres relative to sea level zero. The server publishes the seed as a string while the browser parses it as a `u32` for the version-1 API.

## Browser API

Build with `wasm-pack build crates/worldgen --target web --out-dir pkg-web` from the repository root, after installing the `wasm32-unknown-unknown` target. The generated module exports:

```text
sample_chunk(seed, generator_version, face, level, tile_x, tile_y, resolution) -> Int32Array
```

It returns `(resolution+1)^2` vertices, row-major in local `v` then `u`, with four interleaved `i32` values per vertex: `[height_m, temperature_q, moisture_q, biome_id]`. Temperature and moisture are relative fields quantized from 0 to 1000. Biomes: 0 ocean, 1 coast, 2 desert, 3 grassland, 4 forest, 5 tundra, 6 mountain, 7 snow. Invalid face/tile/resolution/version raises a JavaScript error.

Face IDs are 0 `+X`, 1 `-X`, 2 `+Y`, 3 `-Y`, 4 `+Z`, 5 `-Z`. With local coordinates `u,v` in `[-1,1]`, cube positions are `(1,v,-u)`, `(-1,v,u)`, `(u,1,-v)`, `(u,-1,v)`, `(u,v,1)`, and `(-u,v,-1)` respectively. Normalize the cube position to obtain the spherical direction. For a quadtree tile at `level`, local grid position is `u=-1+2*(tile_x+grid_x/resolution)/2^level`, and likewise for `v`.

The twelve shared face edges are below. `L/R/B/T` mean `u=-1/u=1/v=-1/v=1`. A reversed edge uses `-t` on the neighbor when the first edge uses `t`.

| Face edge | Neighbor edge | Reversed |
|---|---|---|
| +X L | +Z R | No |
| +X R | -Z L | No |
| +X B | -Y R | Yes |
| +X T | +Y R | No |
| -X L | -Z R | No |
| -X R | +Z L | No |
| -X B | -Y L | No |
| -X T | +Y L | Yes |
| +Y B | +Z T | No |
| +Y T | -Z T | Yes |
| -Y B | -Z B | Yes |
| -Y T | +Z B | No |

## Native checks

Run `cargo test --manifest-path crates/worldgen/Cargo.toml`. The native API is `generate_chunk(...) -> Result<Vec<i32>, WorldgenError>` and `sample_direction(...) -> Result<Sample, WorldgenError>`. Fixed seeds exercise repeatability, face edges/corners, same-face neighboring chunks, LOD samples, value ranges, and error handling.

The native test includes a small version-1 golden fixture: the six face-center samples and one mountain corner for seed 12345. If an intentional terrain change alters these packed values, increment the generator version and update the fixture rather than silently changing a persisted world's base terrain.

For byte-for-byte native/WASM fixture comparison in Node, run `wasm-pack build crates/worldgen --target nodejs --out-dir pkg-node` and then `node crates/worldgen/tests/compare_wasm.cjs` from the repository root. The comparison executes the native fixture example, calls the WASM export with the same inputs, and compares every interleaved little-endian `i32` output byte. Generated packages and standalone crate build output are ignored.

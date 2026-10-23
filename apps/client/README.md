# KUBIK browser client

Stage 1 globe viewer using Vite, TypeScript, Three.js/WebGL2, and the shared Rust world generator compiled to WebAssembly.

## Run

From a clean checkout with Rust, `wasm-pack`, Node.js, and npm installed:

1. Start the Axum server on `127.0.0.1:3000` as described in `apps/server/README.md`.
2. From `apps/client`, run `npm ci`.
3. Run `npm run build:worldgen` to place generated wasm-pack artifacts in `apps/client/public/worldgen/`.
4. Run `npm run dev`, then open the Vite URL shown in the terminal.

The Vite server proxies `/world-config` to Axum. The client gets seed, generator version, radius, and sea level from that endpoint; it does not carry a second copy of the server configuration. The generated WASM files are build outputs and are not committed.

`npm run build` checks TypeScript and builds the client bundle. Build the WASM output before running or packaging the site. `npm run preview` serves the built bundle locally; configure `/world-config` on the same origin for non-Vite hosting.

## Viewer controls and limits

Drag to orbit, scroll to zoom from the globe to at least 80 metres above the locally sampled surface, and double click to reset. Camera clearance is recomputed when the viewed terrain changes. The client chooses at most 150 visible cube-sphere quadtree chunks, generates at most three per animation frame within a 7 ms budget, retains at most 220 meshes, and uses radial skirts to hide LOD cracks. The metrics panel reports ground clearance, FPS, triangle and chunk counts, pending chunks, the last generation time, and JS heap size where the browser exposes it.

The generator currently runs on the main thread. The per-frame budget bounds work, while the metrics reveal whether a Web Worker is needed on the accepted reference browser. This decision must be revisited with measurements in S1-07; it is not a claim that every browser remains smooth. Browser memory is unavailable where the nonstandard JS heap API is absent.

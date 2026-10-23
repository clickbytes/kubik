# KUBIK

KUBIK is a small browser world on a deterministic spherical planet. Stage 1 builds a runnable globe viewer and minimal server; later multiplayer and persistent simulation are described in GitHub issues and are outside this stage.

- [Project map](MAP.md)
- [Stage 1 epic](https://github.com/clickbytes/kubik/issues/2)
- [S1-00 architecture sketch](https://github.com/clickbytes/kubik/issues/11)
- [S1-01 world contract](https://github.com/clickbytes/kubik/issues/3)

## Requirements

- Rust and Cargo, including the `wasm32-unknown-unknown` target
- `wasm-pack`
- Node.js and npm
- A browser with WebGL2

Install the Rust target with `rustup target add wasm32-unknown-unknown`. Install `wasm-pack` with `cargo install wasm-pack --locked` if it is not already available.
The Stage 1 reference run uses Rust/Cargo 1.99, `wasm-pack` 0.15.0, Node.js 24, npm 11, and desktop Chrome 155 with WebGL2. The build workflow checks both Windows and Linux.

## Run Stage 1

The same commands work in PowerShell and a Linux shell from the repository root:

```text
cargo test --workspace
cargo run -p kubik-server
```

In a second terminal:

```text
cd apps/client
npm ci
npm run build:worldgen
npm run dev
```

Open the URL printed by Vite. The client reads its seed and planet parameters from the server's `/world-config` endpoint. See [the bootstrap issue](https://github.com/clickbytes/kubik/issues/4) for the configuration contract and [the acceptance issue](https://github.com/clickbytes/kubik/issues/10) for measured Stage 1 results.

With both processes running, `cd apps/client` and run `npm run smoke:browser -- 30` for the reference Chrome camera path. Captures and metrics are written to `apps/client/.artifacts/browser-smoke/`. The argument is the minimum FPS; omit it for a functional smoke check on other GPUs.

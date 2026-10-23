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

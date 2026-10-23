# KUBIK Stage 1 server

The server exposes a stable health response and the world configuration used by the browser. It does not implement multiplayer, persistence, or simulation in Stage 1.

## Run

Install a current Rust toolchain. From the repository root on Windows PowerShell or Linux:

```sh
cargo run --manifest-path apps/server/Cargo.toml
```

The server listens on `127.0.0.1:3000` by default. Set `KUBIK_BIND` to a different address when needed. Run the focused checks with:

```sh
cargo test --manifest-path apps/server/Cargo.toml
```

## Configuration

The bundled `apps/server/world-config.json` is the default restart-stable configuration. Set `KUBIK_CONFIG_PATH` to a JSON file to use an external configuration without rebuilding. The server reads it once at startup and fails to start if it is invalid.

PowerShell example:

```powershell
$env:KUBIK_CONFIG_PATH = "C:\path\to\world-config.json"
cargo run --manifest-path apps/server/Cargo.toml
```

Linux shell example:

```sh
KUBIK_CONFIG_PATH=/path/to/world-config.json cargo run --manifest-path apps/server/Cargo.toml
```

`GET /health` returns `{"status":"ok"}`. `GET /world-config` returns the configured seed, generator version, radius, and sea level. The seed is a decimal `u32` string to avoid JavaScript number precision surprises. The 2014.6 km radius follows the [S1-01 Stage 1 scale decision](https://github.com/clickbytes/kubik/issues/3).

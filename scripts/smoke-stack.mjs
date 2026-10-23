import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const serverBinary = join(root, 'target', 'debug', process.platform === 'win32' ? 'kubik-server.exe' : 'kubik-server');
const viteBinary = join(root, 'apps', 'client', 'node_modules', 'vite', 'bin', 'vite.js');
const server = spawn(serverBinary, [], {
  cwd: root,
  env: { ...process.env, KUBIK_BIND: '127.0.0.1:3000' },
  stdio: 'ignore',
});
const vite = spawn(process.execPath, [viteBinary, '--host', '127.0.0.1', '--port', '5173', '--strictPort'], {
  cwd: join(root, 'apps', 'client'),
  stdio: 'ignore',
});

async function waitFor(url) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch { /* Processes may still be starting. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

try {
  const health = await waitFor('http://127.0.0.1:3000/health');
  assert.deepEqual(await health.json(), { status: 'ok' });
  const page = await waitFor('http://127.0.0.1:5173/');
  assert.match(await page.text(), /KUBIK/);
  const config = await waitFor('http://127.0.0.1:5173/world-config');
  assert.equal((await config.json()).generator_version, 1);
  const wasm = await waitFor('http://127.0.0.1:5173/worldgen/worldgen_bg.wasm');
  assert.match(wasm.headers.get('content-type') ?? '', /wasm|octet-stream/);
  console.log('Server, Vite client, configuration proxy, and WASM asset started successfully.');
} finally {
  vite.kill();
  server.kill();
}

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const binary = join(root, 'target', 'debug', process.platform === 'win32' ? 'kubik-server.exe' : 'kubik-server');
const server = spawn(binary, [], {
  cwd: root,
  env: { ...process.env, KUBIK_BIND: '127.0.0.1:0' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let log = '';
const address = new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error(`Server startup timed out: ${log}`)), 15_000);
  server.stdout.on('data', chunk => {
    log += chunk.toString();
    const match = /KUBIK server listening on (127\.0\.0\.1:\d+)/.exec(log);
    if (match) { clearTimeout(timeout); resolve(match[1]); }
  });
  server.stderr.on('data', chunk => { log += chunk.toString(); });
  server.on('error', error => { clearTimeout(timeout); reject(error); });
  server.on('exit', code => {
    clearTimeout(timeout);
    if (!log.includes('KUBIK server listening on')) reject(new Error(`Server exited ${code}: ${log}`));
  });
});

try {
  const base = `http://${await address}`;
  const health = await fetch(`${base}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok' });
  const world = await fetch(`${base}/world-config`);
  assert.equal(world.status, 200);
  const config = await world.json();
  assert.match(config.seed, /^\d+$/);
  assert.equal(config.generator_version, 1);
  assert.ok(config.planet.radius_km > 0);
  console.log(`Server startup and HTTP smoke passed at ${base}`);
} finally {
  server.kill();
}

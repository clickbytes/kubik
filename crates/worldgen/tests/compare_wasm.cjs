const { spawnSync } = require('node:child_process');
const path = require('node:path');

const crate = path.resolve(__dirname, '..');
const native = spawnSync('cargo', ['run', '--quiet', '--manifest-path', path.join(crate, 'Cargo.toml'), '--example', 'fixture'], {
  encoding: 'utf8',
});
if (native.status !== 0) {
  process.stderr.write(native.stderr || 'Native fixture command failed.\n');
  process.exit(1);
}

const wasm = require(path.join(crate, 'pkg-node', 'worldgen.js'));
let compared = 0;
for (const line of native.stdout.trim().split(/\r?\n/)) {
  const [key, data] = line.split('|');
  const args = key.split(',').map(Number);
  const expected = data.split(',').map(Number);
  const actual = wasm.sample_chunk(...args);
  if (actual.length !== expected.length) {
    throw new Error(`${key}: ${actual.length} WASM values, ${expected.length} native values`);
  }
  const nativeBytes = Buffer.alloc(expected.length * 4);
  const wasmBytes = Buffer.alloc(actual.length * 4);
  for (let i = 0; i < actual.length; i++) {
    nativeBytes.writeInt32LE(expected[i], i * 4);
    wasmBytes.writeInt32LE(actual[i], i * 4);
  }
  if (!nativeBytes.equals(wasmBytes)) {
    const first = expected.findIndex((value, index) => value !== actual[index]);
    throw new Error(`${key}: native/WASM mismatch at field ${first}: ${expected[first]} != ${actual[first]}`);
  }
  compared += 1;
}
process.stdout.write(`Native/WASM output bytes match for ${compared} fixture chunks.\n`);

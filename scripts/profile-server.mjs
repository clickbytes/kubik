// Stage 1 HTTP-only workload. The server runs separately, so this client's
// memory is excluded from the measured server environment.
const base = (process.argv[2] ?? 'http://127.0.0.1:3300').replace(/\/$/, '');
const clients = 10;
const requestsPerClient = 100;
const timings = [];
const started = performance.now();

await Promise.all(Array.from({ length: clients }, async () => {
  for (let i = 0; i < requestsPerClient; i++) {
    const path = i % 2 ? '/health' : '/world-config';
    const before = performance.now();
    const response = await fetch(base + path);
    if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
    const data = await response.json();
    if (path === '/health' && data.status !== 'ok') throw new Error('Invalid health response');
    if (path === '/world-config' && data.generator_version !== 1) throw new Error('Invalid world config');
    timings.push(performance.now() - before);
  }
}));

timings.sort((a, b) => a - b);
const elapsed = performance.now() - started;
console.log(JSON.stringify({
  clients,
  requests: clients * requestsPerClient,
  elapsed_ms: Math.round(elapsed),
  p95_ms: Number(timings[Math.ceil(timings.length * 0.95) - 1].toFixed(2)),
}, null, 2));

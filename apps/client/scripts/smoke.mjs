import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const url = process.argv[3] ?? process.env.KUBIK_CLIENT_URL ?? 'http://127.0.0.1:5173/';
const out = join(import.meta.dirname, '..', '.artifacts', 'browser-smoke');
const minFps = Number(process.argv[2] ?? process.env.KUBIK_MIN_FPS ?? 0);
await mkdir(out, { recursive: true });

const browser = await chromium.launch({
  ...(process.env.KUBIK_CHROME_BIN
    ? { executablePath: process.env.KUBIK_CHROME_BIN }
    : { channel: 'chrome' }),
  headless: true,
  args: process.env.KUBIK_SOFTWARE_WEBGL
    ? ['--enable-unsafe-swiftshader', '--use-angle=swiftshader']
    : ['--enable-gpu', '--disable-software-rasterizer', '--disable-gpu-sandbox'],
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('response', response => {
    if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`);
  });

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.locator('#metrics div').first().waitFor({ timeout: 30_000 });
  const renderer = await page.evaluate(() => {
    const gl = document.querySelector('canvas')?.getContext('webgl2');
    const extension = gl?.getExtension('WEBGL_debug_renderer_info');
    return extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl?.getParameter(gl.RENDERER);
  });

  async function capture(name) {
    await page.waitForTimeout(3_000);
    const values = await page.evaluate(() => Object.fromEntries(
      [...document.querySelectorAll('#metrics div')].map(row => [
        row.querySelector('span')?.textContent,
        row.querySelector('b')?.textContent,
      ]),
    ));
    await page.screenshot({ path: join(out, `${name}.png`) });
    assert.match(await page.locator('#status').innerText(), /^Seed \d+ · generator v1 ·/);
    const chunkMatch = /^(\d+) visible · (\d+) cached$/.exec(values.Chunks ?? '');
    assert.ok(chunkMatch, `${name}: missing chunk counts`);
    assert.ok(Number(chunkMatch[1]) <= 150, `${name}: visible chunk limit exceeded`);
    assert.ok(Number(chunkMatch[2]) <= 220, `${name}: cache limit exceeded`);
    assert.ok(Number(values.FPS) >= minFps, `${name}: FPS below ${minFps}`);
    assert.ok(Number.parseFloat(values['Chunk generation p95']) <= 16, `${name}: chunk generation p95 exceeded 16 ms`);
    if (minFps > 0) assert.ok(Number.parseFloat(values['Frame time p95']) <= 33.3, `${name}: frame-time p95 exceeded 33.3 ms`);
    const selectedIds = await page.locator('#metrics').getAttribute('data-chunk-ids');
    assert.ok(selectedIds, `${name}: selected chunk IDs unavailable`);
    values.selectedIdsCount = selectedIds.split(',').length;
    values.selectedIdsSha256 = createHash('sha256').update(selectedIds).digest('hex');
    return values;
  }

  const orbit = await capture('orbit');
  await page.mouse.move(640, 400);
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, -250);
    await page.waitForTimeout(450);
  }
  const middle = await capture('middle');
  await page.mouse.move(640, 400);
  await page.mouse.down();
  await page.mouse.move(890, 530, { steps: 20 });
  await page.mouse.up();
  const faceTransition = await capture('face-transition');
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, -250);
    await page.waitForTimeout(450);
  }
  const ground = await capture('ground');
  assert.ok(Number.parseFloat(ground['Ground clearance']) >= 0.08, 'Camera entered terrain');
  await page.mouse.move(640, 400);
  await page.mouse.down();
  await page.mouse.move(890, 530, { steps: 20 });
  await page.mouse.up();
  const groundDragged = await capture('ground-dragged');
  assert.ok(Number.parseFloat(groundDragged['Ground clearance']) >= 0.08, 'Drag entered terrain');
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#metrics div').first().waitFor({ timeout: 30_000 });
  const orbitReloaded = await capture('orbit-reloaded');
  assert.equal(orbitReloaded['Surface elevation'], orbit['Surface elevation'], 'Orbit terrain changed after reload');
  assert.equal(orbitReloaded.Chunks, orbit.Chunks, 'Orbit chunk selection changed after reload');
  assert.equal(orbitReloaded.selectedIdsSha256, orbit.selectedIdsSha256, 'Orbit selected chunk IDs changed after reload');
  assert.deepEqual(errors, [], 'Browser console or HTTP errors');

  const report = {
    url,
    browser: await browser.version(),
    renderer,
    platform: process.platform,
    viewport: '1280x800',
    orbit, middle, faceTransition, ground, groundDragged, orbitReloaded, errors,
  };
  await writeFile(join(out, 'metrics.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}

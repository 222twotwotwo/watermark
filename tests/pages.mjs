import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const url = process.env.PAGES_TEST_URL || 'http://127.0.0.1:4174/watermark/';
const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
try {
  const page = await browser.newPage();
  const failures = [];
  const assets = [];
  page.on('pageerror', (error) => failures.push(error.message));
  page.on('requestfailed', (request) => failures.push(`${request.url()}: ${request.failure()?.errorText}`));
  page.on('response', (response) => {
    if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
    assets.push(response.url());
  });
  const response = await page.goto(url);
  assert.equal(response.status(), 200);
  await page.waitForFunction(() => document.querySelector('#export')?.disabled === false, null, { timeout: 60000 });
  assert.equal(await page.locator('#dimensions').textContent(), '1800 × 1560 px');
  for (const path of ['/watermark/demo.jpg', '/watermark/fonts/NotoSansSC.woff2', '/watermark/assets/']) {
    assert.ok(assets.some((asset) => asset.includes(path)), `Missing deployed asset ${path}`);
  }
  await page.locator('#current-time').click();
  assert.ok(await page.locator('#card-time').inputValue());
  const downloadReady = page.waitForEvent('download');
  await page.locator('#export').click();
  const download = await downloadReady;
  assert.equal(await download.failure(), null);
  assert.deepEqual(failures, []);
  console.log(`Pages verified: ${url} — built scripts, styles, font, green demo and export load successfully.`);
} finally {
  await browser.close();
}

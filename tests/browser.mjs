import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';

await mkdir('test-results', { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, deviceScaleFactor: 1, timezoneId: 'Asia/Shanghai' });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

async function fixture(width, height, transparent = false) {
  const data = await page.evaluate(({ width, height, transparent }) => {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!transparent) {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#75818c'); gradient.addColorStop(1, '#303e50');
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
    }
    return canvas.toDataURL();
  }, { width, height, transparent });
  return Buffer.from(data.split(',')[1], 'base64');
}

async function upload(width, height, name, transparent = false) {
  await page.locator('#file').setInputFiles({ name, mimeType: 'image/png', buffer: await fixture(width, height, transparent) });
  await page.waitForFunction((text) => document.querySelector('#dimensions').textContent === text && !document.querySelector('#export').disabled, `${width} × ${height} px`);
}

async function downloadClick(selector, filename) {
  const pending = page.waitForEvent('download');
  await page.locator(selector).click();
  const download = await pending;
  assert.equal(await download.failure(), null);
  await download.saveAs(`test-results/${filename}`);
  return readFile(`test-results/${filename}`);
}

try {
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:4173');
  await page.locator('#export').waitFor({ state: 'visible' });
  await page.waitForFunction(() => !document.querySelector('#export').disabled, { timeout: 60000 });
  assert.equal(await page.evaluate(() => document.fonts.check('500 82px "Watermark Sans"')), true);
  await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });

  // Local midnight must use the device date, even when the UTC date is still yesterday.
  await page.clock.setFixedTime(new Date('2026-10-12T16:05:00Z'));
  await page.locator('#card-title').fill('保留标题');
  await page.locator('#current-time').click();
  assert.equal(await page.locator('#card-time').inputValue(), '00:05');
  assert.equal(await page.locator('#card-date').inputValue(), '2026-10-13');
  assert.equal(await page.locator('#card-weekday').inputValue(), '星期二');
  assert.equal(await page.locator('#card-title').inputValue(), '保留标题');
  await page.clock.setFixedTime(new Date('2026-10-13T01:07:00Z'));
  await page.locator('#current-time').click();
  assert.equal(await page.locator('#card-time').inputValue(), '09:07');
  await page.clock.setFixedTime(new Date());
  await page.locator('[data-reset="card"]').click();

  // Real UI changes update the canvas without replacing the uploaded image.
  const initial = await page.locator('#preview').evaluate((el) => el.toDataURL());
  await page.locator('#card-title').fill('现场工作记录');
  await page.locator('#card-location').fill('这是一段很长的自定义地点内容，用于检查中文换行和文字适配，不应超出水印卡片边界。');
  await page.locator('#card-date').fill('2024-02-29');
  assert.equal(await page.locator('#card-weekday').inputValue(), '星期四');
  await page.locator('#card-time').fill('23:59');
  await page.waitForFunction((old) => document.querySelector('#preview').toDataURL() !== old, initial);
  const edited = await page.locator('#preview').evaluate((el) => el.toDataURL());
  await page.locator('#compare').click();
  assert.equal(await page.locator('#compare').getAttribute('aria-pressed'), 'true');
  await page.waitForFunction((old) => document.querySelector('#preview').toDataURL() !== old, edited);
  await page.locator('#compare').click();

  await page.locator('#tab-brand').click();
  await page.locator('#brand-text').fill('我的现场记录');
  await page.locator('#brand-enabled').uncheck();
  await page.locator('#brand-enabled').check();
  const brandPng = await downloadClick('[data-layer="brand"]', 'brand.png');
  assert.equal(brandPng.readUInt32BE(16), 746);
  assert.equal(brandPng.readUInt32BE(20), 166);
  await page.locator('[data-reset="brand"]').click();
  assert.equal(await page.locator('#brand-text').inputValue(), '水印相机');
  await downloadClick('[data-layer="brand"]', 'brand-reference.png');
  await page.locator('#tab-card').click();
  await page.locator('[data-reset="card"]').click();
  assert.equal(await page.locator('#card-title').inputValue(), '会议记录');
  const cardPng = await downloadClick('[data-layer="card"]', 'card.png');
  assert.equal(cardPng.readUInt32BE(16), 2024);
  assert.equal(cardPng.readUInt32BE(20), 1452);

  // Rendering on transparent backgrounds allows precise pixel-bound checks.
  const pixelChecks = await page.evaluate(async () => {
    const { drawCard, drawBrand, defaults } = await import('/src/watermark.js');
    const canvas = document.createElement('canvas'); canvas.width = 1012; canvas.height = 726;
    const ctx = canvas.getContext('2d'); drawCard(ctx, defaults().card);
    const cornerAlpha = ctx.getImageData(0, 0, 1, 1).data[3];
    const centerAlpha = ctx.getImageData(500, 230, 1, 1).data[3];
    ctx.clearRect(0, 0, 1012, 726); drawBrand(ctx, defaults().brand);
    const lensAlpha = ctx.getImageData(39, 29, 1, 1).data[3];
    const lensBottomAlpha = ctx.getImageData(39, 46, 1, 1).data[3];
    return { cornerAlpha, centerAlpha, lensAlpha, lensBottomAlpha };
  });
  assert.equal(pixelChecks.cornerAlpha, 0);
  assert.ok(pixelChecks.centerAlpha > 220 && pixelChecks.centerAlpha < 240);
  assert.equal(pixelChecks.lensAlpha, 0);
  assert.equal(pixelChecks.lensBottomAlpha, 0);

  // Move a card on a transparent portrait, then inspect the actual exported pixels.
  await upload(1800, 2400, 'position.png', true);
  await page.locator('#tab-brand').click();
  await page.locator('#brand-enabled').uncheck();
  await page.locator('#tab-card').click();
  const handle = page.locator('#card-handle');
  const flushRender = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1, `${message}: ${actual} vs ${expected}`);
  async function dragTo(x, y) {
    const box = await handle.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(x, y, { steps: 5 });
    await page.mouse.up();
    await flushRender();
  }
  await flushRender();
  const beforeMove = await handle.boundingBox();
  await page.mouse.move(beforeMove.x + beforeMove.width / 3, beforeMove.y + beforeMove.height / 3);
  await page.mouse.down();
  close((await handle.boundingBox()).x, beforeMove.x, 'grabbing the card must not jump');
  await page.mouse.move(beforeMove.x + beforeMove.width / 3 + 80, beforeMove.y + beforeMove.height / 3 - 160, { steps: 5 });
  await page.mouse.up();
  await flushRender();
  const moved = await handle.boundingBox();
  close(moved.x, beforeMove.x + 80, 'horizontal drag');
  close(moved.y, beforeMove.y - 160, 'vertical drag');
  const photoBox = await page.locator('#preview').boundingBox();
  const movedPng = await downloadClick('#export', 'moved-card.png');
  const bounds = await page.evaluate(async (base64) => {
    const img = new Image(); img.src = `data:image/png;base64,${base64}`; await img.decode();
    const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
    const pixels = ctx.getImageData(0, 0, img.width, img.height).data;
    let left = img.width, top = img.height, right = -1, bottom = -1;
    for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
      if (pixels[(y * img.width + x) * 4 + 3] > 20) {
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
    return { left, top, width: right - left + 1, height: bottom - top + 1 };
  }, movedPng.toString('base64'));
  close(bounds.left, (moved.x - photoBox.x) / photoBox.width * 1800, 'export x matches preview');
  close(bounds.top, (moved.y - photoBox.y) / photoBox.height * 2400, 'export y matches preview');
  // Fractional placement can cover one additional edge pixel through antialiasing.
  assert.ok(Math.abs(bounds.width - 1012) <= 1, 'export has no drag outline');
  assert.ok(Math.abs(bounds.height - 726) <= 1, 'export has no drag outline');

  await page.locator('#compare').click();
  await handle.waitFor({ state: 'hidden' });
  await page.locator('#compare').click();
  await handle.waitFor({ state: 'visible' });
  close((await handle.boundingBox()).x, moved.x, 'comparison keeps the position');
  await page.locator('#card-enabled').uncheck();
  await handle.waitFor({ state: 'hidden' });
  await page.locator('#card-enabled').check();
  await handle.waitFor({ state: 'visible' });
  await dragTo(photoBox.x - 100, photoBox.y - 100);
  let edge = await handle.boundingBox();
  close(edge.x, photoBox.x, 'left boundary'); close(edge.y, photoBox.y, 'top boundary');
  await dragTo(photoBox.x + photoBox.width + 100, photoBox.y + photoBox.height + 100);
  edge = await handle.boundingBox();
  close(edge.x + edge.width, photoBox.x + photoBox.width, 'right boundary');
  close(edge.y + edge.height, photoBox.y + photoBox.height, 'bottom boundary');
  await handle.focus();
  await page.keyboard.press('Shift+ArrowUp');
  await flushRender();
  close((await handle.boundingBox()).y, edge.y - 10, 'keyboard fine adjustment');
  await page.keyboard.press('Shift+ArrowDown');
  await page.locator('#card-scale').fill('150');
  await flushRender();
  edge = await handle.boundingBox();
  close(edge.x + edge.width, photoBox.x + photoBox.width, 'resizing keeps right boundary');
  close(edge.y + edge.height, photoBox.y + photoBox.height, 'resizing keeps bottom boundary');
  await upload(1000, 1000, 'replacement.png');
  await flushRender();
  const replacement = await page.locator('#preview').boundingBox();
  edge = await handle.boundingBox();
  close(edge.x + edge.width, replacement.x + replacement.width, 'replacement preserves relative x');
  close(edge.y + edge.height, replacement.y + replacement.height, 'replacement preserves relative y');
  await page.locator('#card-title').fill('保留自定义标题');
  await page.locator('#reset-position').click();
  await flushRender();
  assert.equal(await page.locator('#card-title').inputValue(), '保留自定义标题');
  close((await handle.boundingBox()).x - replacement.x, replacement.width * 55 / 1800, 'position-only reset');
  await page.locator('[data-reset="card"]').click();
  await page.locator('#tab-brand').click();
  await page.locator('#brand-enabled').check();
  await page.locator('#tab-card').click();

  for (const [width, height, name] of [[1800, 2400, 'portrait'], [2400, 1350, 'landscape'], [1000, 1000, 'square']]) {
    await upload(width, height, `${name}.png`);
    const bytes = await downloadClick('#export', `${name}-export.png`);
    assert.equal(bytes.readUInt32BE(16), width);
    assert.equal(bytes.readUInt32BE(20), height);
  }

  // JPEG exports of transparent input receive a white background.
  await upload(400, 600, 'transparent.png', true);
  await page.locator('#format').selectOption('jpeg');
  const jpeg = await downloadClick('#export', 'transparent-export.jpg');
  const jpegInfo = await page.evaluate(async (base64) => {
    const image = new Image(); image.src = `data:image/jpeg;base64,${base64}`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
    return { width: image.width, height: image.height, pixel: [...ctx.getImageData(0, 0, 1, 1).data] };
  }, jpeg.toString('base64'));
  assert.deepEqual(jpegInfo, { width: 400, height: 600, pixel: [255, 255, 255, 255] });
  await page.locator('#format').selectOption('png');

  // A bad upload preserves the previously loaded image.
  await page.locator('#file').setInputFiles({ name: 'broken.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('broken image') });
  await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('无法读取'));
  assert.equal(await page.locator('#dimensions').textContent(), '400 × 600 px');

  await page.locator('#demo').click();
  await page.waitForFunction(() => document.querySelector('#dimensions').textContent === '1800 × 1560 px' && !document.querySelector('#export').disabled);
  await page.locator('#toast').waitFor({ state: 'hidden' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const canvasBox = await page.locator('#preview').boundingBox();
  assert.ok(canvasBox.x >= 0 && canvasBox.x + canvasBox.width <= 390);
  assert.ok(Math.abs(canvasBox.width / canvasBox.height - 1800 / 1560) < 0.01, 'preview must not distort the photo');
  await page.locator('#tab-brand').click();
  assert.equal(await page.locator('#panel-brand').isVisible(), true);
  assert.equal(await page.locator('#panel-card').isVisible(), false);

  // Send real touch input so browser scrolling and pointer cancellation are exercised.
  const touchContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const touchPage = await touchContext.newPage();
  touchPage.on('pageerror', (error) => errors.push(error.message));
  await touchPage.goto(process.env.TEST_URL || 'http://127.0.0.1:4173');
  await touchPage.locator('#card-handle').waitFor({ state: 'visible' });
  const touchBox = await touchPage.locator('#card-handle').boundingBox();
  const touch = await touchContext.newCDPSession(touchPage);
  const start = { x: touchBox.x + touchBox.width / 2, y: touchBox.y + touchBox.height / 2 };
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + 30, y: start.y - 50 }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await touchPage.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const afterTouch = await touchPage.locator('#card-handle').boundingBox();
  close(afterTouch.x, touchBox.x + 30, 'touch horizontal movement');
  close(afterTouch.y, touchBox.y - 50, 'touch vertical movement');
  assert.equal(await touchPage.evaluate(() => scrollY), 0, 'dragging must not scroll the page');
  assert.equal(await touchPage.locator('#card-handle').evaluate((el) => el.classList.contains('moving')), false);
  assert.notEqual(await touchPage.locator('#preview').evaluate((el) => getComputedStyle(el).touchAction), 'none', 'touch scrolling outside the card remains available');
  await touchContext.close();
  assert.deepEqual(errors, []);
  console.log('Browser checks passed: mouse/touch card dragging, boundaries, keyboard movement, position reset, resizing, replacement and export position; existing editing, formats and mobile checks.');
} finally {
  await browser.close();
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, layout, weekdayFor, wrapText } from '../src/watermark.js';

test('the reference photo reproduces the measured watermark bounds', () => {
  const result = layout(1800, 2400, defaults());
  assert.deepEqual(result.card, { x: 55, y: 1605, width: 1012, height: 726, scale: 1 });
  assert.deepEqual(result.brand, { x: 1404, y: 2296, width: 373, height: 83, scale: 1 });
});

test('watermarks stay within portrait, landscape, square and extreme aspect ratios', () => {
  for (const [width, height] of [[1800, 2400], [2400, 1800], [1000, 1000], [320, 2400], [2400, 320], [80, 60], [7680, 4320]]) {
    for (const cardScale of [50, 100, 150]) {
      for (const brandScale of [50, 100, 150]) {
        const options = defaults();
        options.card.scale = cardScale;
        options.brand.scale = brandScale;
        const positions = layout(width, height, options);
        for (const box of Object.values(positions)) {
          assert.ok(box.scale > 0);
          assert.ok(box.x >= 0 && box.y >= 0);
          assert.ok(box.x + box.width <= width + 0.0001);
          assert.ok(box.y + box.height <= height + 0.0001);
        }
        assert.ok(positions.card.x + positions.card.width < positions.brand.x, 'independent marks must not overlap');
      }
    }
  }
});

test('proportions remain identical when image resolution changes', () => {
  const base = layout(1800, 2400, defaults());
  const scaled = layout(900, 1200, defaults());
  for (const key of ['card', 'brand']) {
    for (const property of ['x', 'y', 'width', 'height']) assert.equal(base[key][property] / 2, scaled[key][property]);
  }
});

test('date changes compute weekday and reject invalid calendar dates', () => {
  assert.equal(weekdayFor('2026-10-12'), '星期一');
  assert.equal(weekdayFor('2024-02-29'), '星期四');
  assert.equal(weekdayFor('2026-10-18'), '星期日');
  assert.equal(weekdayFor('2026-02-29'), null);
  assert.equal(weekdayFor('2026-13-01'), null);
  assert.equal(weekdayFor(''), null);
});

test('custom card placement scales with export resolution and leaves the brand unchanged', () => {
  const options = defaults();
  options.card.position = { x: 0.4, y: 0.25 };
  const full = layout(1800, 2400, options);
  const preview = layout(900, 1200, options);
  assert.equal(full.card.x, (1800 - 1012) * 0.4);
  assert.equal(full.card.y, (2400 - 726) * 0.25);
  assert.equal(preview.card.x * 2, full.card.x);
  assert.equal(preview.card.y * 2, full.card.y);
  assert.deepEqual(full.brand, layout(1800, 2400, defaults()).brand);
});

test('manual positions stay inside the photo after changing its aspect ratio or card size', () => {
  const options = defaults();
  options.card.position = { x: -2, y: 3 };
  for (const [width, height] of [[1800, 2400], [2400, 1800], [1000, 1000]]) {
    for (const scale of [50, 150]) {
      options.card.scale = scale;
      const { card } = layout(width, height, options);
      assert.equal(card.x, 0);
      assert.equal(card.y + card.height, height);
      assert.ok(card.y >= 0 && card.width <= width);
    }
  }
});

test('wrapping preserves editable Unicode text and explicit line breaks', () => {
  const context = { measureText: (s) => ({ width: Array.from(s).length * 10 }) };
  const text = '广东石油化工学院📷(官渡校区)';
  const lines = wrapText(context, text, 60);
  assert.equal(lines.join(''), text);
  assert.ok(lines.every((line) => Array.from(line).length <= 6));
  assert.deepEqual(wrapText(context, '第一行\n第二行', 60), ['第一行', '第二行']);
});

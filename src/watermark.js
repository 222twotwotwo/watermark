// All coordinates below are measured against the supplied 1800 × 2400 photo.
export const REFERENCE = Object.freeze({ width: 1800, height: 2400, shortSide: 1800 });
export const CARD = Object.freeze({ width: 1012, height: 726, left: 55, bottom: 69 });
export const BRAND = Object.freeze({ width: 373, height: 83, right: 23, bottom: 21 });
export const FONT = '"Watermark Sans", "Microsoft YaHei", sans-serif';

export function defaults() {
  return {
    card: {
      enabled: true, title: '会议记录', time: '10:03', weekday: '星期一',
      date: '2026.10.12', label: '地点', location: '广东石油化工学院(官渡校区)',
      scale: 100, opacity: 90, position: null,
    },
    brand: { enabled: true, text: '水印相机', scale: 100, opacity: 85 },
  };
}

export function weekdayFor(date) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const value = new Date(0);
  value.setUTCFullYear(y, m - 1, d);
  if (value.getUTCFullYear() !== y || value.getUTCMonth() !== m - 1 || value.getUTCDate() !== d) return null;
  return `星期${'日一二三四五六'[value.getUTCDay()]}`;
}

export function layout(width, height, options) {
  const unit = Math.min(width, height) / REFERENCE.shortSide;
  const cs = Math.min(unit * options.card.scale / 100, (width - CARD.left * unit * 2) / CARD.width, (height - CARD.bottom * unit * 2) / CARD.height);
  // Reserve room for the card's default position without changing the brand when dragged.
  let bs = Math.min(unit * options.brand.scale / 100, (width - BRAND.right * unit * 2) / BRAND.width);
  if (options.card.enabled && options.brand.enabled) {
    bs = Math.min(bs, Math.max(0, width - CARD.left * unit - CARD.width * cs - 35 * unit - BRAND.right * unit) / BRAND.width);
  }
  const cardWidth = CARD.width * cs;
  const cardHeight = CARD.height * cs;
  // Store placement within the available travel so preview, export and replacement images agree.
  const position = options.card.position;
  return {
    card: {
      x: position ? Math.max(0, Math.min(1, position.x)) * (width - cardWidth) : CARD.left * unit,
      y: position ? Math.max(0, Math.min(1, position.y)) * (height - cardHeight) : height - CARD.bottom * unit - cardHeight,
      width: cardWidth, height: cardHeight, scale: cs,
    },
    brand: { x: width - BRAND.right * unit - BRAND.width * bs, y: height - BRAND.bottom * unit - BRAND.height * bs, width: BRAND.width * bs, height: BRAND.height * bs, scale: bs },
  };
}

function polygon(ctx, points) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  ctx.fill();
}

// Vector segments preserve the distinctive clock and stay sharp at any size.
const SEGMENTS = {
  a: [[14, 0], [68, 0], [78, 9], [68, 18], [14, 18], [4, 9]],
  b: [[73, 14], [82, 26], [82, 75], [64, 64], [64, 24]],
  c: [[64, 96], [82, 85], [82, 135], [73, 146], [64, 136]],
  d: [[14, 142], [68, 142], [78, 151], [68, 160], [14, 160], [4, 151]],
  e: [[0, 85], [18, 96], [18, 136], [9, 146], [0, 135]],
  f: [[0, 26], [9, 14], [18, 24], [18, 64], [0, 75]],
  g: [[14, 71], [68, 71], [82, 80], [68, 89], [14, 89], [0, 80]],
};
const DIGITS = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg'];

export function drawClock(ctx, time) {
  const chars = /^\d{2}:\d{2}$/.test(time) ? time : '00:00';
  ctx.save();
  ctx.translate(66, 271);
  const positions = [0, 100, 206, 254, 354];
  for (const [index, char] of Array.from(chars).entries()) {
    const cursor = positions[index];
    if (char === ':') {
      ctx.fillRect(cursor, 57, 18, 32);
      ctx.fillRect(cursor, 127, 18, 33);
    } else {
      ctx.save();
      ctx.translate(cursor, 0);
      if (char === '1') {
        polygon(ctx, [[33, 17], [51, 0], [51, 77], [33, 65]]);
        polygon(ctx, [[33, 95], [51, 83], [51, 160], [33, 143]]);
      } else {
        for (const segment of DIGITS[Number(char)]) {
          if (char === '3' && segment === 'a') polygon(ctx, [[7, 0], [68, 0], [78, 9], [68, 18], [21, 18]]);
          else if (char === '3' && segment === 'd') polygon(ctx, [[21, 142], [68, 142], [78, 151], [68, 160], [7, 160]]);
          else polygon(ctx, SEGMENTS[segment]);
        }
      }
      ctx.restore();
    }
  }
  ctx.restore();
}

function fitText(ctx, text, x, y, maxWidth, fontSize, weight = 400, align = 'left') {
  ctx.font = `${weight} ${fontSize}px ${FONT}`;
  const measured = ctx.measureText(text).width;
  if (measured > maxWidth) ctx.font = `${weight} ${fontSize * maxWidth / measured}px ${FONT}`;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
}

export function wrapText(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const char of text) {
    if (char === '\n') { lines.push(line); line = ''; continue; }
    if (line && ctx.measureText(line + char).width > maxWidth) { lines.push(line); line = char; }
    else line += char;
  }
  lines.push(line);
  return lines;
}

function drawLocation(ctx, text) {
  let size = 52;
  let lines;
  do {
    ctx.font = `400 ${size}px ${FONT}`;
    lines = wrapText(ctx, text, 530);
    if (lines.length * size * 1.3 <= 142) break;
    size -= 1;
  } while (size > 1);
  // Preserve all user-entered text, including explicit line breaks.
  const lineHeight = Math.min(size * 1.3, 142 / lines.length);
  ctx.textAlign = 'left';
  lines.forEach((line, i) => ctx.fillText(line, 372, 547 + size * 0.85 + i * lineHeight, 585));
}

export function drawCard(ctx, options) {
  ctx.save();
  ctx.fillStyle = `rgba(255, 255, 255, ${options.opacity / 100})`;
  ctx.beginPath();
  ctx.roundRect(0, 0, CARD.width, CARD.height, 28);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  for (const offset of [0, 65]) {
    ctx.save();
    ctx.translate(27 + offset, 29);
    ctx.scale(0.8, 0.82);
    ctx.beginPath();
    ctx.moveTo(47, 0);
    ctx.bezierCurveTo(11, 20, 0, 52, 0, 88);
    ctx.bezierCurveTo(0, 115, 13, 130, 30, 128);
    ctx.bezierCurveTo(58, 125, 62, 81, 38, 69);
    ctx.bezierCurveTo(33, 66, 26, 66, 23, 68);
    ctx.bezierCurveTo(22, 52, 32, 34, 47, 24);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = '#213451';
  ctx.textBaseline = 'alphabetic';
  fitText(ctx, options.title, 495, 145, 684, 82, 500, 'center');
  ctx.strokeStyle = '#777e8b';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(69, 207); ctx.lineTo(943, 207);
  ctx.moveTo(54, 491); ctx.lineTo(928, 491);
  ctx.stroke();

  drawClock(ctx, options.time);
  fitText(ctx, options.weekday, 637, 340, 319, 74, 500);
  fitText(ctx, options.date, 637, 429, 320, 56, 500);
  const label = Array.from(options.label);
  if (label.length === 2) {
    fitText(ctx, label[0], 69, 591, 72, 52);
    fitText(ctx, label[1], 235, 591, 72, 52);
  } else fitText(ctx, options.label, 69, 591, 240, 52);
  drawLocation(ctx, options.location);
  ctx.restore();
}

export function drawBrand(ctx, options) {
  ctx.save();
  ctx.globalAlpha = options.opacity / 100;
  ctx.fillStyle = '#fff';
  // The camera is a compound path: transparent lens, viewfinder, and picture window.
  ctx.beginPath();
  ctx.roundRect(0, 0, 79, 79, 17);
  ctx.moveTo(59, 29); ctx.arc(39, 29, 20, 0, Math.PI * 2);
  ctx.moveTo(71, 13); ctx.arc(65, 13, 5, 0, Math.PI * 2);
  ctx.moveTo(7, 43);
  ctx.lineTo(20, 43);
  ctx.bezierCurveTo(29, 56, 49, 56, 58, 43);
  ctx.lineTo(72, 43); ctx.lineTo(72, 72); ctx.lineTo(7, 72); ctx.closePath();
  ctx.fill('evenodd');
  ctx.fillRect(12, 54, 11, 4);
  ctx.fillRect(12, 63, 28, 4);
  fitText(ctx, options.text, 102, 64, 271, 67, 400);
  ctx.restore();
}

export function render(ctx, image, width, height, options, showOriginal = false) {
  ctx.clearRect(0, 0, width, height);
  if (image) ctx.drawImage(image, 0, 0, width, height);
  if (showOriginal) return;
  const positions = layout(width, height, options);
  for (const [key, draw] of [['card', drawCard], ['brand', drawBrand]]) {
    if (!options[key].enabled) continue;
    const pos = positions[key];
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(pos.scale, pos.scale);
    draw(ctx, options[key]);
    ctx.restore();
  }
}

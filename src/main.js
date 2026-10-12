import './style.css';
import { defaults, layout, render, drawCard, drawBrand, CARD, BRAND, FONT, weekdayFor } from './watermark.js';

const icons = {
  camera: '<path d="M14.5 4h-5L7.8 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3.8z"/><circle cx="12" cy="13.5" r="4"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  download: '<path d="M12 3v13m-5-5 5 5 5-5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',
  card: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 8h10M7 12h4m-4 4h10"/>',
  compare: '<path d="M12 3v18M8 5H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h4m8-14h4a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-4"/>',
  reset: '<path d="M3 10a9 9 0 1 1 1.7 7M3 4v6h6"/>',
  shield: '<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6z"/><path d="m8.5 11.5 2.5 2.5 4.5-5"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;

document.querySelector('#app').innerHTML = `
  <header class="site-header">
    <a class="wordmark" href="./" aria-label="水印工坊首页"><span class="brand-icon">${icon('camera')}</span><span>水印工坊<span class="wordmark-en">WATERMARK STUDIO</span></span></a>
    <span class="header-description">把记录，留在照片里。</span>
    <span class="local-badge">${icon('shield')}<span>图片仅在本地处理</span></span>
  </header>
  <main>
    <div class="page-heading">
      <div><div class="breadcrumb">工作台 ${icon('chevron')} 图片水印</div><h1>每一刻，都有记录<span class="heading-dot">。</span></h1></div>
      <div class="export-tools"><label class="sr-only" for="format">导出格式</label><select id="format"><option value="png">PNG · 无损</option><option value="jpeg">JPG · 高清</option></select><button id="export" class="button primary" disabled>${icon('download')}<span>导出图片</span></button></div>
    </div>
    <div class="editor-layout">
      <aside class="editor-panel" aria-label="水印编辑">
        <section class="upload-section">
          <div class="section-heading"><h2>选择图片</h2><span class="step-caption">JPG / PNG / WebP / AVIF</span></div>
          <button class="upload-button" id="upload">${icon('upload')}<span>上传图片</span><span class="upload-plus">＋</span></button>
          <input id="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden />
          <div class="current-file">${icon('image')}<span id="file-name">正在载入示例…</span><button id="demo" title="恢复示例图片">使用示例</button></div>
        </section>
        <div class="template-heading"><h2>编辑水印</h2><span>两处水印，独立设置</span></div>
        <div class="tabs" role="tablist" aria-label="选择水印">
          <button id="tab-card" class="tab active" role="tab" aria-selected="true" aria-controls="panel-card" data-tab="card">${icon('card')}信息卡<span class="tab-dot" id="dot-card"></span></button>
          <button id="tab-brand" class="tab" role="tab" aria-selected="false" aria-controls="panel-brand" data-tab="brand" tabindex="-1">${icon('camera')}相机标识<span class="tab-dot" id="dot-brand"></span></button>
        </div>
        <section id="panel-card" class="control-panel" role="tabpanel" aria-labelledby="tab-card">
          <div class="panel-heading"><div><h3>信息卡</h3><p>可直接拖动预览中的卡片</p></div><label class="switch"><input type="checkbox" id="card-enabled" checked aria-label="显示信息卡" /><span></span></label></div>
          <div class="field"><label for="card-title">标题</label><input id="card-title" type="text" maxlength="40" value="会议记录" /></div>
          <div class="time-action"><button id="current-time" class="text-button" type="button">${icon('reset')}填写当前时间</button></div>
          <div class="field-row time-row"><div class="field"><label for="card-time">时间</label><input id="card-time" type="time" value="10:03" required /></div><div class="field"><label for="card-date">日期</label><input id="card-date" type="date" value="2026-10-12" min="0001-01-01" max="9999-12-31" required /></div></div>
          <div class="field-row"><div class="field"><label for="card-weekday">星期<span>随日期更新</span></label><input id="card-weekday" type="text" maxlength="20" value="星期一" /></div><div class="field"><label for="card-label">地点标签</label><input id="card-label" type="text" maxlength="12" value="地点" /></div></div>
          <div class="field"><label for="card-location">地点内容</label><textarea id="card-location" rows="2" maxlength="120">广东石油化工学院(官渡校区)</textarea><span class="field-hint">长文字自动换行与适配</span></div>
          <div class="adjustments"><div class="section-heading"><h3>样式微调</h3><button class="text-button" data-reset="card">${icon('reset')}恢复默认</button></div>
            <div class="range-field"><label for="card-scale">水印大小</label><output for="card-scale" id="card-scale-value">100%</output><input id="card-scale" type="range" min="50" max="150" value="100" /></div>
            <div class="range-field"><label for="card-opacity">底板不透明度</label><output for="card-opacity" id="card-opacity-value">90%</output><input id="card-opacity" type="range" min="0" max="100" value="90" /></div>
            <div class="position-control"><span>在预览中拖动调整位置</span><button id="reset-position" class="text-button">${icon('reset')}位置复位</button></div>
          </div>
          <button class="layer-export" data-layer="card">${icon('download')}单独导出信息卡 PNG</button>
        </section>
        <section id="panel-brand" class="control-panel" role="tabpanel" aria-labelledby="tab-brand" hidden>
          <div class="panel-heading"><div><h3>右下角相机标识</h3><p>白色图标与自定义署名</p></div><label class="switch"><input type="checkbox" id="brand-enabled" checked aria-label="显示相机标识" /><span></span></label></div>
          <div class="brand-sample" aria-hidden="true"><canvas id="brand-sample" width="746" height="166"></canvas></div>
          <div class="field"><label for="brand-text">标识文字</label><input id="brand-text" type="text" maxlength="32" value="水印相机" /><span class="field-hint">图标保持不变，文字随长度自动适配</span></div>
          <div class="adjustments"><div class="section-heading"><h3>样式微调</h3><button class="text-button" data-reset="brand">${icon('reset')}恢复默认</button></div>
            <div class="range-field"><label for="brand-scale">水印大小</label><output for="brand-scale" id="brand-scale-value">100%</output><input id="brand-scale" type="range" min="50" max="150" value="100" /></div>
            <div class="range-field"><label for="brand-opacity">不透明度</label><output for="brand-opacity" id="brand-opacity-value">85%</output><input id="brand-opacity" type="range" min="0" max="100" value="85" /></div>
          </div>
          <button class="layer-export" data-layer="brand">${icon('download')}单独导出相机标识 PNG</button>
          <div class="brand-note">${icon('image')}<p>导出的 PNG 保留透明背景，可直接叠加到其他图片上。</p></div>
        </section>
      </aside>
      <section class="preview-panel" aria-label="图片预览">
        <div class="preview-toolbar"><div class="preview-title"><span class="live-dot"></span><h2 id="preview-title">水印预览</h2><span class="preview-tag">实时更新</span></div><button id="compare" class="compare-button" aria-pressed="false">${icon('compare')}<span>查看原图</span></button></div>
        <div id="stage" class="stage" tabindex="0" aria-label="图片预览区域，可拖入或粘贴图片">
          <div class="canvas-wrap"><canvas id="preview" width="1800" height="1560" aria-label="添加水印后的图片预览"></canvas><button id="card-handle" class="card-handle" aria-label="移动信息卡：拖动或使用方向键，按住 Shift 加速" title="拖动调整位置；方向键微调，Shift 加速" hidden></button><div id="original-badge" class="original-badge" hidden>原图 · 未添加水印</div></div>
          <div id="loading" class="loading">正在准备画布…</div>
          <div class="drop-overlay">${icon('upload')}<strong>松开鼠标，换上你的图片</strong><span>JPG、PNG、WebP 或 AVIF</span></div>
        </div>
        <div class="preview-footer"><span class="image-info">${icon('image')}<span id="dimensions">—</span><span class="size-separator">/</span><span id="image-type">示例图片</span></span><span class="fit-label">适应画布</span></div>
        <div class="workspace-note"><span>${icon('check')}拖动卡片调整位置 · 自动适配图片</span><span>拖入图片，或按 Ctrl / ⌘ + V 粘贴</span></div>
      </section>
    </div>
    <footer class="site-footer"><span>你的照片，你的记录。</span><span>原尺寸导出 · 保留画面细节</span></footer>
  </main>
  <div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
`;

let options = defaults();
let currentImage;
let originalName = '示例图片';
let showingOriginal = false;
let imageRequest = 0;
let toastTimer;
let frame;
const $ = (selector) => document.querySelector(selector);
const preview = $('#preview');
const cardHandle = $('#card-handle');
let cardDrag;
const ctx = preview.getContext('2d');
const fontsReady = Promise.all([document.fonts.load(`400 52px ${FONT}`), document.fonts.load(`500 82px ${FONT}`)]);

function toast(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3800);
}

function redraw() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    if (currentImage) render(ctx, currentImage, preview.width, preview.height, options, showingOriginal);
    cardHandle.hidden = !currentImage || showingOriginal || !options.card.enabled;
    if (cardHandle.hidden) finishCardDrag();
    else {
      const box = layout(preview.width, preview.height, options).card;
      cardHandle.style.left = `${box.x / preview.width * 100}%`;
      cardHandle.style.top = `${box.y / preview.height * 100}%`;
      cardHandle.style.width = `${box.width / preview.width * 100}%`;
      cardHandle.style.height = `${box.height / preview.height * 100}%`;
    }
    const sample = $('#brand-sample');
    const sampleContext = sample.getContext('2d');
    sampleContext.clearRect(0, 0, sample.width, sample.height);
    sampleContext.save();
    sampleContext.scale(2, 2);
    drawBrand(sampleContext, options.brand);
    sampleContext.restore();
  });
}

function moveCard(x, y) {
  const box = layout(preview.width, preview.height, options).card;
  options.card.position = {
    x: Math.max(0, Math.min(1, x / (preview.width - box.width))),
    y: Math.max(0, Math.min(1, y / (preview.height - box.height))),
  };
  redraw();
}

function imagePoint(event) {
  const rect = preview.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * preview.width / rect.width,
    y: (event.clientY - rect.top) * preview.height / rect.height,
  };
}

function finishCardDrag() {
  if (!cardDrag) return;
  const { id } = cardDrag;
  cardDrag = null;
  cardHandle.classList.remove('moving');
  if (cardHandle.hasPointerCapture(id)) cardHandle.releasePointerCapture(id);
}

cardHandle.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || !event.isPrimary || cardHandle.hidden) return;
  const point = imagePoint(event);
  const box = layout(preview.width, preview.height, options).card;
  cardDrag = { id: event.pointerId, offsetX: point.x - box.x, offsetY: point.y - box.y };
  cardHandle.setPointerCapture(event.pointerId);
  cardHandle.classList.add('moving');
  cardHandle.focus({ preventScroll: true });
  event.preventDefault();
});
cardHandle.addEventListener('pointermove', (event) => {
  if (!cardDrag || event.pointerId !== cardDrag.id) return;
  const point = imagePoint(event);
  moveCard(point.x - cardDrag.offsetX, point.y - cardDrag.offsetY);
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  cardHandle.addEventListener(type, (event) => {
    if (cardDrag?.id === event.pointerId) finishCardDrag();
  });
}
cardHandle.addEventListener('keydown', (event) => {
  const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
  if (!direction) return;
  event.preventDefault();
  const box = layout(preview.width, preview.height, options).card;
  const step = (event.shiftKey ? 10 : 1) * preview.width / preview.getBoundingClientRect().width;
  moveCard(box.x + direction[0] * step, box.y + direction[1] * step);
});
$('#reset-position').addEventListener('click', () => {
  finishCardDrag();
  options.card.position = null;
  redraw();
});

function syncControls(key) {
  for (const [field, value] of Object.entries(options[key])) {
    const el = $(`#${key}-${field}`);
    if (!el) continue;
    if (field === 'enabled') el.checked = value;
    else el.value = field === 'date' ? value.replaceAll('.', '-') : value;
    if (el.type === 'range') updateRange(el);
  }
  $(`#dot-${key}`).classList.toggle('off', !options[key].enabled);
}

function updateRange(el) {
  $(`#${el.id}-value`).textContent = `${el.value}%`;
  el.style.setProperty('--range-progress', `${(el.value - el.min) / (el.max - el.min) * 100}%`);
}

$('#current-time').addEventListener('click', () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  options.card.time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  options.card.date = date.replaceAll('-', '.');
  options.card.weekday = weekdayFor(date);
  syncControls('card');
  redraw();
  toast('已按设备本地时间填写时间、日期和星期');
});

for (const key of ['card', 'brand']) {
  syncControls(key);
  for (const el of document.querySelectorAll(`#panel-${key} input, #panel-${key} textarea`)) {
    el.addEventListener('input', () => {
      const field = el.id.slice(key.length + 1);
      if (field === 'date') {
        const weekday = weekdayFor(el.value);
        if (!weekday) return;
        options.card.date = el.value.replaceAll('-', '.');
        options.card.weekday = weekday;
        $('#card-weekday').value = weekday;
      } else if (field === 'time') {
        if (!el.validity.valid || !el.value) return;
        options.card.time = el.value;
      } else if (el.type === 'checkbox') {
        options[key][field] = el.checked;
        $(`#dot-${key}`).classList.toggle('off', !el.checked);
      } else if (el.type === 'range') {
        options[key][field] = Number(el.value);
        updateRange(el);
      } else options[key][field] = el.value;
      redraw();
    });
    if (el.required) el.addEventListener('blur', () => {
      if (!el.validity.valid || !el.value) {
        syncControls(key);
        toast('请填写完整的时间或日期，已保留上一次的值');
      }
    });
  }
}

function selectTab(key) {
  for (const tab of document.querySelectorAll('[data-tab]')) {
    const active = tab.dataset.tab === key;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    $(`#panel-${tab.dataset.tab}`).hidden = !active;
  }
}
for (const tab of document.querySelectorAll('[data-tab]')) {
  tab.addEventListener('click', () => selectTab(tab.dataset.tab));
  tab.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const key = event.key === 'Home' ? 'card' : event.key === 'End' ? 'brand' : tab.dataset.tab === 'card' ? 'brand' : 'card';
    selectTab(key);
    $(`#tab-${key}`).focus();
  });
}

for (const button of document.querySelectorAll('[data-reset]')) button.addEventListener('click', () => {
  const key = button.dataset.reset;
  options[key] = defaults()[key];
  syncControls(key);
  redraw();
  toast('已恢复这处水印的默认内容和样式');
});

function setOriginal(value) {
  showingOriginal = value;
  $('#compare').setAttribute('aria-pressed', String(value));
  $('#compare span').textContent = value ? '返回水印' : '查看原图';
  $('#preview-title').textContent = value ? '原图预览' : '水印预览';
  $('#original-badge').hidden = !value;
  preview.setAttribute('aria-label', value ? '未添加水印的原图预览' : '添加水印后的图片预览');
  redraw();
}
$('#compare').addEventListener('click', () => setOriginal(!showingOriginal));

async function loadImage(source, name, isDemo = false) {
  finishCardDrag();
  const request = ++imageRequest;
  $('#loading').hidden = false;
  $('#export').disabled = true;
  try {
    const img = new Image();
    img.src = source;
    await Promise.all([img.decode(), fontsReady]);
    if (request !== imageRequest) return;
    currentImage = img;
    originalName = name;
    // Preview is bounded; the export renderer always uses the original dimensions.
    const ratio = Math.min(1, 1800 / Math.max(img.naturalWidth, img.naturalHeight));
    preview.width = Math.round(img.naturalWidth * ratio);
    preview.height = Math.round(img.naturalHeight * ratio);
    $('#file-name').textContent = name;
    $('#file-name').title = name;
    $('#dimensions').textContent = `${img.naturalWidth} × ${img.naturalHeight} px`;
    $('#image-type').textContent = isDemo ? '示例图片' : '你的图片';
    setOriginal(false);
  } catch {
    if (request === imageRequest) toast('无法读取这张图片，请选择有效的 JPG、PNG、WebP 或 AVIF 文件');
  } finally {
    if (source.startsWith('blob:')) URL.revokeObjectURL(source);
    if (request === imageRequest) {
      $('#loading').hidden = true;
      $('#export').disabled = !currentImage;
    }
  }
}

async function upload(file) {
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
    toast('请选择 JPG、PNG、WebP 或 AVIF 图片');
    return;
  }
  await loadImage(URL.createObjectURL(file), file.name);
}
$('#upload').addEventListener('click', () => $('#file').click());
$('#file').addEventListener('change', (event) => { upload(event.target.files[0]); event.target.value = ''; });
$('#demo').addEventListener('click', () => loadImage(`${import.meta.env.BASE_URL}demo.jpg`, '示例图片 · 纯绿背景', true));

let dragDepth = 0;
document.addEventListener('dragenter', (event) => {
  if (!event.dataTransfer.types.includes('Files')) return;
  event.preventDefault(); dragDepth += 1; $('#stage').classList.add('dragging');
});
document.addEventListener('dragover', (event) => {
  if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; }
});
document.addEventListener('dragleave', (event) => {
  if (!event.dataTransfer.types.includes('Files')) return;
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) $('#stage').classList.remove('dragging');
});
document.addEventListener('drop', (event) => {
  event.preventDefault(); dragDepth = 0; $('#stage').classList.remove('dragging');
  upload(event.dataTransfer.files[0]);
});
document.addEventListener('paste', (event) => {
  const item = [...(event.clipboardData?.items || [])].find((entry) => entry.type.startsWith('image/'));
  if (item) { event.preventDefault(); upload(item.getAsFile()); }
});

function saveCanvas(canvas, name, type = 'image/png') {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => {
    if (!blob) { reject(new Error('Unable to encode image')); return; }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    resolve();
  }, type, 0.95));
}

$('#export').addEventListener('click', async () => {
  if (!currentImage) return;
  const button = $('#export');
  button.disabled = true;
  button.querySelector('span').textContent = '正在导出…';
  try {
    await fontsReady;
    const canvas = document.createElement('canvas');
    canvas.width = currentImage.naturalWidth;
    canvas.height = currentImage.naturalHeight;
    const format = $('#format').value;
    const exportContext = canvas.getContext('2d');
    render(exportContext, currentImage, canvas.width, canvas.height, options);
    if (format === 'jpeg') {
      exportContext.globalCompositeOperation = 'destination-over';
      exportContext.fillStyle = '#fff';
      exportContext.fillRect(0, 0, canvas.width, canvas.height);
    }
    const filename = originalName.replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*]/g, '_');
    await saveCanvas(canvas, `${filename}-水印.${format === 'jpeg' ? 'jpg' : 'png'}`, `image/${format}`);
    canvas.width = canvas.height = 0;
    toast('图片已导出，保留原始尺寸');
  } catch { toast('导出未完成，图片可能超出浏览器画布限制，请尝试较小的图片'); }
  finally { button.disabled = false; button.querySelector('span').textContent = '导出图片'; }
});

for (const button of document.querySelectorAll('[data-layer]')) button.addEventListener('click', async () => {
  button.disabled = true;
  try {
    await fontsReady;
    const key = button.dataset.layer;
    const size = key === 'card' ? CARD : BRAND;
    const canvas = document.createElement('canvas');
    canvas.width = size.width * 2;
    canvas.height = size.height * 2;
    const context = canvas.getContext('2d');
    context.scale(2, 2);
    (key === 'card' ? drawCard : drawBrand)(context, options[key]);
    await saveCanvas(canvas, `${key === 'card' ? '信息卡' : '相机标识'}-透明水印.png`);
    toast('透明水印 PNG 已导出');
  } catch { toast('水印导出失败，请重试'); }
  finally { button.disabled = false; }
});

loadImage(`${import.meta.env.BASE_URL}demo.jpg`, '示例图片 · 纯绿背景', true);

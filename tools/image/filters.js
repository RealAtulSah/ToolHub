/**
 * ToolHub Pro - Filters & Adjusters Engine
 * Applies image effects, adjustments, borders, histograms, and color extraction.
 */
import ImageHelper from '../../assets/js/image-helper.js';

// DOM Elements
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const workspace = document.getElementById('workspace');
const downloadBtn = document.getElementById('download-btn');
const resetBtn = document.getElementById('reset-btn');
const previewImage = document.getElementById('preview-image');

// State
let originalFile = null;
let originalImage = null;
let originalUrl = null;
let resultUrl = null;
let resultBlob = null;

const toolId = window.toolId;

init();

function init() {
  ImageHelper.setupDragAndDrop('upload-zone', 'file-input', handleFileSelect);
  setupControls();
  setupActionButtons();
}

/**
 * Handle file upload
 */
async function handleFileSelect(file) {
  if (!file.type.startsWith('image/')) {
    window.showToast('Please select a valid image file.', 'danger');
    return;
  }

  try {
    window.showToast('Loading image...', 'info');
    resetWorkspaceData();
    originalFile = file;

    const loaded = await ImageHelper.loadImage(file);
    originalImage = loaded.img;
    originalUrl = loaded.url;

    uploadZone.style.display = 'none';
    workspace.style.display = 'grid';

    await processFilter();

  } catch (error) {
    console.error(error);
    window.showToast(error.message || 'Failed to load image.', 'danger');
    resetToUpload();
  }
}

/**
 * Connect controls based on active tool ID
 */
function setupControls() {
  const sliders = ['blur-slider', 'brightness-slider', 'contrast-slider', 'saturation-slider', 'pixelate-slider', 'border-size'];
  sliders.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', (e) => {
        const valEl = document.getElementById(`${id}-val`);
        if (valEl) valEl.innerText = id.includes('size') ? `${e.target.value}px` : e.target.value;
        debouncedProcess();
      });
    }
  });

  const borderColor = document.getElementById('border-color');
  if (borderColor) borderColor.addEventListener('input', () => processFilter());
}

/**
 * Processing router
 */
async function processFilter() {
  if (!originalImage) return;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const w = originalImage.naturalWidth;
  const h = originalImage.naturalHeight;

  canvas.width = w;
  canvas.height = h;

  // Draw base
  ctx.drawImage(originalImage, 0, 0);

  if (toolId === 'blur') {
    const val = parseInt(document.getElementById('blur-slider').value);
    ctx.filter = `blur(${val}px)`;
    ctx.drawImage(originalImage, 0, 0);
  } else if (toolId === 'brightness') {
    const val = parseInt(document.getElementById('brightness-slider').value);
    ctx.filter = `brightness(${val}%)`;
    ctx.drawImage(originalImage, 0, 0);
  } else if (toolId === 'contrast') {
    const val = parseInt(document.getElementById('contrast-slider').value);
    ctx.filter = `contrast(${val}%)`;
    ctx.drawImage(originalImage, 0, 0);
  } else if (toolId === 'saturation') {
    const val = parseInt(document.getElementById('saturation-slider').value);
    ctx.filter = `saturate(${val}%)`;
    ctx.drawImage(originalImage, 0, 0);
  } else if (toolId === 'grayscale') {
    ctx.filter = 'grayscale(100%)';
    ctx.drawImage(originalImage, 0, 0);
  } else if (toolId === 'sepia') {
    ctx.filter = 'sepia(100%)';
    ctx.drawImage(originalImage, 0, 0);
  } else if (toolId === 'border') {
    const size = parseInt(document.getElementById('border-size').value);
    const color = document.getElementById('border-color').value;
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.strokeRect(size / 2, size / 2, w - size, h - size);
  } else if (toolId === 'pixelate') {
    const blockSize = parseInt(document.getElementById('pixelate-slider').value);
    pixelateCanvas(canvas, ctx, w, h, blockSize);
  } else if (toolId === 'sharpen') {
    sharpenCanvas(canvas, ctx, w, h);
  } else if (toolId === 'histogram') {
    generateHistogram(canvas, ctx, w, h);
    return; // histogram doesn't export filtered image
  } else if (toolId === 'dominant-colors') {
    extractDominantColors(canvas, ctx, w, h);
    return; // dominant colors doesn't export filtered image
  }

  await saveCanvasOutput(canvas);
}

/**
 * Pixelate algorithm convolving blocks
 */
function pixelateCanvas(canvas, ctx, w, h, blockSize) {
  if (blockSize <= 1) return;

  // Scale down, then scale up with smoothing disabled
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  
  const sw = Math.max(1, Math.round(w / blockSize));
  const sh = Math.max(1, Math.round(h / blockSize));

  tempCanvas.width = sw;
  tempCanvas.height = sh;
  tempCtx.drawImage(originalImage, 0, 0, sw, sh);

  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tempCanvas, 0, 0, sw, sh, 0, 0, w, h);
}

/**
 * Sharpen algorithm (custom kernel convolution filter)
 */
function sharpenCanvas(canvas, ctx, w, h) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Sharpen Kernel: [0, -1, 0, -1, 5, -1, 0, -1, 0]
  const weights = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  const side = 3;
  const halfSide = 1;

  const output = ctx.createImageData(w, h);
  const dst = output.data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sy = y;
      const sx = x;
      const dstOff = (y * w + x) * 4;

      let r = 0, g = 0, b = 0;
      for (let cy = 0; cy < side; cy++) {
        for (let cx = 0; cx < side; cx++) {
          const scy = Math.min(h - 1, Math.max(0, sy + cy - halfSide));
          const scx = Math.min(w - 1, Math.max(0, sx + cx - halfSide));
          const srcOff = (scy * w + scx) * 4;
          const wt = weights[cy * side + cx];
          r += data[srcOff] * wt;
          g += data[srcOff + 1] * wt;
          b += data[srcOff + 2] * wt;
        }
      }

      dst[dstOff] = Math.min(255, Math.max(0, r));
      dst[dstOff + 1] = Math.min(255, Math.max(0, g));
      dst[dstOff + 2] = Math.min(255, Math.max(0, b));
      dst[dstOff + 3] = data[dstOff + 3]; // Alpha
    }
  }

  ctx.putImageData(output, 0, 0);
}

/**
 * Native SVG RGB Histogram Channel graphing
 */
function generateHistogram(canvas, ctx, w, h) {
  // Read pixels
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  const rBin = Array(256).fill(0);
  const gBin = Array(256).fill(0);
  const bBin = Array(256).fill(0);

  // Sample pixels (take every 5th to speed up processing)
  for (let i = 0; i < data.length; i += 20) {
    rBin[data[i]]++;
    gBin[data[i + 1]]++;
    bBin[data[i + 2]]++;
  }

  const maxVal = Math.max(...rBin, ...gBin, ...bBin) || 1;

  // Build SVG Paths
  let rPath = 'M0,150';
  let gPath = 'M0,150';
  let bPath = 'M0,150';

  for (let i = 0; i < 256; i++) {
    const x = (i / 255) * 300;
    const ry = 150 - (rBin[i] / maxVal) * 130;
    const gy = 150 - (gBin[i] / maxVal) * 130;
    const by = 150 - (bBin[i] / maxVal) * 130;

    rPath += ` L${x.toFixed(1)},${ry.toFixed(1)}`;
    gPath += ` L${x.toFixed(1)},${gy.toFixed(1)}`;
    bPath += ` L${x.toFixed(1)},${by.toFixed(1)}`;
  }
  
  rPath += ' L300,150 Z';
  gPath += ' L300,150 Z';
  bPath += ' L300,150 Z';

  const svg = `
    <svg viewBox="0 0 300 150" width="100%" height="100%">
      <rect width="300" height="150" fill="var(--bg-secondary)"/>
      <path d="${rPath}" fill="rgba(239, 68, 68, 0.4)" stroke="rgb(239, 68, 68)" stroke-width="1"/>
      <path d="${gPath}" fill="rgba(16, 185, 129, 0.4)" stroke="rgb(16, 185, 129)" stroke-width="1"/>
      <path d="${bPath}" fill="rgba(59, 130, 246, 0.4)" stroke="rgb(59, 130, 246)" stroke-width="1"/>
      <!-- Grid lines -->
      <line x1="0" y1="150" x2="300" y2="150" stroke="var(--border-color)"/>
      <line x1="75" y1="0" x2="75" y2="150" stroke="var(--border-color)" stroke-dasharray="2 2"/>
      <line x1="150" y1="0" x2="150" y2="150" stroke="var(--border-color)" stroke-dasharray="2 2"/>
      <line x1="225" y1="0" x2="225" y2="150" stroke="var(--border-color)" stroke-dasharray="2 2"/>
    </svg>
  `;

  document.getElementById('histogram-container').innerHTML = svg;
  
  // Set original image in preview
  if (previewImage) previewImage.src = originalUrl;
}

/**
 * Dominant Color quantizer binning
 */
function extractDominantColors(canvas, ctx, w, h) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Build grid of color occurrences
  const colorCounts = {};
  for (let i = 0; i < data.length; i += 40) {
    const r = Math.round(data[i] / 16) * 16;
    const g = Math.round(data[i + 1] / 16) * 16;
    const b = Math.round(data[i + 2] / 16) * 16;
    const a = data[i + 3];
    if (a < 100) continue;

    const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    colorCounts[hex] = (colorCounts[hex] || 0) + 1;
  }

  const sortedColors = Object.keys(colorCounts).sort((a, b) => colorCounts[b] - colorCounts[a]);
  const topColors = sortedColors.slice(0, 6);

  const container = document.getElementById('palette-container');
  if (container) {
    container.innerHTML = topColors.map(color => `
      <div style="display: flex; align-items: center; gap: 16px; background: var(--bg-tertiary); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
        <div style="width: 44px; height: 44px; border-radius: var(--radius-sm); background: ${color}; border: 1px solid rgba(255,255,255,0.15);"></div>
        <div style="flex-grow: 1;">
          <div style="font-family: monospace; font-size: 1.05rem; font-weight: 600; text-transform: uppercase;">${color}</div>
        </div>
        <button class="btn btn-secondary" onclick="navigator.clipboard.writeText('${color}').then(() => showToast('Color ${color} copied!', 'success'))" style="padding: 6px 12px; font-size: 0.8rem;">Copy</button>
      </div>
    `).join('');
  }

  if (previewImage) previewImage.src = originalUrl;
}

/**
 * Exporter helper
 */
function saveCanvasOutput(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resultBlob = blob;
      if (resultUrl) ImageHelper.revokeUrl(resultUrl);
      resultUrl = ImageHelper.createObjectUrl(blob);

      if (previewImage) previewImage.src = resultUrl;

      ImageHelper.cleanCanvas(canvas);
      resolve();
    }, originalFile.type);
  });
}

function setupActionButtons() {
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      // Don't download filters for non-export tools
      if (toolId === 'histogram' || toolId === 'dominant-colors') return;

      const baseName = originalFile.name.substring(0, originalFile.name.lastIndexOf('.')) || 'file';
      const ext = originalFile.name.substring(originalFile.name.lastIndexOf('.') + 1) || 'png';

      const link = document.createElement('a');
      link.href = resultUrl;
      link.download = `${baseName}_filtered.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.showToast('Download started!', 'success');
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetToUpload();
    });
  }
}

let debounceTimer = null;
function debouncedProcess() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    processFilter();
  }, 200);
}

function resetToUpload() {
  resetWorkspaceData();
  uploadZone.style.display = 'block';
  workspace.style.display = 'none';
  fileInput.value = '';

  const sliders = ['blur-slider', 'brightness-slider', 'contrast-slider', 'saturation-slider', 'pixelate-slider', 'border-size'];
  sliders.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.value = el.getAttribute('value') || 0;
      const valEl = document.getElementById(`${id}-val`);
      if (valEl) valEl.innerText = id.includes('brightness') || id.includes('contrast') || id.includes('saturation') ? `${el.value}%` : `${el.value}px`;
    }
  });
}

function resetWorkspaceData() {
  originalFile = null;
  originalImage = null;
  ImageHelper.cleanMemory();
  resultUrl = null;
  resultBlob = null;
}

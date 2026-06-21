/**
 * ToolHub Pro - Creative Compositors Engine
 * Handles watermarking, memes, collages, backgrounds, frames, and image merging.
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
let compositeUrl = null;
let compositeBlob = null;

// Multi-file state (for merge & collage)
let uploadedFiles = [];
let uploadedImages = [];

const toolId = window.toolId || window.location.pathname.split('/').pop().replace('.html', '');

init();

function init() {
  if (toolId === 'merge' || toolId === 'collage') {
    setupMultiUpload();
  } else {
    ImageHelper.setupDragAndDrop('upload-zone', 'file-input', handleFileSelect);
  }
  setupControls();
  setupActionButtons();
}

/**
 * Handle single file selection
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

    await processComposite();

  } catch (error) {
    console.error(error);
    window.showToast(error.message || 'Failed to load image.', 'danger');
    resetToUpload();
  }
}

/**
 * Handle multi-file uploads (Merge / Collage)
 */
function setupMultiUpload() {
  const multiInput = document.getElementById('multi-file-input');
  if (!multiInput) return;

  uploadZone.addEventListener('click', () => multiInput.click());

  multiInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    window.showToast(`Loading ${files.length} images...`, 'info');
    
    uploadedFiles = files;
    uploadedImages = [];
    ImageHelper.cleanMemory();

    try {
      for (const file of files) {
        const loaded = await ImageHelper.loadImage(file);
        uploadedImages.push(loaded.img);
      }

      uploadZone.style.display = 'none';
      workspace.style.display = 'grid';

      // Perform initial composition
      await processComposite();
      window.showToast('Images loaded!', 'success');
    } catch (err) {
      console.error(err);
      window.showToast('Failed to load one or more images.', 'danger');
      resetToUpload();
    }
  });
}

/**
 * Connect controls
 */
function setupControls() {
  // Watermark
  const wmText = document.getElementById('wm-text');
  const wmSize = document.getElementById('wm-size');
  const wmOpacity = document.getElementById('wm-opacity');
  const wmPos = document.getElementById('wm-pos');

  if (wmText) wmText.addEventListener('input', () => debouncedProcess());
  if (wmSize) wmSize.addEventListener('input', () => debouncedProcess());
  if (wmOpacity) wmOpacity.addEventListener('input', () => debouncedProcess());
  if (wmPos) wmPos.addEventListener('change', () => processComposite());

  // Meme
  const memeTop = document.getElementById('meme-top');
  const memeBottom = document.getElementById('meme-bottom');
  if (memeTop) memeTop.addEventListener('input', () => debouncedProcess());
  if (memeBottom) memeBottom.addEventListener('input', () => debouncedProcess());

  // Frame
  const frameSelect = document.getElementById('frame-style');
  if (frameSelect) frameSelect.addEventListener('change', () => processComposite());

  // Merge
  const mergeDir = document.getElementById('merge-direction');
  if (mergeDir) mergeDir.addEventListener('change', () => processComposite());

  // Background removal (Chroma key picker)
  const preview = document.getElementById('preview-canvas-bg');
  if (preview) {
    preview.addEventListener('click', (e) => {
      const rect = preview.getBoundingClientRect();
      const x = Math.round(((e.clientX - rect.left) / rect.width) * preview.width);
      const y = Math.round(((e.clientY - rect.top) / rect.height) * preview.height);
      const ctx = preview.getContext('2d');
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      
      document.getElementById('chroma-color').value = '#' + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1);
      processComposite();
    });
  }

  const chromaTolerance = document.getElementById('chroma-tolerance');
  if (chromaTolerance) {
    chromaTolerance.addEventListener('input', () => {
      document.getElementById('tolerance-val').innerText = chromaTolerance.value;
      debouncedProcess();
    });
  }
}

/**
 * Composite Router
 */
async function processComposite() {
  const canvas = document.getElementById('preview-canvas-bg') || document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (toolId === 'merge') {
    if (uploadedImages.length === 0) return;
    await processMerge(canvas, ctx);
    return;
  }
  
  if (toolId === 'collage') {
    if (uploadedImages.length === 0) return;
    await processCollage(canvas, ctx);
    return;
  }

  if (!originalImage) return;
  const w = originalImage.naturalWidth;
  const h = originalImage.naturalHeight;
  canvas.width = w;
  canvas.height = h;

  ctx.drawImage(originalImage, 0, 0);

  if (toolId === 'watermark') {
    processWatermark(ctx, w, h);
  } else if (toolId === 'meme') {
    processMeme(ctx, w, h);
  } else if (toolId === 'frame') {
    processFrame(ctx, w, h);
  } else if (toolId === 'thumbnail') {
    processThumbnail(ctx, w, h);
  } else if (toolId === 'background-remover') {
    processBackgroundRemover(canvas, ctx, w, h);
  }

  await saveCanvasOutput(canvas);
}

/**
 * Watermark renderer
 */
function processWatermark(ctx, w, h) {
  const text = document.getElementById('wm-text').value || 'ToolHub Pro';
  const size = parseInt(document.getElementById('wm-size').value) || 24;
  const opacity = parseFloat(document.getElementById('wm-opacity').value) / 100;
  const pos = document.getElementById('wm-pos').value;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 4;
  ctx.font = `bold ${size}px sans-serif`;

  const metrics = ctx.measureText(text);
  const textW = metrics.width;
  
  let tx = w / 2 - textW / 2;
  let ty = h / 2;

  if (pos === 'top-left') {
    tx = 20;
    ty = size + 20;
  } else if (pos === 'top-right') {
    tx = w - textW - 20;
    ty = size + 20;
  } else if (pos === 'bottom-left') {
    tx = 20;
    ty = h - 20;
  } else if (pos === 'bottom-right') {
    tx = w - textW - 20;
    ty = h - 20;
  }

  ctx.fillText(text, tx, ty);
  ctx.restore();
}

/**
 * Meme Generator Text overlay
 */
function processMeme(ctx, w, h) {
  const top = (document.getElementById('meme-top').value || '').toUpperCase();
  const bottom = (document.getElementById('meme-bottom').value || '').toUpperCase();

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = Math.round(w / 150);
  ctx.textAlign = 'center';
  
  // Calculate relative font size based on image width
  const fontSize = Math.round(w / 12);
  ctx.font = `900 ${fontSize}px Impact, sans-serif`;

  if (top) {
    ctx.fillText(top, w / 2, fontSize + 15);
    ctx.strokeText(top, w / 2, fontSize + 15);
  }

  if (bottom) {
    ctx.fillText(bottom, w / 2, h - 20);
    ctx.strokeText(bottom, w / 2, h - 20);
  }

  ctx.restore();
}

/**
 * Photo frames
 */
function processFrame(ctx, w, h) {
  const style = document.getElementById('frame-style').value;
  const borderSize = Math.round(Math.min(w, h) * 0.06);

  ctx.save();

  if (style === 'wood') {
    ctx.strokeStyle = '#8B5A2B'; // Wood brown
    ctx.lineWidth = borderSize;
    ctx.strokeRect(borderSize / 2, borderSize / 2, w - borderSize, h - borderSize);
    
    ctx.strokeStyle = '#5C3815'; // Darker inner border
    ctx.lineWidth = 4;
    ctx.strokeRect(borderSize, borderSize, w - borderSize * 2, h - borderSize * 2);
  } else if (style === 'gold') {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#D4AF37'); // Gold metallic
    grad.addColorStop(0.5, '#FFFDD0');
    grad.addColorStop(1, '#AA7C11');
    
    ctx.strokeStyle = grad;
    ctx.lineWidth = borderSize;
    ctx.strokeRect(borderSize / 2, borderSize / 2, w - borderSize, h - borderSize);
  } else if (style === 'neon') {
    ctx.strokeStyle = '#ff007f'; // Hot pink
    ctx.lineWidth = 6;
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 20;
    ctx.strokeRect(10, 10, w - 20, h - 20);
  }

  ctx.restore();
}

/**
 * Video Thumbnail Overlay
 */
function processThumbnail(ctx, w, h) {
  ctx.save();

  // Draw transparent colored band on bottom third
  const bandH = h / 3.5;
  ctx.fillStyle = 'rgba(99, 102, 241, 0.85)'; // Accent color background
  ctx.fillRect(0, h - bandH, w, bandH);

  // Text
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(w / 18)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('LIVE DEMO PREVIEW', w / 2, h - bandH / 2 + 10);

  ctx.restore();
}

/**
 * Chroma key background remover
 */
function processBackgroundRemover(canvas, ctx, w, h) {
  const color = document.getElementById('chroma-color').value;
  const tolerance = parseInt(document.getElementById('chroma-tolerance').value);

  // Parse HEX to RGB
  const targetR = parseInt(color.slice(1, 3), 16);
  const targetG = parseInt(color.slice(3, 5), 16);
  const targetB = parseInt(color.slice(5, 7), 16);

  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];

    // Calculate color distance
    const dist = Math.sqrt(
      Math.pow(r - targetR, 2) +
      Math.pow(g - targetG, 2) +
      Math.pow(b - targetB, 2)
    );

    if (dist < tolerance) {
      d[i + 3] = 0; // Set transparent
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Merge multiple images (Side by Side or Stacked)
 */
async function processMerge(canvas, ctx) {
  const dir = document.getElementById('merge-direction').value; // 'horizontal' | 'vertical'

  let totalW = 0;
  let totalH = 0;

  if (dir === 'horizontal') {
    totalH = Math.max(...uploadedImages.map(img => img.naturalHeight));
    uploadedImages.forEach(img => {
      totalW += img.naturalWidth * (totalH / img.naturalHeight);
    });
  } else {
    totalW = Math.max(...uploadedImages.map(img => img.naturalWidth));
    uploadedImages.forEach(img => {
      totalH += img.naturalHeight * (totalW / img.naturalWidth);
    });
  }

  canvas.width = totalW;
  canvas.height = totalH;

  let offset = 0;
  for (const img of uploadedImages) {
    if (dir === 'horizontal') {
      const w = img.naturalWidth * (totalH / img.naturalHeight);
      ctx.drawImage(img, offset, 0, w, totalH);
      offset += w;
    } else {
      const h = img.naturalHeight * (totalW / img.naturalWidth);
      ctx.drawImage(img, 0, offset, totalW, h);
      offset += h;
    }
  }

  await saveCanvasOutput(canvas);
}

/**
 * 2x2 or grid collage maker
 */
async function processCollage(canvas, ctx) {
  const count = uploadedImages.length;
  let w = 800;
  let h = 800;

  canvas.width = w;
  canvas.height = h;
  ctx.fillStyle = '#1e293b'; // Space background
  ctx.fillRect(0, 0, w, h);

  const padding = 10;

  if (count === 1) {
    ctx.drawImage(uploadedImages[0], padding, padding, w - padding * 2, h - padding * 2);
  } else if (count === 2) {
    const halfW = w / 2 - padding * 1.5;
    ctx.drawImage(uploadedImages[0], padding, padding, halfW, h - padding * 2);
    ctx.drawImage(uploadedImages[1], halfW + padding * 2, padding, halfW, h - padding * 2);
  } else {
    // 2x2 Grid
    const halfW = w / 2 - padding * 1.5;
    const halfH = h / 2 - padding * 1.5;

    ctx.drawImage(uploadedImages[0], padding, padding, halfW, halfH);
    ctx.drawImage(uploadedImages[1], halfW + padding * 2, padding, halfW, halfH);
    
    if (uploadedImages[2]) {
      ctx.drawImage(uploadedImages[2], padding, halfH + padding * 2, halfW, halfH);
    }
    if (uploadedImages[3]) {
      ctx.drawImage(uploadedImages[3], halfW + padding * 2, halfH + padding * 2, halfW, halfH);
    }
  }

  await saveCanvasOutput(canvas);
}

/**
 * Export canvas
 */
function saveCanvasOutput(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      compositeBlob = blob;
      if (compositeUrl) ImageHelper.revokeUrl(compositeUrl);
      compositeUrl = ImageHelper.createObjectUrl(blob);

      if (previewImage) previewImage.src = compositeUrl;

      // Clean up offscreen elements unless drawing to visible DOM canvas
      if (canvas.id !== 'preview-canvas-bg') {
        ImageHelper.cleanCanvas(canvas);
      }
      resolve();
    }, 'image/png');
  });
}

function setupActionButtons() {
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      if (!compositeUrl) return;

      const link = document.createElement('a');
      link.href = compositeUrl;
      link.download = `composite_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.showToast('Composite image downloaded!', 'success');
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
    processComposite();
  }, 150);
}

function resetToUpload() {
  resetWorkspaceData();
  uploadZone.style.display = 'block';
  workspace.style.display = 'none';
  fileInput.value = '';

  const multiInput = document.getElementById('multi-file-input');
  if (multiInput) multiInput.value = '';

  // Form Resets
  const inputs = ['wm-text', 'meme-top', 'meme-bottom'];
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  const select = document.getElementById('frame-style') || document.getElementById('wm-pos');
  if (select) select.selectedIndex = 0;
}

function resetWorkspaceData() {
  originalFile = null;
  originalImage = null;
  uploadedFiles = [];
  uploadedImages = [];
  ImageHelper.cleanMemory();
  compositeUrl = null;
  compositeBlob = null;
}

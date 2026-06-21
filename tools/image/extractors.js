/**
 * ToolHub Pro - Data & Metadata Extractors Engine
 * Handles Color Picking, EXIF Viewer, QR Code Reading, and Metadata stripping.
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
let strippedBlob = null;
let strippedUrl = null;

const toolId = window.toolId || window.location.pathname.split('/').pop().replace('.html', '');

init();

function init() {
  ImageHelper.setupDragAndDrop('upload-zone', 'file-input', handleFileSelect);
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

  if (file.size === 0) {
    window.showToast('Selected file is empty.', 'warning');
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

    await runExtractor();

  } catch (error) {
    console.error(error);
    window.showToast(error.message || 'Failed to extract data.', 'danger');
    resetToUpload();
  }
}

/**
 * Main Extractor Router
 */
async function runExtractor() {
  if (toolId === 'color-picker') {
    setupColorPicker();
  } else if (toolId === 'exif') {
    await runExifViewer();
  } else if (toolId === 'qr-reader') {
    await runQrReader();
  } else if (toolId === 'remove-metadata') {
    await runRemoveMetadata();
  }
}

/**
 * Color Picker Tool Setup (Magnifier + Pixel drop)
 */
function setupColorPicker() {
  const canvas = document.getElementById('picker-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  
  // Set canvas size matching container width while preserving aspect ratio
  const containerW = Math.min(600, workspace.clientWidth);
  const scale = containerW / originalImage.naturalWidth;
  canvas.width = containerW;
  canvas.height = originalImage.naturalHeight * scale;

  ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);

  // Mouse moves
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Get color
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const r = pixel[0];
    const g = pixel[1];
    const b = pixel[2];

    const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    updateColorUI(r, g, b, hex);
    renderMagnifier(ctx, x, y, r, g, b);
  });
}

function updateColorUI(r, g, b, hex) {
  document.getElementById('color-hex').innerText = hex.toUpperCase();
  document.getElementById('color-rgb').innerText = `rgb(${r}, ${g}, ${b})`;
  
  // Convert RGB to HSL
  const rf = r / 255, gf = g / 255, bf = b / 255;
  const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rf: h = (gf - bf) / d + (gf < bf ? 6 : 0); break;
      case gf: h = (bf - rf) / d + 2; break;
      case bf: h = (rf - gf) / d + 4; break;
    }
    h /= 6;
  }
  const H = Math.round(h * 360), S = Math.round(s * 100), L = Math.round(l * 100);
  document.getElementById('color-hsl').innerText = `hsl(${H}, ${S}%, ${L}%)`;
  document.getElementById('color-swatch').style.backgroundColor = hex;
}

function renderMagnifier(ctx, px, py, r, g, b) {
  const magCanvas = document.getElementById('magnifier-canvas');
  if (!magCanvas) return;

  const mctx = magCanvas.getContext('2d');
  mctx.clearRect(0, 0, 100, 100);
  
  // Draw zoomed portion from main canvas
  mctx.imageSmoothingEnabled = false;
  mctx.drawImage(
    ctx.canvas,
    px - 5, py - 5, 10, 10,  // Source coordinates (zoom in on a 10x10 area)
    0, 0, 100, 100          // Destination coordinates (draw on a 100x100 box)
  );

  // Draw target crosshair in center
  mctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  mctx.lineWidth = 1;
  mctx.strokeRect(45, 45, 10, 10);
}

/**
 * EXIF Viewer Tool
 */
async function runExifViewer() {
  const EXIF_JS = 'https://cdn.jsdelivr.net/npm/exif-js';
  try {
    await ImageHelper.loadScript(EXIF_JS);
  } catch (e) {
    window.showToast('Failed to load EXIF library.', 'danger');
    return;
  }

  const outputTable = document.getElementById('exif-table-body');
  if (!outputTable) return;

  if (previewImage) previewImage.src = originalUrl;

  window.showToast('Reading EXIF tags...', 'info');

  window.EXIF.getData(originalFile, function() {
    const allTags = window.EXIF.getAllTags(this);
    if (!allTags || Object.keys(allTags).length === 0) {
      outputTable.innerHTML = `<tr><td colspan="2" style="text-align: center; color: var(--text-muted);">No EXIF metadata tags found in this image.</td></tr>`;
      return;
    }

    outputTable.innerHTML = Object.keys(allTags)
      .map(tag => {
        const val = allTags[tag];
        // format arrays or objects nicely
        const displayVal = typeof val === 'object' ? JSON.stringify(val) : val;
        return `
          <tr>
            <td style="padding: 10px; font-weight: 500; border-bottom: 1px solid var(--border-color);">${tag}</td>
            <td style="padding: 10px; color: var(--text-secondary); word-break: break-all; border-bottom: 1px solid var(--border-color);">${displayVal}</td>
          </tr>
        `;
      }).join('');
    
    window.showToast('Metadata tags loaded!', 'success');
  });
}

/**
 * QR Code Reader Tool
 */
async function runQrReader() {
  const JSQR_JS = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
  try {
    await ImageHelper.loadScript(JSQR_JS);
  } catch (e) {
    window.showToast('Failed to load QR scanning library.', 'danger');
    return;
  }

  if (previewImage) previewImage.src = originalUrl;

  window.showToast('Scanning QR Code...', 'info');

  // Draw to offscreen canvas to extract pixel buffers
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = originalImage.naturalWidth;
  canvas.height = originalImage.naturalHeight;
  ctx.drawImage(originalImage, 0, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = window.jsQR(imgData.data, imgData.width, imgData.height, {
    inversionAttempts: 'dontInvert'
  });

  const outputText = document.getElementById('qr-output');
  if (outputText) {
    if (code) {
      outputText.value = code.data;
      window.showToast('QR Code scanned successfully!', 'success');
    } else {
      outputText.value = '[No valid QR Code was found in the image. Try checking orientation or clarity.]';
      window.showToast('Could not decode QR Code.', 'warning');
    }
  }

  ImageHelper.cleanCanvas(canvas);
}

/**
 * Remove Metadata (canvas redraw automatically strips EXIF headers)
 */
async function runRemoveMetadata() {
  window.showToast('Stripping file headers...', 'info');

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = originalImage.naturalWidth;
  canvas.height = originalImage.naturalHeight;
  
  ctx.drawImage(originalImage, 0, 0);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      strippedBlob = blob;
      strippedUrl = ImageHelper.createObjectUrl(blob);

      if (previewImage) previewImage.src = strippedUrl;

      // Update sizes
      document.getElementById('orig-size').innerText = ImageHelper.formatSize(originalFile.size);
      document.getElementById('cleared-size').innerText = ImageHelper.formatSize(blob.size);

      ImageHelper.cleanCanvas(canvas);
      window.showToast('Metadata tags stripped!', 'success');
      resolve();
    }, originalFile.type);
  });
}

/**
 * Action button binds
 */
function setupActionButtons() {
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      if (!strippedUrl) return;

      const baseName = originalFile.name.substring(0, originalFile.name.lastIndexOf('.')) || 'file';
      const ext = originalFile.name.substring(originalFile.name.lastIndexOf('.') + 1) || 'png';

      const link = document.createElement('a');
      link.href = strippedUrl;
      link.download = `${baseName}_cleaned.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.showToast('Cleaned image downloaded!', 'success');
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetToUpload();
    });
  }

  // Copy picker HEX values
  const copyHex = document.getElementById('copy-hex-btn');
  if (copyHex) {
    copyHex.addEventListener('click', () => {
      const hex = document.getElementById('color-hex').innerText;
      navigator.clipboard.writeText(hex).then(() => window.showToast(`HEX ${hex} copied!`, 'success'));
    });
  }

  // Copy QR Text
  const copyQr = document.getElementById('copy-qr-btn');
  if (copyQr) {
    copyQr.addEventListener('click', () => {
      const txt = document.getElementById('qr-output').value;
      if (txt && !txt.startsWith('[')) {
        navigator.clipboard.writeText(txt).then(() => window.showToast('Text copied!', 'success'));
      }
    });
  }
}

function resetToUpload() {
  resetWorkspaceData();
  uploadZone.style.display = 'block';
  workspace.style.display = 'none';
  fileInput.value = '';
  
  if (toolId === 'qr-reader') {
    document.getElementById('qr-output').value = '';
  }
}

function resetWorkspaceData() {
  originalFile = null;
  originalImage = null;
  ImageHelper.cleanMemory();
  strippedBlob = null;
  strippedUrl = null;
  
  const canvas = document.getElementById('picker-canvas');
  if (canvas) ImageHelper.cleanCanvas(canvas);
}

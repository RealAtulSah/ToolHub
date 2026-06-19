/**
 * ToolHub Pro - Image Resizer Tool
 * Resizes images client-side to exact pixel sizes or relative scale.
 */
import ImageHelper from '../../assets/js/image-helper.js';

// DOM Elements
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const workspace = document.getElementById('workspace');

const tabPixels = document.getElementById('tab-pixels');
const tabPercent = document.getElementById('tab-percent');
const panelPixels = document.getElementById('panel-pixels');
const panelPercent = document.getElementById('panel-percent');

const widthInput = document.getElementById('width-input');
const heightInput = document.getElementById('height-input');
const lockRatioCheckbox = document.getElementById('lock-aspect-ratio');

const percentInput = document.getElementById('percent-input');
const percentValue = document.getElementById('percent-value');

const formatSelect = document.getElementById('format-select');
const previewImage = document.getElementById('preview-image');
const downloadBtn = document.getElementById('download-btn');
const resetBtn = document.getElementById('reset-btn');

const originalDimLabel = document.getElementById('original-dim-label');
const targetDimLabel = document.getElementById('target-dim-label');

// State
let originalFile = null;
let originalImage = null;
let originalWidth = 0;
let originalHeight = 0;
let aspectRatio = 1;
let resizeMode = 'pixels'; // 'pixels' or 'percent'

let currentPreviewUrl = null;
let resizedBlob = null;

// Bind upload handlers
ImageHelper.setupDragAndDrop('upload-zone', 'file-input', handleFileSelect);

/**
 * Handle file upload
 */
async function handleFileSelect(file) {
  if (!file.type.startsWith('image/')) {
    window.showToast('Please upload a valid image file.', 'danger');
    return;
  }

  try {
    window.showToast('Loading image...', 'info');
    
    // Clean up previous runs
    resetWorkspaceData();
    originalFile = file;

    // Load file
    const loaded = await ImageHelper.loadImage(file);
    originalImage = loaded.img;
    originalWidth = originalImage.naturalWidth;
    originalHeight = originalImage.naturalHeight;
    aspectRatio = originalWidth / originalHeight;

    // Set controls
    originalDimLabel.innerText = `${originalWidth} x ${originalHeight} px`;
    widthInput.value = originalWidth;
    heightInput.value = originalHeight;
    percentInput.value = 100;
    percentValue.innerText = '100%';

    // Toggle panels
    uploadZone.style.display = 'none';
    workspace.style.display = 'grid';

    // Auto default format option
    formatSelect.value = file.type === 'image/svg+xml' || file.type === 'image/gif' ? 'image/jpeg' : 'original';

    // Run initial preview rendering
    await renderResizedPreview();
    window.showToast('Ready to resize!', 'success');

  } catch (error) {
    console.error(error);
    window.showToast(error.message || 'Failed to load image.', 'danger');
    resetToUpload();
  }
}

/**
 * Perform resizing draw on Canvas and update DOM Preview
 */
async function renderResizedPreview() {
  if (!originalImage || !originalFile) return;

  const targetWidth = parseInt(widthInput.value) || 1;
  const targetHeight = parseInt(heightInput.value) || 1;

  targetDimLabel.innerText = `${targetWidth} x ${targetHeight} px`;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  // Render original image scaled into target canvas
  ctx.drawImage(originalImage, 0, 0, targetWidth, targetHeight);

  // Set MIME Type
  let mimeType = formatSelect.value;
  if (mimeType === 'original') {
    mimeType = originalFile.type;
  }
  if (mimeType === 'image/svg+xml' || mimeType === 'image/gif') {
    mimeType = 'image/jpeg';
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve();
        return;
      }

      resizedBlob = blob;

      // Revoke older preview URL
      if (currentPreviewUrl) {
        ImageHelper.revokeUrl(currentPreviewUrl);
      }

      currentPreviewUrl = ImageHelper.createObjectUrl(blob);
      previewImage.src = currentPreviewUrl;

      // Clean up offscreen canvas
      ImageHelper.cleanCanvas(canvas);
      resolve();
    }, mimeType, 0.9);
  });
}

/**
 * Pixel Input Interactivity (Lock Aspect Ratio math)
 */
widthInput.addEventListener('input', () => {
  if (lockRatioCheckbox.checked && widthInput.value) {
    heightInput.value = Math.round(parseInt(widthInput.value) / aspectRatio);
  }
  debouncedRender();
});

heightInput.addEventListener('input', () => {
  if (lockRatioCheckbox.checked && heightInput.value) {
    widthInput.value = Math.round(parseInt(heightInput.value) * aspectRatio);
  }
  debouncedRender();
});

lockRatioCheckbox.addEventListener('change', () => {
  if (lockRatioCheckbox.checked && widthInput.value) {
    heightInput.value = Math.round(parseInt(widthInput.value) / aspectRatio);
    debouncedRender();
  }
});

/**
 * Percentage slider interaction
 */
percentInput.addEventListener('input', (e) => {
  const percent = parseInt(e.target.value);
  percentValue.innerText = `${percent}%`;

  // Update read-only pixel sizes
  widthInput.value = Math.round((originalWidth * percent) / 100);
  heightInput.value = Math.round((originalHeight * percent) / 100);

  debouncedRender();
});

/**
 * Tab Toggles (Pixels vs Percentage modes)
 */
tabPixels.addEventListener('click', () => {
  resizeMode = 'pixels';
  tabPixels.style.background = 'var(--bg-secondary)';
  tabPercent.style.background = 'transparent';
  panelPixels.style.display = 'flex';
  panelPercent.style.display = 'none';
});

tabPercent.addEventListener('click', () => {
  resizeMode = 'percent';
  tabPercent.style.background = 'var(--bg-secondary)';
  tabPixels.style.background = 'transparent';
  panelPixels.style.display = 'none';
  panelPercent.style.display = 'flex';
});

formatSelect.addEventListener('change', () => {
  renderResizedPreview();
});

// Debounce helper for inputs
let debounceTimer = null;
function debouncedRender() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    renderResizedPreview();
  }, 200);
}

/**
 * Download Resized image click
 */
downloadBtn.addEventListener('click', () => {
  if (!currentPreviewUrl || !originalFile) return;

  let ext = 'jpg';
  let mimeType = formatSelect.value;
  if (mimeType === 'original') {
    mimeType = originalFile.type;
  }
  if (mimeType === 'image/png') ext = 'png';
  if (mimeType === 'image/webp') ext = 'webp';

  const baseName = originalFile.name.substring(0, originalFile.name.lastIndexOf('.')) || originalFile.name;
  const newName = `${baseName}_resized.${ext}`;

  const link = document.createElement('a');
  link.href = currentPreviewUrl;
  link.download = newName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  window.showToast('Download started!', 'success');
});

/**
 * Reset click
 */
resetBtn.addEventListener('click', () => {
  resetToUpload();
});

function resetToUpload() {
  resetWorkspaceData();
  uploadZone.style.display = 'block';
  workspace.style.display = 'none';
  fileInput.value = '';
}

function resetWorkspaceData() {
  originalFile = null;
  originalImage = null;
  
  ImageHelper.cleanMemory();

  currentPreviewUrl = null;
  resizedBlob = null;
  previewImage.removeAttribute('src');
}

/**
 * ToolHub Pro - Image Compressor Tool
 * Compresses JPG, PNG, WEBP, and SVG images client-side.
 */
import ImageHelper from '../../assets/js/image-helper.js';

// DOM Elements
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const workspace = document.getElementById('workspace');
const qualityInput = document.getElementById('quality-input');
const qualityValue = document.getElementById('quality-value');
const formatSelect = document.getElementById('format-select');
const downloadBtn = document.getElementById('download-btn');
const resetBtn = document.getElementById('reset-btn');
const originalSizeLabel = document.getElementById('original-size-label');
const compressedSizeLabel = document.getElementById('compressed-size-label');
const ratioBadge = document.getElementById('compression-ratio-badge');

// Active State variables
let originalFile = null;
let originalImage = null;
let originalUrl = null;
let compressedUrl = null;
let compressedBlob = null;

// Initialize upload handler
ImageHelper.setupDragAndDrop('upload-zone', 'file-input', handleFileSelect);

/**
 * Handle file selection
 */
async function handleFileSelect(file) {
  // Validate that it's an image
  if (!file.type.startsWith('image/')) {
    window.showToast('Please select a valid image file.', 'danger');
    return;
  }

  // Cap size at 20MB
  if (file.size > 20 * 1024 * 1024) {
    window.showToast('Image file exceeds 20MB limit.', 'warning');
    return;
  }

  try {
    window.showToast('Loading image...', 'info');
    
    // Clean up previous runs
    resetWorkspaceData();
    originalFile = file;
    originalSizeLabel.innerText = ImageHelper.formatSize(file.size);

    // Load file
    const loaded = await ImageHelper.loadImage(file);
    originalImage = loaded.img;
    originalUrl = loaded.url;

    // Show workspace
    uploadZone.style.display = 'none';
    workspace.style.display = 'grid';

    // Auto set default formats
    updateFormatOptions(file.type);

    // Compress
    await compressImage();
    window.showToast('Image optimized successfully!', 'success');

  } catch (error) {
    console.error(error);
    window.showToast(error.message || 'Failed to load image.', 'danger');
    resetToUpload();
  }
}

/**
 * Update format drop-down options based on original file type
 */
function updateFormatOptions(mimeType) {
  // SVG and GIF cannot be compressed directly as raster unless converted
  if (mimeType === 'image/svg+xml' || mimeType === 'image/gif') {
    formatSelect.value = 'image/jpeg';
  } else {
    formatSelect.value = 'original';
  }
}

/**
 * Run compression via offscreen canvas
 */
async function compressImage() {
  if (!originalImage || !originalFile) return;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Set dimensions identical to original
  canvas.width = originalImage.naturalWidth;
  canvas.height = originalImage.naturalHeight;
  
  // Draw original image frame
  ctx.drawImage(originalImage, 0, 0);

  // Determine output MIME type
  let targetMime = formatSelect.value;
  if (targetMime === 'original') {
    targetMime = originalFile.type;
  }
  // Fallback if original is non-raster
  if (targetMime === 'image/svg+xml' || targetMime === 'image/gif') {
    targetMime = 'image/jpeg';
  }

  // Get quality slider value (fraction 0.1 - 1.0)
  const quality = parseFloat(qualityInput.value) / 100;

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        window.showToast('Compression failed.', 'danger');
        resolve();
        return;
      }

      compressedBlob = blob;
      
      // Clean up previous compressed blob URL
      if (compressedUrl) {
        ImageHelper.revokeUrl(compressedUrl);
      }

      compressedUrl = ImageHelper.createObjectUrl(blob);
      compressedSizeLabel.innerText = ImageHelper.formatSize(blob.size);

      // Calculate ratio
      const difference = originalFile.size - blob.size;
      const savingPercent = Math.max(0, Math.round((difference / originalFile.size) * 100));

      if (savingPercent > 0) {
        ratioBadge.style.color = 'var(--success)';
        ratioBadge.innerText = `Saved ${savingPercent}% of file size!`;
      } else {
        ratioBadge.style.color = 'var(--warning)';
        ratioBadge.innerText = '0% saved (increase compression for smaller size)';
      }

      // Render Comparison Slider
      ImageHelper.createSlider('slider-container', originalUrl, compressedUrl);

      // Clean up canvas memory immediately
      ImageHelper.cleanCanvas(canvas);

      resolve();
    }, targetMime, quality);
  });
}

/**
 * Setup slider value change and debounce compress calls
 */
let debounceTimer = null;
qualityInput.addEventListener('input', (e) => {
  qualityValue.innerText = `${e.target.value}%`;
  
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    compressImage();
  }, 200);
});

formatSelect.addEventListener('change', () => {
  compressImage();
});

/**
 * Handle Download click
 */
downloadBtn.addEventListener('click', () => {
  if (!compressedUrl || !originalFile) return;

  // Determine file extension
  let ext = 'jpg';
  let selectVal = formatSelect.value;
  if (selectVal === 'original') {
    selectVal = originalFile.type;
  }

  if (selectVal === 'image/png') ext = 'png';
  if (selectVal === 'image/webp') ext = 'webp';

  // Build compressed filename
  const baseName = originalFile.name.substring(0, originalFile.name.lastIndexOf('.')) || originalFile.name;
  const newName = `${baseName}_compressed.${ext}`;

  const link = document.createElement('a');
  link.href = compressedUrl;
  link.download = newName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  window.showToast('Download started!', 'success');
});

/**
 * Handle Reset/Compress another click
 */
resetBtn.addEventListener('click', () => {
  resetToUpload();
});

function resetToUpload() {
  resetWorkspaceData();
  uploadZone.style.display = 'block';
  workspace.style.display = 'none';
  fileInput.value = '';
  qualityInput.value = 80;
  qualityValue.innerText = '80%';
  formatSelect.value = 'original';
}

function resetWorkspaceData() {
  originalImage = null;
  originalFile = null;
  
  // Revoke URLs and clear memory tracking
  ImageHelper.cleanMemory();
  
  originalUrl = null;
  compressedUrl = null;
  compressedBlob = null;
}

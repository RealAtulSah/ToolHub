/**
 * ToolHub Pro - Image Cropper Tool
 * Crops, rotates, and mirrors images locally using Cropper.js.
 */
import ImageHelper from '../../assets/js/image-helper.js';

// DOM Elements
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const workspace = document.getElementById('workspace');

const cropperImage = document.getElementById('cropper-image');
const aspectButtons = document.getElementById('aspect-ratio-buttons');
const formatSelect = document.getElementById('format-select');

const btnRotateLeft = document.getElementById('btn-rotate-left');
const btnRotateRight = document.getElementById('btn-rotate-right');
const btnFlipH = document.getElementById('btn-flip-h');
const btnFlipV = document.getElementById('btn-flip-v');

const downloadBtn = document.getElementById('download-btn');
const resetBtn = document.getElementById('reset-btn');

// State
let originalFile = null;
let cropperInstance = null;
let originalUrl = null;

// Scale states for flipping
let scaleX = 1;
let scaleY = 1;

// CDN Paths
const CROPPER_JS = {
  src: 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js',
  integrity: 'sha384-r+ljwOAhwY4/kdyzMnuBg7MEVoWpTMp5EYUDntB/E9qzNwL9dAEcNrb2XaV+mJc2'
};
const CROPPER_CSS = {
  href: 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css',
  integrity: 'sha384-oMy41mb/qJnpJlpXOF57hSu2KGi47l/UV9+tPNrBOs7/ap5Vubj/3phrCtjutHMQ'
};

// Bind upload events
ImageHelper.setupDragAndDrop('upload-zone', 'file-input', handleFileSelect);

/**
 * Handle file upload
 */
async function handleFileSelect(file) {
  if (!file.type.startsWith('image/')) {
    window.showToast('Please select a valid image file.', 'danger');
    return;
  }

  originalFile = file;

  try {
    window.showToast('Loading Cropping Libraries...', 'info');

    // 1. Load Cropper.js resources dynamically
    await Promise.all([
      ImageHelper.loadScript(CROPPER_JS),
      ImageHelper.loadStyle(CROPPER_CSS)
    ]);

    // 2. Read image file
    const loaded = await ImageHelper.loadImage(file);
    originalUrl = loaded.url;

    // Clean previous croppers
    if (cropperInstance) {
      cropperInstance.destroy();
      cropperInstance = null;
    }

    cropperImage.src = originalUrl;
    uploadZone.style.display = 'none';
    workspace.style.display = 'grid';

    // Auto default format option
    formatSelect.value = file.type === 'image/svg+xml' || file.type === 'image/gif' ? 'image/jpeg' : 'original';

    // 3. Initialize Cropper.js instance
    cropperInstance = new window.Cropper(cropperImage, {
      viewMode: 1,
      dragMode: 'crop',
      aspectRatio: NaN, // Free aspect ratio default
      autoCropArea: 0.8,
      responsive: true,
      restore: false,
      checkCrossOrigin: false,
      checkOrientation: false
    });

    // Reset scales
    scaleX = 1;
    scaleY = 1;

    window.showToast('Crop area loaded!', 'success');

  } catch (error) {
    console.error(error);
    window.showToast('Failed to load cropper library.', 'danger');
    resetToUpload();
  }
}

/**
 * Aspect Ratio Click Handlers
 */
aspectButtons.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn || !cropperInstance) return;

  // Toggle active class
  aspectButtons.querySelectorAll('button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const ratio = parseFloat(btn.getAttribute('data-ratio'));
  cropperInstance.setAspectRatio(ratio);
});

/**
 * Transformations (Rotate & Flip)
 */
btnRotateLeft.addEventListener('click', () => {
  if (cropperInstance) cropperInstance.rotate(-90);
});

btnRotateRight.addEventListener('click', () => {
  if (cropperInstance) cropperInstance.rotate(90);
});

btnFlipH.addEventListener('click', () => {
  if (cropperInstance) {
    scaleX = scaleX === 1 ? -1 : 1;
    cropperInstance.scaleX(scaleX);
  }
});

btnFlipV.addEventListener('click', () => {
  if (cropperInstance) {
    scaleY = scaleY === 1 ? -1 : 1;
    cropperInstance.scaleY(scaleY);
  }
});

/**
 * Download Cropped image click
 */
downloadBtn.addEventListener('click', () => {
  if (!cropperInstance || !originalFile) return;

  window.showToast('Generating crop file...', 'info');

  const canvas = cropperInstance.getCroppedCanvas({
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high'
  });

  if (!canvas) {
    window.showToast('Failed to generate cropped canvas.', 'danger');
    return;
  }

  let mimeType = formatSelect.value;
  if (mimeType === 'original') {
    mimeType = originalFile.type;
  }
  if (mimeType === 'image/svg+xml' || mimeType === 'image/gif') {
    mimeType = 'image/jpeg';
  }

  let ext = 'jpg';
  if (mimeType === 'image/png') ext = 'png';
  if (mimeType === 'image/webp') ext = 'webp';

  const baseName = originalFile.name.substring(0, originalFile.name.lastIndexOf('.')) || originalFile.name;
  const newName = `${baseName}_cropped.${ext}`;

  canvas.toBlob((blob) => {
    if (!blob) {
      window.showToast('Cropping failed.', 'danger');
      return;
    }

    const cropUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = cropUrl;
    link.download = newName;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup URL and nodes
    document.body.removeChild(link);
    setTimeout(() => {
      URL.revokeObjectURL(cropUrl);
    }, 100);

    window.showToast('Cropped image downloaded!', 'success');
  }, mimeType, 0.95);
});

/**
 * Reset Click
 */
resetBtn.addEventListener('click', () => {
  resetToUpload();
});

function resetToUpload() {
  if (cropperInstance) {
    cropperInstance.destroy();
    cropperInstance = null;
  }
  
  ImageHelper.cleanMemory();
  originalFile = null;
  originalUrl = null;

  cropperImage.removeAttribute('src');
  uploadZone.style.display = 'block';
  workspace.style.display = 'none';
  fileInput.value = '';

  // Reset aspect buttons to active 'Free' tab
  aspectButtons.querySelectorAll('button').forEach(b => b.classList.remove('active'));
  aspectButtons.querySelector('[data-ratio="NaN"]').classList.add('active');
}

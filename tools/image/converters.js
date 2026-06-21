/**
 * ToolHub Pro - Format Converters Engine
 * Manages conversions (formats, base64, SVG, favicons) client-side.
 */
import ImageHelper from '../../assets/js/image-helper.js';

// DOM Elements
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const workspace = document.getElementById('workspace');
const downloadBtn = document.getElementById('download-btn');
const resetBtn = document.getElementById('reset-btn');

// State
let originalFile = null;
let originalImage = null;
let originalUrl = null;
let convertedUrl = null;
let convertedBlob = null;

// Determine Tool Mode
const toolId = window.toolId || window.location.pathname.split('/').pop().replace('.html', '');

// Initialize
init();

function init() {
  if (toolId === 'base64-to-image') {
    setupBase64ToImage();
  } else {
    ImageHelper.setupDragAndDrop('upload-zone', 'file-input', handleFileSelect);
  }
  setupActionButtons();
}

/**
 * Handle file upload
 */
async function handleFileSelect(file) {
  if (!file.type.startsWith('image/') && toolId !== 'base64-to-image') {
    window.showToast('Please select a valid image file.', 'danger');
    return;
  }

  if (file.size === 0) {
    window.showToast('Selected file is empty.', 'warning');
    return;
  }

  try {
    window.showToast('Loading file...', 'info');
    resetWorkspaceData();
    originalFile = file;

    if (toolId === 'image-to-base64') {
      await processImageToBase64(file);
    } else {
      const loaded = await ImageHelper.loadImage(file);
      originalImage = loaded.img;
      originalUrl = loaded.url;
      
      uploadZone.style.display = 'none';
      workspace.style.display = 'grid';

      // Perform conversion immediately on load
      await runConversion();
    }
  } catch (error) {
    console.error(error);
    window.showToast(error.message || 'Failed to process file.', 'danger');
    resetToUpload();
  }
}

/**
 * Main Conversion Coordinator
 */
async function runConversion() {
  if (toolId === 'jpg-to-png') {
    await convertRaster('image/png', 'png');
  } else if (toolId === 'png-to-jpg') {
    await convertRaster('image/jpeg', 'jpg');
  } else if (toolId === 'webp-to-png') {
    await convertRaster('image/png', 'png');
  } else if (toolId === 'png-to-webp') {
    await convertRaster('image/webp', 'webp');
  } else if (toolId === 'image-to-svg') {
    await convertToSvg();
  } else if (toolId === 'favicon') {
    await convertToFavicon();
  }
}

/**
 * Standard Raster Formats Converter
 */
async function convertRaster(mimeType, ext) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = originalImage.naturalWidth;
  canvas.height = originalImage.naturalHeight;
  
  // Fill background white for JPEGs if source was transparent
  if (mimeType === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(originalImage, 0, 0);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      convertedBlob = blob;
      convertedUrl = ImageHelper.createObjectUrl(blob);
      
      const preview = document.getElementById('preview-image');
      if (preview) preview.src = convertedUrl;

      // Stats
      const originalLabel = document.getElementById('orig-size');
      const targetLabel = document.getElementById('target-size');
      if (originalLabel) originalLabel.innerText = ImageHelper.formatSize(originalFile.size);
      if (targetLabel) targetLabel.innerText = ImageHelper.formatSize(blob.size);

      ImageHelper.cleanCanvas(canvas);
      resolve();
    }, mimeType, 0.95);
  });
}

/**
 * Image to Base64 String Converter
 */
function processImageToBase64(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    
    uploadZone.style.display = 'none';
    workspace.style.display = 'grid';

    document.getElementById('base64-output').value = dataUrl;
    
    const preview = document.getElementById('preview-image');
    if (preview) preview.src = dataUrl;

    const origSize = document.getElementById('orig-size');
    const b64Size = document.getElementById('b64-size');
    if (origSize) origSize.innerText = ImageHelper.formatSize(file.size);
    if (b64Size) b64Size.innerText = ImageHelper.formatSize(dataUrl.length);

    window.showToast('Base64 generated successfully!', 'success');
  };
  reader.readAsDataURL(file);
}

/**
 * Base64 text to Image Decoder
 */
function setupBase64ToImage() {
  const decodeBtn = document.getElementById('decode-btn');
  const b64Input = document.getElementById('base64-input');
  const preview = document.getElementById('preview-image');

  decodeBtn.addEventListener('click', () => {
    const value = b64Input.value.trim();
    if (!value) {
      window.showToast('Please paste a Base64 string.', 'warning');
      return;
    }

    try {
      // Basic check
      if (!value.startsWith('data:image/')) {
        window.showToast('Base64 string must start with data:image/...', 'danger');
        return;
      }

      preview.src = value;
      workspace.style.display = 'grid';
      uploadZone.style.display = 'none';
      
      // Save base64 as the convertedUrl for download
      convertedUrl = value;
      window.showToast('Base64 string decoded!', 'success');
    } catch (e) {
      window.showToast('Failed to decode Base64 string.', 'danger');
    }
  });
}

/**
 * Dynamic Local Edge Trace Tracing Vectorizer (Image to SVG)
 */
async function convertToSvg() {
  window.showToast('Vectorizing image...', 'info');

  // Scale down for faster trace performance
  const maxDim = 128;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  let w = originalImage.naturalWidth;
  let h = originalImage.naturalHeight;
  if (w > maxDim || h > maxDim) {
    if (w > h) {
      h = Math.round((h * maxDim) / w);
      w = maxDim;
    } else {
      w = Math.round((w * maxDim) / h);
      h = maxDim;
    }
  }

  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(originalImage, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Trace algorithm: Build horizontal path segments for pixels matching similar colors
  let svgPaths = '';
  const colors = {};

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a < 50) continue; // skip transparent

      const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
      if (!colors[hex]) colors[hex] = [];
      colors[hex].push({ x, y });
    }
  }

  // Optimize grids into horizontal rect blocks
  Object.keys(colors).forEach(color => {
    const coords = colors[color];
    let path = '';
    
    // Group horizontal runs
    const grid = Array(h).fill().map(() => Array(w).fill(false));
    coords.forEach(pt => { grid[pt.y][pt.x] = true; });

    for (let y = 0; y < h; y++) {
      let runStart = -1;
      for (let x = 0; x < w; x++) {
        if (grid[y][x]) {
          if (runStart === -1) runStart = x;
        } else {
          if (runStart !== -1) {
            path += ` M${runStart},${y} h${x - runStart} v1 h-${x - runStart} z`;
            runStart = -1;
          }
        }
      }
      if (runStart !== -1) {
        path += ` M${runStart},${y} h${w - runStart} v1 h-${w - runStart} z`;
      }
    }
    
    if (path) {
      svgPaths += `<path d="${path}" fill="${color}" shape-rendering="crispEdges"/>`;
    }
  });

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%">${svgPaths}</svg>`;
  convertedBlob = new Blob([svgContent], { type: 'image/svg+xml' });
  convertedUrl = URL.createObjectURL(convertedBlob);

  const preview = document.getElementById('preview-image');
  if (preview) preview.src = convertedUrl;

  const svgText = document.getElementById('svg-output');
  if (svgText) svgText.value = svgContent;

  ImageHelper.cleanCanvas(canvas);
}

/**
 * Favicon Multi-size Zip generator using JSZip
 */
async function convertToFavicon() {
  window.showToast('Generating Favicons...', 'info');

  const JSZIP_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
  try {
    await ImageHelper.loadScript(JSZIP_CDN);
  } catch (e) {
    window.showToast('Failed to load ZIP library.', 'danger');
    return;
  }

  const sizes = [16, 32, 48, 64];
  const zip = new window.JSZip();

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  for (const size of sizes) {
    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(originalImage, 0, 0, size, size);

    await new Promise((resolve) => {
      canvas.toBlob((blob) => {
        zip.file(`favicon-${size}x${size}.png`, blob);
        
        // Use 32x32 size for standard favicon.ico in the root zip
        if (size === 32) {
          zip.file('favicon.ico', blob);
          
          // Display standard preview
          if (convertedUrl) ImageHelper.revokeUrl(convertedUrl);
          convertedUrl = ImageHelper.createObjectUrl(blob);
          const preview = document.getElementById('preview-image');
          if (preview) preview.src = convertedUrl;
        }
        resolve();
      }, 'image/png');
    });
  }

  // Generate ZIP blob
  convertedBlob = await zip.generateAsync({ type: 'blob' });
  window.showToast('Favicon pack generated!', 'success');
}

/**
 * Configure buttons copy/download/reset events
 */
function setupActionButtons() {
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      if (!convertedUrl && toolId !== 'favicon') return;
      
      let ext = 'png';
      if (toolId === 'png-to-jpg') ext = 'jpg';
      if (toolId === 'png-to-webp') ext = 'webp';
      if (toolId === 'image-to-svg') ext = 'svg';
      if (toolId === 'favicon') ext = 'zip';

      const baseName = originalFile ? originalFile.name.substring(0, originalFile.name.lastIndexOf('.')) : 'file';
      
      const link = document.createElement('a');
      if (toolId === 'favicon') {
        const zipUrl = URL.createObjectURL(convertedBlob);
        link.href = zipUrl;
        link.download = `${baseName}_favicons.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(zipUrl), 100);
      } else {
        link.href = convertedUrl;
        link.download = `${baseName}_converted.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      window.showToast('Download started!', 'success');
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetToUpload();
    });
  }

  // Clipboard copy for Base64 and SVG
  const copyBtn = document.getElementById('copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const textarea = document.getElementById('base64-output') || document.getElementById('svg-output');
      if (!textarea || !textarea.value) return;

      try {
        await navigator.clipboard.writeText(textarea.value);
        window.showToast('Copied to clipboard!', 'success');
      } catch (err) {
        window.showToast('Failed to copy.', 'warning');
      }
    });
  }
}

function resetToUpload() {
  resetWorkspaceData();
  uploadZone.style.display = 'block';
  workspace.style.display = 'none';
  fileInput.value = '';

  const textarea = document.getElementById('base64-output') || document.getElementById('svg-output') || document.getElementById('base64-input');
  if (textarea) textarea.value = '';
}

function resetWorkspaceData() {
  originalFile = null;
  originalImage = null;
  ImageHelper.cleanMemory();
  convertedUrl = null;
  convertedBlob = null;
}

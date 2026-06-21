/**
 * ToolHub Pro - Geometry & Borders Engine
 * Handles image rotations, flips, splitting, and rounded corners client-side.
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

const toolId = window.toolId || window.location.pathname.split('/').pop().replace('.html', '');

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

    // Set initial controls and perform process
    initControlsState();
    await processGeometry();

  } catch (error) {
    console.error(error);
    window.showToast(error.message || 'Failed to load image.', 'danger');
    resetToUpload();
  }
}

/**
 * Configure UI control sliders and buttons
 */
function setupControls() {
  // Rotate Controls
  const rotateSlider = document.getElementById('rotate-slider');
  const rotateValue = document.getElementById('rotate-value');
  const rotateLeft90 = document.getElementById('rotate-l90');
  const rotateRight90 = document.getElementById('rotate-r90');

  if (rotateSlider) {
    rotateSlider.addEventListener('input', (e) => {
      rotateValue.innerText = `${e.target.value}°`;
      debouncedProcess();
    });
  }
  if (rotateLeft90) {
    rotateLeft90.addEventListener('click', () => {
      rotateSlider.value = (parseInt(rotateSlider.value) - 90 + 360) % 360;
      rotateValue.innerText = `${rotateSlider.value}°`;
      processGeometry();
    });
  }
  if (rotateRight90) {
    rotateRight90.addEventListener('click', () => {
      rotateSlider.value = (parseInt(rotateSlider.value) + 90) % 360;
      rotateValue.innerText = `${rotateSlider.value}°`;
      processGeometry();
    });
  }

  // Flip Controls
  const flipH = document.getElementById('flip-h');
  const flipV = document.getElementById('flip-v');
  if (flipH) flipH.addEventListener('change', () => processGeometry());
  if (flipV) flipV.addEventListener('change', () => processGeometry());

  // Splitter Controls
  const splitRows = document.getElementById('split-rows');
  const splitCols = document.getElementById('split-cols');
  if (splitRows) splitRows.addEventListener('input', () => {
    document.getElementById('rows-val').innerText = splitRows.value;
    processGeometry();
  });
  if (splitCols) splitCols.addEventListener('input', () => {
    document.getElementById('cols-val').innerText = splitCols.value;
    processGeometry();
  });

  // Rounded Corners Controls
  const radiusSlider = document.getElementById('radius-slider');
  const radiusValue = document.getElementById('radius-value');
  if (radiusSlider) {
    radiusSlider.addEventListener('input', (e) => {
      radiusValue.innerText = `${e.target.value}px`;
      debouncedProcess();
    });
  }
}

function initControlsState() {
  if (toolId === 'round-corners') {
    const radiusSlider = document.getElementById('radius-slider');
    const maxRadius = Math.round(Math.min(originalImage.naturalWidth, originalImage.naturalHeight) / 2);
    radiusSlider.max = maxRadius;
    radiusSlider.value = Math.round(maxRadius * 0.15); // default 15% round
    document.getElementById('radius-value').innerText = `${radiusSlider.value}px`;
  }
}

/**
 * Processing router
 */
async function processGeometry() {
  if (!originalImage) return;

  if (toolId === 'rotate') {
    await processRotate();
  } else if (toolId === 'flip') {
    await processFlip();
  } else if (toolId === 'splitter') {
    await processSplitter();
  } else if (toolId === 'round-corners') {
    await processRoundCorners();
  }
}

/**
 * Rotate processing (includes canvas resizing to fit bounds)
 */
async function processRotate() {
  const angle = parseInt(document.getElementById('rotate-slider').value);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const rad = (angle * Math.PI) / 180;
  
  // Calculate bounding box size for rotated image
  const w = originalImage.naturalWidth;
  const h = originalImage.naturalHeight;
  
  const boundingWidth = Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad));
  const boundingHeight = Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad));

  canvas.width = boundingWidth;
  canvas.height = boundingHeight;

  // Translate to center and draw
  ctx.translate(boundingWidth / 2, boundingHeight / 2);
  ctx.rotate(rad);
  ctx.drawImage(originalImage, -w / 2, -h / 2);

  return saveCanvasOutput(canvas);
}

/**
 * Flip processing
 */
async function processFlip() {
  const flipH = document.getElementById('flip-h').checked;
  const flipV = document.getElementById('flip-v').checked;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const w = originalImage.naturalWidth;
  const h = originalImage.naturalHeight;

  canvas.width = w;
  canvas.height = h;

  ctx.translate(flipH ? w : 0, flipV ? h : 0);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(originalImage, 0, 0);

  return saveCanvasOutput(canvas);
}

/**
 * Splitter processing (shows slice preview grids)
 */
async function processSplitter() {
  const rows = parseInt(document.getElementById('split-rows').value);
  const cols = parseInt(document.getElementById('split-cols').value);

  const gridPreview = document.getElementById('grid-preview');
  if (!gridPreview) return;

  gridPreview.innerHTML = `
    <div style="position: relative; width: 100%; height: 350px; background: url('${originalUrl}') center/contain no-repeat; border-radius: var(--radius-md);">
      <div style="position: absolute; top:0; left:0; width: 100%; height: 100%; display: grid; grid-template-rows: repeat(${rows}, 1fr); grid-template-columns: repeat(${cols}, 1fr); border: 2px solid var(--accent);">
        ${Array(rows * cols).fill('<div style="border: 1px dashed rgba(255,255,255,0.6); background: rgba(99, 102, 241, 0.05);"></div>').join('')}
      </div>
    </div>
  `;
}

/**
 * Round corners processing
 */
async function processRoundCorners() {
  const radius = parseInt(document.getElementById('radius-slider').value);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const w = originalImage.naturalWidth;
  const h = originalImage.naturalHeight;

  canvas.width = w;
  canvas.height = h;

  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.arcTo(w, 0, w, h, radius);
  ctx.arcTo(w, h, 0, h, radius);
  ctx.arcTo(0, h, 0, 0, radius);
  ctx.arcTo(0, 0, w, 0, radius);
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(originalImage, 0, 0);

  return saveCanvasOutput(canvas);
}

/**
 * Shared Canvas Blob exporter
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

/**
 * Action button click handlers (download splitter ZIPs)
 */
function setupActionButtons() {
  if (downloadBtn) {
    downloadBtn.addEventListener('click', async () => {
      const baseName = originalFile.name.substring(0, originalFile.name.lastIndexOf('.')) || 'file';
      const ext = originalFile.name.substring(originalFile.name.lastIndexOf('.') + 1) || 'png';

      if (toolId === 'splitter') {
        window.showToast('Generating split images ZIP...', 'info');
        
        const JSZIP_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        try {
          await ImageHelper.loadScript(JSZIP_CDN);
        } catch (e) {
          window.showToast('Failed to load ZIP library.', 'danger');
          return;
        }

        const rows = parseInt(document.getElementById('split-rows').value);
        const cols = parseInt(document.getElementById('split-cols').value);
        const zip = new window.JSZip();

        const cellW = originalImage.naturalWidth / cols;
        const cellH = originalImage.naturalHeight / rows;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = cellW;
        canvas.height = cellH;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            ctx.clearRect(0, 0, cellW, cellH);
            ctx.drawImage(
              originalImage,
              c * cellW, r * cellH, cellW, cellH, // Source subbox
              0, 0, cellW, cellH                 // Destination
            );

            await new Promise((resolve) => {
              canvas.toBlob((blob) => {
                zip.file(`slice_row${r + 1}_col${c + 1}.${ext}`, blob);
                resolve();
              }, originalFile.type);
            });
          }
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipUrl = URL.createObjectURL(zipBlob);
        
        const link = document.createElement('a');
        link.href = zipUrl;
        link.download = `${baseName}_slices.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(zipUrl), 100);

        ImageHelper.cleanCanvas(canvas);
        window.showToast('ZIP folder downloaded!', 'success');

      } else {
        const link = document.createElement('a');
        link.href = resultUrl;
        link.download = `${baseName}_modified.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        window.showToast('Download started!', 'success');
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetToUpload();
    });
  }
}

// Debounce processing
let debounceTimer = null;
function debouncedProcess() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    processGeometry();
  }, 150);
}

function resetToUpload() {
  resetWorkspaceData();
  uploadZone.style.display = 'block';
  workspace.style.display = 'none';
  fileInput.value = '';

  const rotateSlider = document.getElementById('rotate-slider');
  if (rotateSlider) {
    rotateSlider.value = 0;
    document.getElementById('rotate-value').innerText = '0°';
  }
  const flipH = document.getElementById('flip-h');
  const flipV = document.getElementById('flip-v');
  if (flipH) flipH.checked = false;
  if (flipV) flipV.checked = false;

  const splitRows = document.getElementById('split-rows');
  const splitCols = document.getElementById('split-cols');
  if (splitRows) {
    splitRows.value = 2;
    document.getElementById('rows-val').innerText = '2';
  }
  if (splitCols) {
    splitCols.value = 2;
    document.getElementById('cols-val').innerText = '2';
  }
}

function resetWorkspaceData() {
  originalFile = null;
  originalImage = null;
  ImageHelper.cleanMemory();
  resultUrl = null;
  resultBlob = null;
}

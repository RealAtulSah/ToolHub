/**
 * ToolHub Pro - OCR Image to Text Tool
 * Performs local optical character recognition using Tesseract.js.
 */
import ImageHelper from '../../assets/js/image-helper.js';

// DOM Elements
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const workspace = document.getElementById('workspace');

const sourceImage = document.getElementById('source-image');
const langSelect = document.getElementById('lang-select');
const resultText = document.getElementById('result-text');

const progressContainer = document.getElementById('progress-container');
const progressStatus = document.getElementById('progress-status');
const progressValue = document.getElementById('progress-value');
const progressBarFill = document.getElementById('progress-bar-fill');

const copyBtn = document.getElementById('copy-btn');
const saveBtn = document.getElementById('save-btn');
const resetBtn = document.getElementById('reset-btn');

// State
let originalFile = null;
let originalUrl = null;
let ocrWorker = null;

// CDN Path
const TESSERACT_JS = {
  src: 'https://cdn.jsdelivr.net/npm/tesseract.js@4.1.4/dist/tesseract.min.js',
  integrity: 'sha384-soKK8k0O7vp8HHQlT3c/niqQX7Y16pYEY3L/0sSp1rYbk3xkn/2STGH/tkJbCiV'
};

// Bind drag & drop upload
ImageHelper.setupDragAndDrop('upload-zone', 'file-input', handleFileSelect);

/**
 * Handle upload selection
 */
async function handleFileSelect(file) {
  if (!file.type.startsWith('image/')) {
    window.showToast('Please select a valid image file.', 'danger');
    return;
  }

  originalFile = file;

  try {
    window.showToast('Loading OCR engine...', 'info');

    // 1. Dynamic CDN script injection
    await ImageHelper.loadScript(TESSERACT_JS);

    // 2. Read file as Image
    const loaded = await ImageHelper.loadImage(file);
    originalUrl = loaded.url;

    // Reset workspace
    sourceImage.src = originalUrl;
    resultText.value = '';
    copyBtn.disabled = true;
    saveBtn.disabled = true;

    // Show workspace
    uploadZone.style.display = 'none';
    workspace.style.display = 'grid';

    // 3. Trigger Scan
    await runOcr();

  } catch (error) {
    console.error(error);
    window.showToast(error.message || 'Failed to load OCR engine.', 'danger');
    resetToUpload();
  }
}

/**
 * Run OCR scan
 */
async function runOcr() {
  if (!originalFile || !window.Tesseract) return;

  // Show progress bar
  progressContainer.style.display = 'flex';
  progressStatus.innerText = 'Initializing Tesseract engine...';
  progressValue.innerText = '0%';
  progressBarFill.style.width = '0%';
  
  resultText.value = '';
  copyBtn.disabled = true;
  saveBtn.disabled = true;

  const lang = langSelect.value;

  try {
    const result = await window.Tesseract.recognize(
      originalFile,
      lang,
      {
        logger: (m) => handleOcrProgress(m)
      }
    );

    // Scan complete
    progressContainer.style.display = 'none';
    
    if (result && result.data && result.data.text) {
      const text = result.data.text.trim();
      if (text === '') {
        resultText.value = '[No readable text was found in the image. Try adjusting brightness or contrast.]';
      } else {
        resultText.value = text;
        copyBtn.disabled = false;
        saveBtn.disabled = false;
      }
      window.showToast('Text extracted successfully!', 'success');
    } else {
      throw new Error('No output returned from OCR engine.');
    }

  } catch (error) {
    console.error(error);
    progressContainer.style.display = 'none';
    window.showToast('OCR recognition failed.', 'danger');
    resultText.value = 'Failed to extract text. Error details:\n' + error.message;
  }
}

/**
 * Update progress bar based on logger updates
 */
function handleOcrProgress(meta) {
  let statusText = 'Processing...';
  let progress = 0;

  if (meta.status === 'loading tesseract core') {
    statusText = 'Loading OCR Core...';
    progress = meta.progress || 0;
  } else if (meta.status === 'initializing api' || meta.status === 'initializing tesseract') {
    statusText = 'Initializing dictionaries...';
    progress = meta.progress || 0;
  } else if (meta.status === 'recognizing text') {
    statusText = 'Analyzing document pixels...';
    progress = meta.progress || 0;
  }

  const percent = Math.round(progress * 100);
  progressStatus.innerText = statusText;
  progressValue.innerText = `${percent}%`;
  progressBarFill.style.width = `${percent}%`;
}

/**
 * Re-scan when language selection changes
 */
langSelect.addEventListener('change', () => {
  runOcr();
});

/**
 * Copy to clipboard action
 */
copyBtn.addEventListener('click', async () => {
  const text = resultText.value;
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    window.showToast('Text copied to clipboard!', 'success');
  } catch (error) {
    console.error(error);
    window.showToast('Failed to copy to clipboard.', 'warning');
  }
});

/**
 * Save as TXT file download
 */
saveBtn.addEventListener('click', () => {
  const text = resultText.value;
  if (!text) return;

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  
  const baseName = originalFile.name.substring(0, originalFile.name.lastIndexOf('.')) || originalFile.name;
  const newName = `${baseName}_extracted.txt`;

  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = newName;
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
  
  window.showToast('Text file saved!', 'success');
});

/**
 * Reset layout to upload
 */
resetBtn.addEventListener('click', () => {
  resetToUpload();
});

function resetToUpload() {
  ImageHelper.cleanMemory();
  originalFile = null;
  originalUrl = null;

  sourceImage.removeAttribute('src');
  uploadZone.style.display = 'block';
  workspace.style.display = 'none';
  fileInput.value = '';

  progressContainer.style.display = 'none';
  resultText.value = '';
  copyBtn.disabled = true;
  saveBtn.disabled = true;
}

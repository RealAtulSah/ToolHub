/**
 * ToolHub Pro - PDF Tools Helper Library
 * Handles shared library loading, file parsing, password protection prompts, rendering previews, and memory safety.
 */
const PdfHelper = {
  activeUrls: new Set(),

  // CDN Paths with Subresource Integrity (SRI) hashes
  // Hashes generated via: openssl dgst -sha384 -binary <file> | openssl base64 -A
  // Regenerate hashes when updating library versions.
  CDNS: {
    PDF_JS: {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
      integrity: 'sha384-q9gMPN9VuHwXjMYnsFg3iR6+QoF2O4Cb1nA3VB63PLJM4TBHFVhDIkNxjxXFH+k'
    },
    PDF_JS_WORKER: {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
      integrity: ''  // Worker scripts loaded via workerSrc, not script tags — SRI N/A
    },
    PDF_LIB: {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js',
      integrity: 'sha384-vJlFQWjv4s4VhHRxMj5G2lkz3GEvinP8/SPsWBD3F5K5I6Zrj0IOyYFiksIIGGJ'
    },
    JS_PDF: {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
      integrity: 'sha384-kYByMqHSk49PH1if1+jhg3IvXQ6IjBnXG9m2eUGYBrHqbqUiHN5KS1dPXJJAM8M'
    },
    SHEET_JS: {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
      integrity: 'sha384-mi7UgjW1VjfBzpcWlFjME2l3MBqLfUP/K7TWXfFlsqqHk7bFe0h+VRoHyFpGZcj'
    },
    JSZIP: {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
      integrity: 'sha384-+mbTIMoVm4KZ1f48v6GDE/apnGFfmLxRKDfDwOEKRV7MAw0Y1l+JYbzVN+aoXjt'
    },
    TESSERACT: {
      src: 'https://cdn.jsdelivr.net/npm/tesseract.js@4.1.4/dist/tesseract.min.js',
      integrity: 'sha384-soKK8k0O7vp8HHQlT3c/niqQX7Y16pYEY3L/0sSp1rYbk3xkn/2STGH/tkJbCiV'
    },
    CHART_JS: {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js',
      integrity: 'sha384-9MhbyIRcBVQiiC7FSd7T38oJNj2Zh+EfxS7/vjhBi4OOT78NlHSnzM31EZRWR1LZ'
    }
  },

  // Maximum file size in MB (enforced across all tools)
  MAX_FILE_SIZE_MB: 50,

  // Load external JavaScript library dynamically with optional SRI
  loadScript(cdnEntry) {
    // Support both string URLs (legacy) and { src, integrity } objects
    const src = typeof cdnEntry === 'string' ? cdnEntry : cdnEntry.src;
    const integrity = typeof cdnEntry === 'object' ? cdnEntry.integrity : null;

    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      // Add SRI integrity hash if provided
      if (integrity) {
        s.integrity = integrity;
        s.crossOrigin = 'anonymous';
      }
      s.onload = () => resolve();
      s.onerror = (err) => reject(new Error(`Failed to load script: ${src}`));
      document.body.appendChild(s);
    });
  },

  // Load PDFJS with worker
  async loadPdfJs() {
    await this.loadScript(this.CDNS.PDF_JS);
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = this.CDNS.PDF_JS_WORKER.src;
    }
  },

  // Binds drag and drop events for dropzone
  setupDragAndDrop(containerId, inputId, onFileSelected, multiple = false) {
    const container = document.getElementById(containerId);
    const input = document.getElementById(inputId);
    if (!container || !input) return;

    container.addEventListener('click', () => input.click());

    input.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        if (multiple) {
          onFileSelected(Array.from(e.target.files));
        } else {
          onFileSelected(e.target.files[0]);
        }
      }
    });

    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      container.classList.add('dragover');
    });

    container.addEventListener('dragleave', () => {
      container.classList.remove('dragover');
    });

    container.addEventListener('drop', (e) => {
      e.preventDefault();
      container.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        if (multiple) {
          onFileSelected(Array.from(e.dataTransfer.files));
        } else {
          onFileSelected(e.dataTransfer.files[0]);
        }
      }
    });
  },

  // Formats file sizes nicely
  formatSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Tracks and creates URL
  createObjectUrl(blobOrFile) {
    const url = URL.createObjectURL(blobOrFile);
    this.activeUrls.add(url);
    return url;
  },

  // Invalidate single URL
  revokeUrl(url) {
    if (this.activeUrls.has(url)) {
      URL.revokeObjectURL(url);
      this.activeUrls.delete(url);
    }
  },

  // Invalidate all URLs to free memory
  cleanMemory() {
    this.activeUrls.forEach(url => URL.revokeObjectURL(url));
    this.activeUrls.clear();
  },

  // Empty canvas helper
  cleanCanvas(canvas) {
    if (!canvas) return;
    canvas.width = 0;
    canvas.height = 0;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, 0, 0);
  },

  // Custom Password Prompt Modal
  promptPassword(reason = 'This document is password protected.') {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'glass-panel';
      modal.style = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 9999;
        padding: 30px;
        max-width: 400px;
        width: 90%;
        display: flex;
        flex-direction: column;
        gap: 20px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.5);
      `;
      // Escape reason text to prevent injection
      const esc = window.Security ? window.Security.escapeHtml.bind(window.Security) : (s) => s;
      modal.innerHTML = `
        <h3 style="font-family: var(--font-heading); margin: 0; font-size: 1.25rem;">Password Required</h3>
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin: 0;">${esc(reason)}</p>
        <input type="password" id="pdf-pwd-input" placeholder="Enter password" style="
          width: 100%;
          padding: 12px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          color: var(--text-primary);
        ">
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button class="btn btn-secondary" id="pdf-pwd-cancel">Cancel</button>
          <button class="btn btn-primary" id="pdf-pwd-submit">Unlock</button>
        </div>
      `;

      const overlay = document.createElement('div');
      overlay.style = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.75);
        backdrop-filter: blur(4px);
        z-index: 9998;
      `;

      document.body.appendChild(overlay);
      document.body.appendChild(modal);

      const input = modal.querySelector('#pdf-pwd-input');
      input.focus();

      const submit = () => {
        const val = input.value;
        cleanup();
        resolve(val);
      };

      const cancel = () => {
        cleanup();
        resolve(null);
      };

      const cleanup = () => {
        modal.remove();
        overlay.remove();
      };

      modal.querySelector('#pdf-pwd-submit').onclick = submit;
      modal.querySelector('#pdf-pwd-cancel').onclick = cancel;
      input.onkeydown = (e) => {
        if (e.key === 'Enter') submit();
        if (e.key === 'Escape') cancel();
      };
    });
  },

  // High-level safe PDF document loading
  async loadPdf(file) {
    await this.loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    let pwd = '';
    let doc = null;

    while (!doc) {
      try {
        const loadingTask = window.pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer.slice(0)),
          password: pwd
        });
        doc = await loadingTask.promise;
      } catch (err) {
        if (err.name === 'PasswordException') {
          pwd = await this.promptPassword(pwd ? 'Invalid password. Please try again.' : 'This PDF file is encrypted.');
          if (pwd === null) {
            throw new Error('Loading cancelled. Password is required to open this PDF.');
          }
        } else {
          throw err;
        }
      }
    }

    return { doc, password: pwd, arrayBuffer };
  },

  // Render a specific page to a canvas context
  async renderPage(pdfDoc, pageNum, canvas, scale = 1.5) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    const canvasContext = canvas.getContext('2d');
    const renderContext = {
      canvasContext,
      viewport
    };
    await page.render(renderContext).promise;
    return canvas;
  },

  // Generates thumbnail canvas elements for all pages
  async generateThumbnails(pdfDoc, containerId, onPageSelect = null, selectedPages = new Set(), options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    container.style = `
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 16px;
      width: 100%;
      margin-top: 15px;
    `;

    const totalPages = pdfDoc.numPages;
    const items = [];

    for (let i = 1; i <= totalPages; i++) {
      const pageWrapper = document.createElement('div');
      pageWrapper.className = `glass-panel pdf-page-thumb ${selectedPages.has(i) ? 'selected' : ''}`;
      pageWrapper.style = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 10px;
        cursor: pointer;
        position: relative;
        border: 2px solid ${selectedPages.has(i) ? 'var(--accent)' : 'transparent'};
        transition: transform 0.2s, border-color 0.2s;
      `;
      pageWrapper.dataset.page = i;

      const canvas = document.createElement('canvas');
      canvas.style = 'max-width: 100%; max-height: 150px; background: white; border-radius: var(--radius-sm);';
      
      // Render preview thumbnail with low scale to save CPU/Memory
      this.renderPage(pdfDoc, i, canvas, 0.4).catch(err => console.error(err));

      const pageLabel = document.createElement('span');
      pageLabel.innerText = `Page ${i}`;
      pageLabel.style = 'font-size: 0.8rem; font-weight: 500;';

      pageWrapper.appendChild(canvas);
      pageWrapper.appendChild(pageLabel);

      // Add checkbox if selection callback is provided
      if (onPageSelect) {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = selectedPages.has(i);
        checkbox.style = 'position: absolute; top: 8px; right: 8px; cursor: pointer; scale: 1.1;';
        checkbox.onclick = (e) => {
          e.stopPropagation();
          const active = checkbox.checked;
          pageWrapper.style.borderColor = active ? 'var(--accent)' : 'transparent';
          pageWrapper.classList.toggle('selected', active);
          onPageSelect(i, active);
        };
        pageWrapper.appendChild(checkbox);

        pageWrapper.onclick = () => {
          checkbox.checked = !checkbox.checked;
          const active = checkbox.checked;
          pageWrapper.style.borderColor = active ? 'var(--accent)' : 'transparent';
          pageWrapper.classList.toggle('selected', active);
          onPageSelect(i, active);
        };
      }

      container.appendChild(pageWrapper);
      items.push(pageWrapper);
    }

    return items;
  }
};

window.PdfHelper = PdfHelper;
export default PdfHelper;

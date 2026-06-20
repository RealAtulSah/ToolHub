/**
 * ToolHub Pro - Image Tools Helper Library
 * Handles shared uploads, library dependency resolution, before/after slider UI, and memory optimization.
 */
const ImageHelper = {
  activeUrls: new Set(),

  // Load external JavaScript library dynamically (with optional SRI)
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

  // Load external CSS stylesheet dynamically (with optional SRI)
  loadStyle(cdnEntry) {
    // Support both string URLs (legacy) and { href, integrity } objects
    const href = typeof cdnEntry === 'string' ? cdnEntry : cdnEntry.href;
    const integrity = typeof cdnEntry === 'object' ? cdnEntry.integrity : null;

    return new Promise((resolve) => {
      if (document.querySelector(`link[href="${href}"]`)) {
        resolve();
        return;
      }
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      if (integrity) {
        l.integrity = integrity;
        l.crossOrigin = 'anonymous';
      }
      l.onload = () => resolve();
      document.head.appendChild(l);
    });
  },

  // Binds drag and drop events for dropzone
  setupDragAndDrop(containerId, inputId, onFileSelected) {
    const container = document.getElementById(containerId);
    const input = document.getElementById(inputId);
    if (!container || !input) return;

    container.addEventListener('click', () => input.click());

    input.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        onFileSelected(e.target.files[0]);
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
        onFileSelected(e.dataTransfer.files[0]);
      }
    });
  },

  // Asynchronously loads file as Image object and manages URL tracking
  loadImage(file) {
    return new Promise((resolve, reject) => {
      // Validate MIME type
      if (!file.type.startsWith('image/')) {
        reject(new Error('Selected file is not an image.'));
        return;
      }

      const url = URL.createObjectURL(file);
      this.activeUrls.add(url);

      const img = new Image();
      img.onload = () => {
        resolve({ img, url });
      };
      img.onerror = (err) => {
        this.revokeUrl(url);
        reject(new Error('Failed to load image file. File may be corrupted.'));
      };
      img.src = url;
    });
  },

  // Generates and tracks object URL
  createObjectUrl(blobOrFile) {
    const url = URL.createObjectURL(blobOrFile);
    this.activeUrls.add(url);
    return url;
  },

  // Revoke single URL
  revokeUrl(url) {
    if (this.activeUrls.has(url)) {
      URL.revokeObjectURL(url);
      this.activeUrls.delete(url);
    }
  },

  // Revokes all tracked URLs to prevent leaks
  cleanMemory() {
    this.activeUrls.forEach(url => URL.revokeObjectURL(url));
    this.activeUrls.clear();
  },

  // Clean canvas context
  cleanCanvas(canvas) {
    if (!canvas) return;
    canvas.width = 0;
    canvas.height = 0;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, 0, 0);
  },

  // Formats file sizes nicely
  formatSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Renders a visual slider comparison panel
  createSlider(containerId, beforeUrl, afterUrl) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="slider-wrapper" style="position: relative; width: 100%; height: 350px; overflow: hidden; border-radius: var(--radius-md); background: var(--bg-tertiary); border: 1px solid var(--border-color);">
        <!-- Before image (underneath) -->
        <div class="before-img" style="position: absolute; top:0; left:0; width: 100%; height: 100%; background: url('${beforeUrl}') center/contain no-repeat;"></div>
        <!-- After image (clipped) -->
        <div class="after-img" style="position: absolute; top:0; left:0; width: 50%; height: 100%; background: url('${afterUrl}') center/contain no-repeat; border-right: 2px solid var(--accent); overflow: hidden;"></div>
        <!-- Invisible range slider handle for dragging -->
        <input type="range" class="slider-handle" min="0" max="100" value="50" style="position: absolute; top:0; left:0; width: 100%; height: 100%; opacity: 0; cursor: ew-resize; z-index: 10;">
        <!-- Visual slider line/thumb -->
        <div class="slider-divider" style="position: absolute; top: 0; bottom: 0; left: 50%; width: 2px; background: var(--accent); pointer-events: none;">
          <div class="slider-button" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 36px; height: 36px; background: var(--accent); border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.4); color: white; font-weight: bold; pointer-events: none;">↔</div>
        </div>
      </div>
    `;

    const slider = container.querySelector('.slider-handle');
    const afterImg = container.querySelector('.after-img');
    const divider = container.querySelector('.slider-divider');

    slider.addEventListener('input', (e) => {
      const val = e.target.value;
      afterImg.style.width = `${val}%`;
      divider.style.left = `${val}%`;
    });
  }
};

window.ImageHelper = ImageHelper;
export default ImageHelper;

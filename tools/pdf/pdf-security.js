/**
 * ToolHub Pro - PDF Security Engine
 * Handles Password Protection, Unlocking, Signature Overlay, Metadata Editing, Redaction, and Form Filling.
 */
import PdfHelper from '../../assets/js/pdf-helper.js';

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const fileInput = document.getElementById('file-input');
  const uploadZone = document.getElementById('upload-zone');
  const workspace = document.getElementById('workspace');

  if (!fileInput) return;

  // State
  let pdfData = null; // Stores { doc, password, arrayBuffer, file }
  let signaturePad = null;
  let signatureImage = null; // transparent base64 signature
  let formFieldsList = [];

  // Identify Tool Page
  const isProtect = window.location.pathname.includes('protect');
  const isUnlock = window.location.pathname.includes('unlock');
  const isSign = window.location.pathname.includes('sign');
  const isMetadata = window.location.pathname.includes('metadata');
  const isRedact = window.location.pathname.includes('redact');
  const isFormFiller = window.location.pathname.includes('form-filler');

  // Load PDFLib
  try {
    await PdfHelper.loadScript(PdfHelper.CDNS.PDF_LIB);
  } catch (err) {
    console.error('Failed to load PDF-Lib', err);
  }

  // Setup Drag & Drop Upload
  PdfHelper.setupDragAndDrop('upload-zone', 'file-input', async (file) => {
    if (file.type !== 'application/pdf') {
      window.showToast('Please select a valid PDF file.', 'danger');
      return;
    }
    await loadPdfFile(file);
  });

  // Browse files fallback inside Upload zone button
  const browseBtn = uploadZone.querySelector('button');
  if (browseBtn) {
    browseBtn.onclick = (e) => {
      e.stopPropagation();
      fileInput.click();
    };
  }

  /**
   * Load source PDF
   */
  async function loadPdfFile(file) {
    try {
      window.showToast('Loading PDF file...', 'info');
      // For Unlock tool, we want to try loading with standard load Pdf first, which handles passwords
      pdfData = await PdfHelper.loadPdf(file);
      pdfData.file = file;

      // Show workspace
      uploadZone.style.display = 'none';
      workspace.style.display = 'grid';

      // Update stats
      const fn = document.getElementById('filename-label');
      if (fn) fn.innerText = file.name;
      const sz = document.getElementById('size-label');
      if (sz) sz.innerText = PdfHelper.formatSize(file.size);
      const pg = document.getElementById('pages-label');
      if (pg) pg.innerText = `${pdfData.doc.numPages} Pages`;

      // Custom tool initializations
      if (isMetadata) {
        await initMetadataEditor();
      } else if (isFormFiller) {
        await initFormFiller();
      } else if (isSign) {
        await initSignatureWorkspace();
      } else if (isRedact) {
        await initRedactionWorkspace();
      } else if (document.getElementById('pages-preview-grid')) {
        await PdfHelper.generateThumbnails(pdfData.doc, 'pages-preview-grid');
      }

    } catch (err) {
      console.error(err);
      window.showToast(err.message || 'Error loading PDF.', 'danger');
      resetWorkspace();
    }
  }

  function downloadBlob(blob, filename) {
    if (window.showPreviewModal) {
      window.showPreviewModal(blob, filename);
    } else {
      const url = PdfHelper.createObjectUrl(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  function resetWorkspace() {
    PdfHelper.cleanMemory();
    pdfData = null;
    signatureImage = null;
    formFieldsList = [];

    if (fileInput) fileInput.value = '';
    if (uploadZone) uploadZone.style.display = 'block';
    if (workspace) workspace.style.display = 'none';

    const pgGrid = document.getElementById('pages-preview-grid');
    if (pgGrid) pgGrid.innerHTML = '';
  }

  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.onclick = () => resetWorkspace();
  }

  // ==========================================
  // 1. PASSWORD PROTECT PDF
  // ==========================================
  const protectBtn = document.getElementById('protect-btn');
  if (protectBtn) {
    protectBtn.onclick = async () => {
      const pwd = document.getElementById('pdf-password').value;
      if (!pwd) {
        window.showToast('Please enter a password.', 'warning');
        return;
      }
      try {
        window.showToast('Encrypting document...', 'info');
        const srcDoc = await window.PDFLib.PDFDocument.load(pdfData.arrayBuffer, { password: pdfData.password });
        
        // Save with password protection parameters
        const encryptedBytes = await srcDoc.save({
          userPassword: pwd,
          ownerPassword: pwd,
          permissions: {
            printing: 'highResolution',
            modifying: false,
            copying: false,
            annotating: false
          }
        });

        downloadBlob(new Blob([encryptedBytes], { type: 'application/pdf' }), `${pdfData.file.name.replace('.pdf', '')}_protected.pdf`);
        window.showToast('PDF encrypted successfully!', 'success');
      } catch (err) {
        console.error(err);
        window.showToast('Failed to encrypt PDF.', 'danger');
      }
    };
  }

  // ==========================================
  // 2. UNLOCK PDF
  // ==========================================
  const unlockBtn = document.getElementById('unlock-btn');
  if (unlockBtn) {
    unlockBtn.onclick = async () => {
      try {
        window.showToast('Decrypting document...', 'info');
        // load Pdf handles decrypting, so pdfData.arrayBuffer is loaded with pdfData.password
        const srcDoc = await window.PDFLib.PDFDocument.load(pdfData.arrayBuffer, { password: pdfData.password });
        
        // Save without encrypt flags removes password
        const decryptedBytes = await srcDoc.save();

        downloadBlob(new Blob([decryptedBytes], { type: 'application/pdf' }), `${pdfData.file.name.replace('.pdf', '')}_unlocked.pdf`);
        window.showToast('PDF decrypted and restrictions removed!', 'success');
      } catch (err) {
        console.error(err);
        window.showToast('Failed to decrypt PDF.', 'danger');
      }
    };
  }

  // ==========================================
  // 3. ADD SIGNATURE
  // ==========================================
  let activeSignPage = 1;
  let clickX = 100;
  let clickY = 100;

  async function initSignatureWorkspace() {
    // Render first page preview
    const previewContainer = document.getElementById('pages-preview-grid');
    previewContainer.innerHTML = '';
    previewContainer.style = 'position: relative; max-width: 100%; display: flex; justify-content: center;';

    const canvas = document.createElement('canvas');
    canvas.id = 'sign-preview-canvas';
    canvas.style = 'border: 1px solid var(--border-color); background: white; cursor: crosshair; max-width: 100%;';
    previewContainer.appendChild(canvas);

    await PdfHelper.renderPage(pdfData.doc, activeSignPage, canvas, 1.0);

    // Coordinate locator on click
    canvas.onclick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      clickX = (e.clientX - rect.left) * scaleX;
      // Convert canvas Y to PDF Y coordinate (origin is bottom-left in PDF-Lib)
      clickY = canvas.height - ((e.clientY - rect.top) * scaleY);
      
      // Render coordinate marker in UI
      drawMarker(e.clientX - rect.left, e.clientY - rect.top);
      window.showToast(`Placement selected.`, 'info');
    };

    setupSignaturePad();
    renderPageDropdown();
  }

  function drawMarker(x, y) {
    let marker = document.getElementById('sig-coord-marker');
    if (!marker) {
      marker = document.createElement('div');
      marker.id = 'sig-coord-marker';
      marker.innerText = '️';
      marker.style = 'position: absolute; font-size: 2rem; pointer-events: none; transform: translate(-50%, -50%);';
      document.getElementById('pages-preview-grid').appendChild(marker);
    }
    marker.style.left = `${x}px`;
    marker.style.top = `${y}px`;
  }

  function setupSignaturePad() {
    const padCanvas = document.getElementById('signature-pad');
    if (!padCanvas) return;

    const ctx = padCanvas.getContext('2d');
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000000';

    let drawing = false;

    const getPos = (e) => {
      const rect = padCanvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    padCanvas.onmousedown = (e) => {
      drawing = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };

    padCanvas.onmousemove = (e) => {
      if (!drawing) return;
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    };

    window.addEventListener('mouseup', () => {
      drawing = false;
    });

    document.getElementById('clear-pad-btn').onclick = () => {
      ctx.clearRect(0, 0, padCanvas.width, padCanvas.height);
      signatureImage = null;
    };

    document.getElementById('save-pad-btn').onclick = () => {
      signatureImage = padCanvas.toDataURL('image/png');
      window.showToast('Signature saved! Click on the PDF preview to choose location, then apply.', 'success');
    };
  }

  function renderPageDropdown() {
    const select = document.getElementById('sign-page-select');
    if (!select) return;
    select.innerHTML = '';
    for (let i = 1; i <= pdfData.doc.numPages; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.innerText = `Page ${i}`;
      select.appendChild(opt);
    }
    select.onchange = async () => {
      activeSignPage = parseInt(select.value);
      const canvas = document.getElementById('sign-preview-canvas');
      const marker = document.getElementById('sig-coord-marker');
      if (marker) marker.remove();
      await PdfHelper.renderPage(pdfData.doc, activeSignPage, canvas, 1.0);
    };
  }

  const signBtn = document.getElementById('apply-signature-btn');
  if (signBtn) {
    signBtn.onclick = async () => {
      if (!signatureImage) {
        window.showToast('Please draw and save your signature first.', 'warning');
        return;
      }
      try {
        window.showToast('Overlaying signature...', 'info');
        const srcDoc = await window.PDFLib.PDFDocument.load(pdfData.arrayBuffer, { password: pdfData.password });
        
        const sigBytes = await fetch(signatureImage).then(res => res.arrayBuffer());
        const sigPng = await srcDoc.embedPng(sigBytes);

        const pages = srcDoc.getPages();
        const page = pages[activeSignPage - 1];

        // Draw PNG signature
        page.drawImage(sigPng, {
          x: clickX - 50,
          y: clickY - 25,
          width: 100,
          height: 50
        });

        const signedBytes = await srcDoc.save();
        downloadBlob(new Blob([signedBytes], { type: 'application/pdf' }), `signed_document.pdf`);
        window.showToast('Signature applied successfully!', 'success');
        loadSingleFile(new File([signedBytes], pdfData.file.name, { type: 'application/pdf' }));
      } catch (err) {
        console.error(err);
        window.showToast('Failed to apply signature.', 'danger');
      }
    };
  }

  // ==========================================
  // 4. METADATA EDITOR
  // ==========================================
  async function initMetadataEditor() {
    try {
      const srcDoc = await window.PDFLib.PDFDocument.load(pdfData.arrayBuffer, { password: pdfData.password });
      
      document.getElementById('meta-title').value = srcDoc.getTitle() || '';
      document.getElementById('meta-author').value = srcDoc.getAuthor() || '';
      document.getElementById('meta-subject').value = srcDoc.getSubject() || '';
      document.getElementById('meta-keywords').value = srcDoc.getKeywords() || '';
      document.getElementById('meta-creator').value = srcDoc.getCreator() || '';
      document.getElementById('meta-producer').value = srcDoc.getProducer() || '';
    } catch (err) {
      console.error(err);
      window.showToast('Failed to extract metadata fields.', 'warning');
    }
  }

  const saveMetaBtn = document.getElementById('save-metadata-btn');
  if (saveMetaBtn) {
    saveMetaBtn.onclick = async () => {
      try {
        window.showToast('Updating document metadata...', 'info');
        const srcDoc = await window.PDFLib.PDFDocument.load(pdfData.arrayBuffer, { password: pdfData.password });

        srcDoc.setTitle(document.getElementById('meta-title').value);
        srcDoc.setAuthor(document.getElementById('meta-author').value);
        srcDoc.setSubject(document.getElementById('meta-subject').value);
        srcDoc.setKeywords(document.getElementById('meta-keywords').value);
        srcDoc.setCreator(document.getElementById('meta-creator').value);
        srcDoc.setProducer(document.getElementById('meta-producer').value);

        const metaBytes = await srcDoc.save();
        downloadBlob(new Blob([metaBytes], { type: 'application/pdf' }), `${pdfData.file.name.replace('.pdf', '')}_metadata.pdf`);
        window.showToast('Metadata updated successfully!', 'success');
        loadSingleFile(new File([metaBytes], pdfData.file.name, { type: 'application/pdf' }));
      } catch (err) {
        console.error(err);
        window.showToast('Failed to update metadata.', 'danger');
      }
    };
  }

  // ==========================================
  // 5. REDACTOR
  // ==========================================
  let activeRedactPage = 1;
  let redactRect = null; // { x, y, w, h }

  async function initRedactionWorkspace() {
    const previewContainer = document.getElementById('pages-preview-grid');
    previewContainer.innerHTML = '';
    previewContainer.style = 'position: relative; max-width: 100%; display: flex; justify-content: center;';

    const canvas = document.createElement('canvas');
    canvas.id = 'redact-preview-canvas';
    canvas.style = 'border: 1px solid var(--border-color); background: white; max-width: 100%; cursor: crosshair;';
    previewContainer.appendChild(canvas);

    await PdfHelper.renderPage(pdfData.doc, activeRedactPage, canvas, 1.0);

    // Bounding Box Drawing Logic
    let startX = 0, startY = 0, isDrawing = false;
    const overlayDiv = document.createElement('div');
    overlayDiv.id = 'redact-overlay-box';
    overlayDiv.style = 'position: absolute; border: 2px dashed red; background: rgba(255, 0, 0, 0.25); pointer-events: none; display: none;';
    previewContainer.appendChild(overlayDiv);

    canvas.onmousedown = (e) => {
      isDrawing = true;
      const rect = canvas.getBoundingClientRect();
      startX = e.clientX - rect.left;
      startY = e.clientY - rect.top;
      
      overlayDiv.style.left = `${startX}px`;
      overlayDiv.style.top = `${startY}px`;
      overlayDiv.style.width = '0px';
      overlayDiv.style.height = '0px';
      overlayDiv.style.display = 'block';
    };

    canvas.onmousemove = (e) => {
      if (!isDrawing) return;
      const rect = canvas.getBoundingClientRect();
      const currX = e.clientX - rect.left;
      const currY = e.clientY - rect.top;
      
      const w = currX - startX;
      const h = currY - startY;

      overlayDiv.style.width = `${Math.abs(w)}px`;
      overlayDiv.style.height = `${Math.abs(h)}px`;
      overlayDiv.style.left = `${w < 0 ? currX : startX}px`;
      overlayDiv.style.top = `${h < 0 ? currY : startY}px`;
    };

    canvas.onmouseup = (e) => {
      if (!isDrawing) return;
      isDrawing = false;
      const rect = canvas.getBoundingClientRect();
      const currX = e.clientX - rect.left;
      const currY = e.clientY - rect.top;
      
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const x = Math.min(startX, currX) * scaleX;
      const y = canvas.height - (Math.max(startY, currY) * scaleY);
      const w = Math.abs(currX - startX) * scaleX;
      const h = Math.abs(currY - startY) * scaleY;

      redactRect = { x, y, w, h };
      window.showToast('Redaction area designated. Click Redact and Save.', 'success');
    };

    // Render page select
    const select = document.getElementById('redact-page-select');
    if (select) {
      select.innerHTML = '';
      for (let i = 1; i <= pdfData.doc.numPages; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.innerText = `Page ${i}`;
        select.appendChild(opt);
      }
      select.onchange = async () => {
        activeRedactPage = parseInt(select.value);
        overlayDiv.style.display = 'none';
        redactRect = null;
        await PdfHelper.renderPage(pdfData.doc, activeRedactPage, canvas, 1.0);
      };
    }
  }

  const redactBtn = document.getElementById('apply-redaction-btn');
  if (redactBtn) {
    redactBtn.onclick = async () => {
      if (!redactRect) {
        window.showToast('Please select a bounding box area on the preview canvas.', 'warning');
        return;
      }
      try {
        window.showToast('Redacting document text...', 'info');
        const srcDoc = await window.PDFLib.PDFDocument.load(pdfData.arrayBuffer, { password: pdfData.password });
        const pages = srcDoc.getPages();
        const page = pages[activeRedactPage - 1];

        // Draw black rectangle to hide the content
        page.drawRectangle({
          x: redactRect.x,
          y: redactRect.y,
          width: redactRect.w,
          height: redactRect.h,
          color: window.PDFLib.rgb(0, 0, 0)
        });

        const redactedBytes = await srcDoc.save();
        downloadBlob(new Blob([redactedBytes], { type: 'application/pdf' }), `redacted_document.pdf`);
        window.showToast('Area redacted successfully!', 'success');
        loadSingleFile(new File([redactedBytes], pdfData.file.name, { type: 'application/pdf' }));
      } catch (err) {
        console.error(err);
        window.showToast('Failed to redact area.', 'danger');
      }
    };
  }

  // ==========================================
  // 6. FORM FILLER
  // ==========================================
  async function initFormFiller() {
    const listContainer = document.getElementById('form-fields-container');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    try {
      const srcDoc = await window.PDFLib.PDFDocument.load(pdfData.arrayBuffer, { password: pdfData.password });
      const form = srcDoc.getForm();
      const fields = form.getFields();

      if (fields.length === 0) {
        listContainer.innerHTML = `<p style="color: var(--text-secondary); text-align: center;">No interactive form fields found in this PDF.</p>`;
        return;
      }

      formFieldsList = fields;

      fields.forEach((field) => {
        const name = field.getName();
        const fieldWrapper = document.createElement('div');
        fieldWrapper.style = 'display: flex; flex-direction: column; gap: 8px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;';

        const label = document.createElement('label');
        label.innerText = name;
        label.style = 'font-weight: 500; font-size: 0.9rem;';
        fieldWrapper.appendChild(label);

        // Check instance type of the field
        if (field instanceof window.PDFLib.PDFTextField) {
          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'pdf-form-control';
          input.dataset.name = name;
          input.value = field.getText() || '';
          input.style = 'width: 100%; padding: 10px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-primary);';
          fieldWrapper.appendChild(input);
        } else if (field instanceof window.PDFLib.PDFCheckBox) {
          const checkboxLabel = document.createElement('label');
          checkboxLabel.style = 'display: flex; align-items: center; gap: 8px; cursor: pointer;';
          const input = document.createElement('input');
          input.type = 'checkbox';
          input.className = 'pdf-form-control';
          input.dataset.name = name;
          input.checked = field.isChecked();
          checkboxLabel.appendChild(input);
          checkboxLabel.appendChild(document.createTextNode('Checked'));
          fieldWrapper.appendChild(checkboxLabel);
        } else if (field instanceof window.PDFLib.PDFDropdown) {
          const select = document.createElement('select');
          select.className = 'pdf-form-control';
          select.dataset.name = name;
          select.style = 'width: 100%; padding: 10px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-primary);';
          const options = field.getOptions();
          options.forEach(opt => {
            const optEl = document.createElement('option');
            optEl.value = opt;
            optEl.innerText = opt;
            if (field.getSelected().includes(opt)) optEl.selected = true;
            select.appendChild(optEl);
          });
          fieldWrapper.appendChild(select);
        }

        listContainer.appendChild(fieldWrapper);
      });

      // Render previews
      if (document.getElementById('pages-preview-grid')) {
        await PdfHelper.generateThumbnails(pdfData.doc, 'pages-preview-grid');
      }

    } catch (err) {
      console.error(err);
      listContainer.innerHTML = `<p style="color: var(--danger);">Failed to parse form fields.</p>`;
    }
  }

  const fillBtn = document.getElementById('save-form-btn');
  if (fillBtn) {
    fillBtn.onclick = async () => {
      try {
        window.showToast('Saving form fields...', 'info');
        const srcDoc = await window.PDFLib.PDFDocument.load(pdfData.arrayBuffer, { password: pdfData.password });
        const form = srcDoc.getForm();

        // Query input fields
        const controls = document.querySelectorAll('.pdf-form-control');
        controls.forEach((ctrl) => {
          const name = ctrl.dataset.name;
          const field = form.getField(name);

          if (field instanceof window.PDFLib.PDFTextField) {
            field.setText(ctrl.value);
          } else if (field instanceof window.PDFLib.PDFCheckBox) {
            if (ctrl.checked) field.check();
            else field.uncheck();
          } else if (field instanceof window.PDFLib.PDFDropdown) {
            field.select(ctrl.value);
          }
        });

        const filledBytes = await srcDoc.save();
        downloadBlob(new Blob([filledBytes], { type: 'application/pdf' }), `${pdfData.file.name.replace('.pdf', '')}_filled.pdf`);
        window.showToast('Form fields saved!', 'success');
        loadSingleFile(new File([filledBytes], pdfData.file.name, { type: 'application/pdf' }));
      } catch (err) {
        console.error(err);
        window.showToast('Failed to save filled form.', 'danger');
      }
    };
  }

});

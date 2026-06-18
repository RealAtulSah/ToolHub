/**
 * ToolHub Pro - PDF Advanced & Creative Engine
 * Handles Watermarking, Watermark Removal, OCR document scanning, Image extraction, WebCam Scan, and Batch Processing.
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
  let captureStream = null;
  let capturedImages = []; // For Scan to PDF
  let batchFiles = []; // For Batch processor

  // Identify Tool Page
  const isWatermark = window.location.pathname.includes('watermark.html');
  const isRemoveWatermark = window.location.pathname.includes('remove-watermark');
  const isOcr = window.location.pathname.includes('ocr');
  const isExtractImages = window.location.pathname.includes('extract-images');
  const isScan = window.location.pathname.includes('scan');
  const isBatch = window.location.pathname.includes('batch-processor');

  // Load PDFLib
  try {
    await PdfHelper.loadScript(PdfHelper.CDNS.PDF_LIB);
  } catch (err) {
    console.error('Failed to load PDF-Lib', err);
  }

  // Set up upload listeners
  const acceptsMultiple = isBatch;
  PdfHelper.setupDragAndDrop('upload-zone', 'file-input', async (files) => {
    if (isBatch) {
      const arrayFiles = Array.isArray(files) ? files : [files];
      for (const f of arrayFiles) {
        if (f.type !== 'application/pdf') {
          window.showToast(`"${f.name}" is not a PDF file.`, 'warning');
          continue;
        }
        batchFiles.push(f);
      }
      renderBatchList();
    } else {
      const file = Array.isArray(files) ? files[0] : files;
      if (file.type !== 'application/pdf') {
        window.showToast('Please select a valid PDF file.', 'danger');
        return;
      }
      await loadPdfFile(file);
    }
  }, acceptsMultiple);

  // Browse files fallback inside Upload zone button
  const browseBtn = uploadZone.querySelector('button');
  if (browseBtn) {
    browseBtn.onclick = (e) => {
      e.stopPropagation();
      fileInput.click();
    };
  }

  // Scan to PDF camera initializer (Triggered directly on workspace display)
  if (isScan) {
    uploadZone.style.display = 'none';
    workspace.style.display = 'grid';
    initCameraScan();
  }

  /**
   * Load source PDF
   */
  async function loadPdfFile(file) {
    try {
      window.showToast('Loading PDF document...', 'info');
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

      // Previews
      if (document.getElementById('pages-preview-grid')) {
        await PdfHelper.generateThumbnails(pdfData.doc, 'pages-preview-grid');
      }

    } catch (err) {
      console.error(err);
      window.showToast(err.message || 'Error loading PDF.', 'danger');
      resetWorkspace();
    }
  }

  function downloadBlob(blob, filename) {
    const url = PdfHelper.createObjectUrl(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function resetWorkspace() {
    PdfHelper.cleanMemory();
    pdfData = null;
    batchFiles = [];
    capturedImages = [];
    if (captureStream) {
      captureStream.getTracks().forEach(t => t.stop());
      captureStream = null;
    }

    if (fileInput) fileInput.value = '';
    if (!isScan && uploadZone) uploadZone.style.display = 'block';
    if (!isScan && workspace) workspace.style.display = 'none';
  }

  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.onclick = () => resetWorkspace();
  }

  // Render Batch list
  function renderBatchList() {
    const listContainer = document.getElementById('batch-files-list');
    if (!listContainer) return;

    if (batchFiles.length === 0) {
      listContainer.innerHTML = `<p style="color: var(--text-secondary); text-align: center;">No PDF documents loaded.</p>`;
      workspace.style.display = 'none';
      return;
    }

    uploadZone.style.display = 'none';
    workspace.style.display = 'grid';

    listContainer.innerHTML = batchFiles.map((file, idx) => `
      <div class="glass-panel" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 1.5rem;"></span>
          <div>
            <div style="font-weight: 600;">${file.name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${PdfHelper.formatSize(file.size)}</div>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm remove-file" data-index="${idx}" style="color: var(--danger);">✕</button>
      </div>
    `).join('');

    listContainer.querySelectorAll('.remove-file').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.index);
        batchFiles.splice(idx, 1);
        renderBatchList();
      };
    });
  }

  // ==========================================
  // 1. ADD WATERMARK
  // ==========================================
  const watermarkBtn = document.getElementById('add-watermark-btn');
  if (watermarkBtn) {
    watermarkBtn.onclick = async () => {
      const text = document.getElementById('watermark-text').value || 'CONFIDENTIAL';
      const opacity = parseFloat(document.getElementById('watermark-opacity').value) || 0.3;

      try {
        window.showToast('Overlaying watermark...', 'info');
        const srcDoc = await window.PDFLib.PDFDocument.load(pdfData.arrayBuffer, { password: pdfData.password });
        const pages = srcDoc.getPages();
        const font = await srcDoc.embedFont(window.PDFLib.StandardFonts.HelveticaBold);

        pages.forEach((page) => {
          const { width, height } = page.getSize();
          
          // Draw diagonal translucent watermark
          page.drawText(text, {
            x: width / 2 - (text.length * 10),
            y: height / 2,
            size: 48,
            font,
            color: window.PDFLib.rgb(0.7, 0.7, 0.7),
            opacity,
            rotate: window.PDFLib.degrees(45)
          });
        });

        const watermarkedBytes = await srcDoc.save();
        downloadBlob(new Blob([watermarkedBytes], { type: 'application/pdf' }), `${pdfData.file.name.replace('.pdf', '')}_watermarked.pdf`);
        window.showToast('Watermark added successfully!', 'success');
        loadSingleFile(new File([watermarkedBytes], pdfData.file.name, { type: 'application/pdf' }));
      } catch (err) {
        console.error(err);
        window.showToast('Failed to add watermark.', 'danger');
      }
    };
  }

  // ==========================================
  // 2. REMOVE WATERMARK
  // ==========================================
  const removeWatermarkBtn = document.getElementById('remove-watermark-btn');
  if (removeWatermarkBtn) {
    removeWatermarkBtn.onclick = async () => {
      const phrase = document.getElementById('watermark-phrase').value;
      if (!phrase.trim()) {
        window.showToast('Please specify the watermark text phrase to strip.', 'warning');
        return;
      }
      try {
        window.showToast('Scrubbing page content streams...', 'info');
        const srcDoc = await window.PDFLib.PDFDocument.load(pdfData.arrayBuffer, { password: pdfData.password });
        const pages = srcDoc.getPages();

        // High-level content stream parser
        // Searches for /Text blocks containing the pattern and scrubs them
        pages.forEach((page) => {
          const streams = page.node.Contents();
          if (!streams) return;

          const streamArray = Array.isArray(streams) ? streams : [streams];
          streamArray.forEach((streamRef) => {
            const stream = srcDoc.context.lookup(streamRef);
            if (stream && stream.contents) {
              const decoder = new TextDecoder('utf-8');
              const textContent = decoder.decode(stream.contents);
              
              // Simple pattern matching for PDF text runs containing the phrase
              // Replacing text operators like (Phrase) Tj or [ (Phra) -10 (se) ] TJ
              if (textContent.includes(phrase)) {
                // Strip occurrences by replacing stream bytes
                const regex = new RegExp(`\\(.*?${phrase}.*?\\)\\s*Tj`, 'gi');
                const cleanedText = textContent.replace(regex, '() Tj');
                const encoder = new TextEncoder();
                stream.contents = encoder.encode(cleanedText);
              }
            }
          });
        });

        const cleanedBytes = await srcDoc.save();
        downloadBlob(new Blob([cleanedBytes], { type: 'application/pdf' }), `${pdfData.file.name.replace('.pdf', '')}_stripped.pdf`);
        window.showToast('Watermark stripped successfully!', 'success');
        loadSingleFile(new File([cleanedBytes], pdfData.file.name, { type: 'application/pdf' }));
      } catch (err) {
        console.error(err);
        window.showToast('Failed to strip watermark.', 'danger');
      }
    };
  }

  // ==========================================
  // 3. PDF OCR
  // ==========================================
  const ocrBtn = document.getElementById('pdf-ocr-btn');
  if (ocrBtn) {
    ocrBtn.onclick = async () => {
      try {
        window.showToast('Loading OCR engine...', 'info');
        await PdfHelper.loadScript(PdfHelper.CDNS.TESSERACT);

        const progressContainer = document.getElementById('progress-container');
        const progressBarFill = document.getElementById('progress-bar-fill');
        const progressStatus = document.getElementById('progress-status');
        
        progressContainer.style.display = 'flex';
        progressStatus.innerText = 'Initializing OCR core...';
        progressBarFill.style.width = '0%';

        let fullExtractedText = "";
        const canvas = document.createElement('canvas');

        for (let i = 1; i <= pdfData.doc.numPages; i++) {
          progressStatus.innerText = `OCR scanning page ${i} of ${pdfData.doc.numPages}...`;
          progressBarFill.style.width = `${Math.round((i / pdfData.doc.numPages) * 100)}%`;

          await PdfHelper.renderPage(pdfData.doc, i, canvas, 2.0); // high res render
          
          const result = await window.Tesseract.recognize(canvas, 'eng');
          if (result && result.data && result.data.text) {
            fullExtractedText += `--- Page ${i} ---\n` + result.data.text.trim() + '\n\n';
          }
        }

        progressContainer.style.display = 'none';

        // Save as TXT
        downloadBlob(new Blob([fullExtractedText], { type: 'text/plain;charset=utf-8' }), `${pdfData.file.name.replace('.pdf', '')}_ocr.txt`);
        window.showToast('OCR scanned text saved successfully!', 'success');
      } catch (err) {
        console.error(err);
        window.showToast('OCR scanning failed.', 'danger');
        document.getElementById('progress-container').style.display = 'none';
      }
    };
  }

  // ==========================================
  // 4. EXTRACT IMAGES FROM PDF
  // ==========================================
  const extractImgBtn = document.getElementById('extract-images-btn');
  if (extractImgBtn) {
    extractImgBtn.onclick = async () => {
      try {
        window.showToast('Searching raw image streams...', 'info');
        const srcDoc = await window.PDFLib.PDFDocument.load(pdfData.arrayBuffer, { password: pdfData.password });
        
        await PdfHelper.loadScript(PdfHelper.CDNS.JSZIP);
        const zip = new window.JSZip();
        let imageCount = 0;

        for (const [ref, obj] of srcDoc.context.indirectObjects.entries()) {
          if (obj instanceof window.PDFLib.PDFRawStream) {
            const dict = obj.dict;
            const subtype = dict.get(window.PDFLib.PDFName.of('Subtype'));
            if (subtype === window.PDFLib.PDFName.of('Image')) {
              imageCount++;
              const bytes = obj.contents;
              
              // Deduce extensions (filter jpeg / png signatures)
              let ext = 'jpg';
              if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) {
                ext = 'png';
              }
              zip.file(`extracted_image_${imageCount}.${ext}`, bytes);
            }
          }
        }

        if (imageCount === 0) {
          window.showToast('No embedded image objects found in the PDF structure.', 'info');
          return;
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, `${pdfData.file.name.replace('.pdf', '')}_extracted_images.zip`);
        window.showToast(`Extracted ${imageCount} images into ZIP!`, 'success');
      } catch (err) {
        console.error(err);
        window.showToast('Failed to extract images.', 'danger');
      }
    };
  }

  // ==========================================
  // 5. SCAN TO PDF (WEBCAM CAPTURE)
  // ==========================================
  async function initCameraScan() {
    const video = document.getElementById('scanner-video');
    if (!video) return;

    try {
      captureStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      video.srcObject = stream;
      video.play();
    } catch (err) {
      console.error(err);
      // Fallback fallback to webcam if environment camera is missing
      navigator.mediaDevices.getUserMedia({ video: true }).then((st) => {
        captureStream = st;
        video.srcObject = st;
        video.play();
      }).catch((e) => {
        console.error(e);
        window.showToast('Failed to access camera media stream.', 'danger');
      });
    }

    document.getElementById('snap-btn').onclick = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/jpeg');
      capturedImages.push(dataUrl);
      renderCapturedThumbs();
      window.showToast(`Snapshot added as Page ${capturedImages.length}.`, 'success');
    };

    document.getElementById('compile-scan-btn').onclick = async () => {
      if (capturedImages.length === 0) {
        window.showToast('Please snap at least one page.', 'warning');
        return;
      }
      try {
        window.showToast('Compiling pages to PDF...', 'info');
        await PdfHelper.loadScript(PdfHelper.CDNS.JS_PDF);
        const doc = new window.jspdf.jsPDF();

        for (let i = 0; i < capturedImages.length; i++) {
          if (i > 0) doc.addPage();
          doc.addImage(capturedImages[i], 'JPEG', 0, 0, 210, 297);
        }

        doc.save('scanned_document.pdf');
        window.showToast('Scanned PDF downloaded successfully!', 'success');
        resetWorkspace();
      } catch (err) {
        console.error(err);
        window.showToast('Compilation failed.', 'danger');
      }
    };
  }

  function renderCapturedThumbs() {
    const grid = document.getElementById('scanned-thumbs-grid');
    if (!grid) return;
    grid.innerHTML = capturedImages.map((img, idx) => `
      <div style="position: relative; display: inline-block; padding: 4px; border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
        <img src="${img}" style="max-height: 80px; border-radius: var(--radius-sm);">
        <div style="font-size: 0.75rem; text-align: center; margin-top: 4px;">Page ${idx + 1}</div>
        <button onclick="window.removeCaptured(${idx})" style="position: absolute; top: -5px; right: -5px; background: var(--danger); border: none; border-radius: 50%; color: white; width: 18px; height: 18px; font-size: 10px; cursor: pointer;">✕</button>
      </div>
    `).join('');
  }

  window.removeCaptured = (idx) => {
    capturedImages.splice(idx, 1);
    renderCapturedThumbs();
  };

  // ==========================================
  // 6. BATCH PDF PROCESSOR
  // ==========================================
  const batchBtn = document.getElementById('run-batch-btn');
  if (batchBtn) {
    batchBtn.onclick = async () => {
      const action = document.getElementById('batch-action').value; // 'compress', 'protect', 'watermark'
      const pwd = document.getElementById('batch-password').value;
      const wmText = document.getElementById('batch-watermark-text').value || 'CONFIDENTIAL';

      if (batchFiles.length === 0) {
        window.showToast('No documents added.', 'warning');
        return;
      }

      if (action === 'protect' && !pwd) {
        window.showToast('Please specify an encryption password.', 'warning');
        return;
      }

      try {
        window.showToast('Processing batch files...', 'info');
        await PdfHelper.loadScript(PdfHelper.CDNS.JSZIP);
        const zip = new window.JSZip();

        for (const file of batchFiles) {
          const loaded = await PdfHelper.loadPdf(file);
          const doc = await window.PDFLib.PDFDocument.load(loaded.arrayBuffer, { password: loaded.password });

          if (action === 'compress') {
            // Stream compression
            const bytes = await doc.save({ useObjectStreams: true });
            zip.file(`${file.name.replace('.pdf', '')}_compressed.pdf`, bytes);
          } else if (action === 'protect') {
            // Password protect
            const bytes = await doc.save({
              userPassword: pwd,
              ownerPassword: pwd
            });
            zip.file(`${file.name.replace('.pdf', '')}_protected.pdf`, bytes);
          } else if (action === 'watermark') {
            // Draw watermark text
            const pages = doc.getPages();
            const font = await doc.embedFont(window.PDFLib.StandardFonts.HelveticaBold);
            pages.forEach(p => {
              const { width, height } = p.getSize();
              p.drawText(wmText, {
                x: width / 2 - (wmText.length * 10),
                y: height / 2,
                size: 44,
                font,
                color: window.PDFLib.rgb(0.7, 0.7, 0.7),
                opacity: 0.3,
                rotate: window.PDFLib.degrees(45)
              });
            });
            const bytes = await doc.save();
            zip.file(`${file.name.replace('.pdf', '')}_watermarked.pdf`, bytes);
          }
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, 'batch_processed_documents.zip');
        window.showToast('Batch processing complete! ZIP downloaded.', 'success');
        resetWorkspace();
      } catch (err) {
        console.error(err);
        window.showToast('Batch processing failed.', 'danger');
      }
    };
  }

});

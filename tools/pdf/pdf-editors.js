/**
 * ToolHub Pro - PDF Editors Engine
 * Handles Viewer, Editor, Highlighter, Annotation Tool, Compare PDFs, and Size Analyzer.
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
  let pdfDataB = null; // For Compare PDFs (second document)
  let currentViewerPage = 1;
  let viewerScale = 1.0;
  let activeDrawingColor = '#ff0000';
  let activeToolMode = 'draw'; // 'draw' or 'text'
  let textAnnotations = []; // [{ page, x, y, text }]
  let stickyNotes = []; // [{ page, x, y, comment }]
  let highlightRects = []; // [{ page, x, y, w, h }]
  let drawingPaths = {}; // { pageNum: [ [{x, y}, ...] ] }

  // Identify Active Tool Page
  const isViewer = window.location.pathname.includes('viewer');
  const isEditor = window.location.pathname.includes('editor');
  const isHighlighter = window.location.pathname.includes('highlighter');
  const isAnnotate = window.location.pathname.includes('annotate');
  const isCompare = window.location.pathname.includes('compare');
  const isSizeAnalyzer = window.location.pathname.includes('size-analyzer');

  // Load PDFLib
  try {
    await PdfHelper.loadScript(PdfHelper.CDNS.PDF_LIB);
  } catch (err) {
    console.error('Failed to load PDF-Lib', err);
  }

  // Set up drag and drop
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

      // Workspace specific loaders
      if (isViewer) {
        initViewerWorkspace();
      } else if (isEditor) {
        initEditorWorkspace();
      } else if (isHighlighter) {
        initHighlighterWorkspace();
      } else if (isAnnotate) {
        initAnnotatorWorkspace();
      } else if (isSizeAnalyzer) {
        initSizeAnalyzerWorkspace();
      } else if (isCompare) {
        initCompareWorkspaceA();
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
    pdfDataB = null;
    currentViewerPage = 1;
    viewerScale = 1.0;
    textAnnotations = [];
    stickyNotes = [];
    highlightRects = [];
    drawingPaths = {};

    if (fileInput) fileInput.value = '';
    if (uploadZone) uploadZone.style.display = 'block';
    if (workspace) workspace.style.display = 'none';
  }

  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.onclick = () => resetWorkspace();
  }

  // ==========================================
  // 1. PDF VIEWERS
  // ==========================================
  const renderViewerPage = async () => {
    const canvas = document.getElementById('viewer-canvas');
    if (!canvas || !pdfData) return;

    await PdfHelper.renderPage(pdfData.doc, currentViewerPage, canvas, viewerScale);
    document.getElementById('current-page-num').innerText = currentViewerPage;
    document.getElementById('total-pages-count').innerText = pdfData.doc.numPages;
  };

  function initViewerWorkspace() {
    currentViewerPage = 1;
    viewerScale = 1.0;
    renderViewerPage();

    document.getElementById('prev-page-btn').onclick = () => {
      if (currentViewerPage > 1) {
        currentViewerPage--;
        renderViewerPage();
      }
    };

    document.getElementById('next-page-btn').onclick = () => {
      if (currentViewerPage < pdfData.doc.numPages) {
        currentViewerPage++;
        renderViewerPage();
      }
    };

    document.getElementById('zoom-in-btn').onclick = () => {
      if (viewerScale < 3.0) {
        viewerScale += 0.2;
        renderViewerPage();
      }
    };

    document.getElementById('zoom-out-btn').onclick = () => {
      if (viewerScale > 0.6) {
        viewerScale -= 0.2;
        renderViewerPage();
      }
    };
  }

  // ==========================================
  // 2. PDF EDITOR
  // ==========================================
  function initEditorWorkspace() {
    currentViewerPage = 1;
    viewerScale = 1.0;
    setupDrawingLayer();

    document.getElementById('color-picker-input').onchange = (e) => {
      activeDrawingColor = e.target.value;
    };

    document.getElementById('tool-mode-select').onchange = (e) => {
      activeToolMode = e.target.value;
    };

    document.getElementById('editor-prev-btn').onclick = () => {
      if (currentViewerPage > 1) {
        currentViewerPage--;
        setupDrawingLayer();
      }
    };

    document.getElementById('editor-next-btn').onclick = () => {
      if (currentViewerPage < pdfData.doc.numPages) {
        currentViewerPage++;
        setupDrawingLayer();
      }
    };
  }

  async function setupDrawingLayer() {
    const canvas = document.getElementById('editor-canvas');
    const drawCanvas = document.getElementById('drawing-canvas-overlay');
    if (!canvas || !drawCanvas) return;

    // 1. Render PDF page
    await PdfHelper.renderPage(pdfData.doc, currentViewerPage, canvas, viewerScale);

    // 2. Size overlay drawing canvas to match PDF page canvas
    drawCanvas.width = canvas.width;
    drawCanvas.height = canvas.height;
    const ctx = drawCanvas.getContext('2d');
    ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);

    // Draw pre-existing paths for this page
    if (drawingPaths[currentViewerPage]) {
      drawingPaths[currentViewerPage].forEach((path) => {
        if (path.length < 2) return;
        ctx.beginPath();
        ctx.strokeStyle = path[0].color;
        ctx.lineWidth = 3;
        ctx.moveTo(path[0].x, path[0].y);
        for (let j = 1; j < path.length; j++) {
          ctx.lineTo(path[j].x, path[j].y);
        }
        ctx.stroke();
      });
    }

    let drawing = false;
    let currentPath = [];

    const getPos = (e) => {
      const rect = drawCanvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (drawCanvas.width / rect.width),
        y: (e.clientY - rect.top) * (drawCanvas.height / rect.height)
      };
    };

    drawCanvas.onmousedown = (e) => {
      const pos = getPos(e);
      if (activeToolMode === 'text') {
        const textVal = prompt('Enter text to add to this page:');
        if (textVal) {
          textAnnotations.push({
            page: currentViewerPage,
            x: pos.x,
            y: canvas.height - pos.y, // relative to bottom-left (PDF scale)
            text: textVal,
            color: activeDrawingColor
          });
          ctx.font = '16px Arial';
          ctx.fillStyle = activeDrawingColor;
          ctx.fillText(textVal, pos.x, pos.y);
        }
      } else {
        drawing = true;
        currentPath = [{ x: pos.x, y: pos.y, color: activeDrawingColor }];
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.strokeStyle = activeDrawingColor;
        ctx.lineWidth = 3;
      }
    };

    drawCanvas.onmousemove = (e) => {
      if (!drawing) return;
      const pos = getPos(e);
      currentPath.push(pos);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    };

    drawCanvas.onmouseup = () => {
      if (drawing) {
        drawing = false;
        if (!drawingPaths[currentViewerPage]) drawingPaths[currentViewerPage] = [];
        drawingPaths[currentViewerPage].push(currentPath);
      }
    };

    // Update page numbers
    document.getElementById('editor-page-stat').innerText = `Page ${currentViewerPage} of ${pdfData.doc.numPages}`;
  }

  const saveEditsBtn = document.getElementById('save-editor-btn');
  if (saveEditsBtn) {
    saveEditsBtn.onclick = async () => {
      try {
        window.showToast('Compiling annotations...', 'info');
        const srcDoc = await window.PDFLib.PDFDocument.load(pdfData.arrayBuffer, { password: pdfData.password });
        const pages = srcDoc.getPages();
        const font = await srcDoc.embedFont(window.PDFLib.StandardFonts.Helvetica);

        // 1. Draw Text Annotations
        textAnnotations.forEach((ann) => {
          const page = pages[ann.page - 1];
          // Hex color parser
          const r = parseInt(ann.color.slice(1, 3), 16) / 255;
          const g = parseInt(ann.color.slice(3, 5), 16) / 255;
          const b = parseInt(ann.color.slice(5, 7), 16) / 255;

          page.drawText(ann.text, {
            x: ann.x,
            y: ann.y,
            size: 16,
            font,
            color: window.PDFLib.rgb(r, g, b)
          });
        });

        // 2. Draw Freehand Strokes
        for (let pNum in drawingPaths) {
          const page = pages[parseInt(pNum) - 1];
          const { width, height } = page.getSize();
          
          const canvasEl = document.getElementById('editor-canvas');
          const factorX = width / canvasEl.width;
          const factorY = height / canvasEl.height;

          drawingPaths[pNum].forEach((path) => {
            if (path.length < 2) return;
            // Parse color
            const cStr = path[0].color;
            const r = parseInt(cStr.slice(1, 3), 16) / 255;
            const g = parseInt(cStr.slice(3, 5), 16) / 255;
            const b = parseInt(cStr.slice(5, 7), 16) / 255;

            // Approximate line drawing by chaining small lines
            for (let i = 0; i < path.length - 1; i++) {
              page.drawLine({
                start: { x: path[i].x * factorX, y: (canvasEl.height - path[i].y) * factorY },
                end: { x: path[i + 1].x * factorX, y: (canvasEl.height - path[i + 1].y) * factorY },
                thickness: 3,
                color: window.PDFLib.rgb(r, g, b)
              });
            }
          });
        }

        const compiledBytes = await srcDoc.save();
        downloadBlob(new Blob([compiledBytes], { type: 'application/pdf' }), `edited_document.pdf`);
        window.showToast('Annotations burned in PDF successfully!', 'success');
        loadSingleFile(new File([compiledBytes], pdfData.file.name, { type: 'application/pdf' }));
      } catch (err) {
        console.error(err);
        window.showToast('Saving annotations failed.', 'danger');
      }
    };
  }

  // ==========================================
  // 3. PDF HIGHLIGHTER
  // ==========================================
  function initHighlighterWorkspace() {
    currentViewerPage = 1;
    viewerScale = 1.0;
    setupHighlighterLayer();

    document.getElementById('highlighter-prev-btn').onclick = () => {
      if (currentViewerPage > 1) {
        currentViewerPage--;
        setupHighlighterLayer();
      }
    };

    document.getElementById('highlighter-next-btn').onclick = () => {
      if (currentViewerPage < pdfData.doc.numPages) {
        currentViewerPage++;
        setupHighlighterLayer();
      }
    };
  }

  async function setupHighlighterLayer() {
    const canvas = document.getElementById('highlighter-canvas');
    const overlay = document.getElementById('highlighter-overlay');
    if (!canvas || !overlay) return;

    await PdfHelper.renderPage(pdfData.doc, currentViewerPage, canvas, viewerScale);

    overlay.width = canvas.width;
    overlay.height = canvas.height;
    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // Render highlights
    highlightRects.forEach((rect) => {
      if (rect.page === currentViewerPage) {
        ctx.fillStyle = 'rgba(255, 255, 0, 0.4)';
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      }
    });

    let activeDraw = false;
    let startX = 0, startY = 0;

    const getPos = (e) => {
      const rect = overlay.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (overlay.width / rect.width),
        y: (e.clientY - rect.top) * (overlay.height / rect.height)
      };
    };

    overlay.onmousedown = (e) => {
      activeDraw = true;
      const pos = getPos(e);
      startX = pos.x;
      startY = pos.y;
    };

    overlay.onmousemove = (e) => {
      if (!activeDraw) return;
      const pos = getPos(e);
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      
      // Re-render other highlights
      highlightRects.forEach((rect) => {
        if (rect.page === currentViewerPage) {
          ctx.fillStyle = 'rgba(255, 255, 0, 0.4)';
          ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        }
      });

      // Draw current preview rectangle
      ctx.fillStyle = 'rgba(255, 255, 0, 0.4)';
      ctx.fillRect(startX, startY, pos.x - startX, pos.y - startY);
    };

    overlay.onmouseup = (e) => {
      if (activeDraw) {
        activeDraw = false;
        const pos = getPos(e);
        highlightRects.push({
          page: currentViewerPage,
          x: Math.min(startX, pos.x),
          y: Math.min(startY, pos.y),
          w: Math.abs(pos.x - startX),
          h: Math.abs(pos.y - startY)
        });
        window.showToast('Text highlighted.', 'success');
      }
    };

    document.getElementById('highlighter-page-stat').innerText = `Page ${currentViewerPage} of ${pdfData.doc.numPages}`;
  }

  const saveHighlightsBtn = document.getElementById('save-highlighter-btn');
  if (saveHighlightsBtn) {
    saveHighlightsBtn.onclick = async () => {
      try {
        window.showToast('Injecting highlight layers...', 'info');
        const srcDoc = await window.PDFLib.PDFDocument.load(pdfData.arrayBuffer, { password: pdfData.password });
        const pages = srcDoc.getPages();
        const canvasEl = document.getElementById('highlighter-canvas');

        highlightRects.forEach((rect) => {
          const page = pages[rect.page - 1];
          const { width, height } = page.getSize();
          
          const factorX = width / canvasEl.width;
          const factorY = height / canvasEl.height;

          // Draw yellow transparent overlay rectangle
          page.drawRectangle({
            x: rect.x * factorX,
            y: (canvasEl.height - (rect.y + rect.h)) * factorY,
            width: rect.w * factorX,
            height: rect.h * factorY,
            color: window.PDFLib.rgb(1, 1, 0),
            opacity: 0.4
          });
        });

        const compiledBytes = await srcDoc.save();
        downloadBlob(new Blob([compiledBytes], { type: 'application/pdf' }), `highlighted_document.pdf`);
        window.showToast('Highlights saved!', 'success');
        loadSingleFile(new File([compiledBytes], pdfData.file.name, { type: 'application/pdf' }));
      } catch (err) {
        console.error(err);
        window.showToast('Failed to save highlights.', 'danger');
      }
    };
  }

  // ==========================================
  // 4. ANNOTATION / STICKY NOTES TOOL
  // ==========================================
  function initAnnotatorWorkspace() {
    currentViewerPage = 1;
    viewerScale = 1.0;
    setupAnnotatorLayer();

    document.getElementById('annotator-prev-btn').onclick = () => {
      if (currentViewerPage > 1) {
        currentViewerPage--;
        setupAnnotatorLayer();
      }
    };

    document.getElementById('annotator-next-btn').onclick = () => {
      if (currentViewerPage < pdfData.doc.numPages) {
        currentViewerPage++;
        setupAnnotatorLayer();
      }
    };
  }

  async function setupAnnotatorLayer() {
    const canvas = document.getElementById('annotator-canvas');
    const overlay = document.getElementById('annotator-overlay');
    if (!canvas || !overlay) return;

    await PdfHelper.renderPage(pdfData.doc, currentViewerPage, canvas, viewerScale);

    overlay.width = canvas.width;
    overlay.height = canvas.height;
    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // Draw sticky notes
    renderStickyNotesList();

    const getPos = (e) => {
      const rect = overlay.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (overlay.width / rect.width),
        y: (e.clientY - rect.top) * (overlay.height / rect.height)
      };
    };

    overlay.onclick = (e) => {
      const pos = getPos(e);
      const text = prompt('Add sticky comment:');
      if (text) {
        stickyNotes.push({
          page: currentViewerPage,
          x: pos.x,
          y: canvas.height - pos.y, // relative to bottom-left
          comment: text
        });
        setupAnnotatorLayer();
      }
    };

    document.getElementById('annotator-page-stat').innerText = `Page ${currentViewerPage} of ${pdfData.doc.numPages}`;
  }

  function renderStickyNotesList() {
    const ctx = document.getElementById('annotator-overlay').getContext('2d');
    const sidebar = document.getElementById('comments-sidebar');
    if (!sidebar) return;

    sidebar.innerHTML = '';
    const filtered = stickyNotes.filter(n => n.page === currentViewerPage);

    if (filtered.length === 0) {
      sidebar.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.9rem;">Click on the page canvas to place a sticky note.</p>';
      return;
    }

    filtered.forEach((note, idx) => {
      // Draw bubble marker in canvas
      ctx.fillStyle = '#ff9900';
      ctx.beginPath();
      ctx.arc(note.x, ctx.canvas.height - note.y, 10, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px sans-serif';
      ctx.fillText(idx + 1, note.x - 3, ctx.canvas.height - note.y + 3);

      // Add to sidebar list
      const noteItem = document.createElement('div');
      noteItem.className = 'glass-panel';
      noteItem.style = 'padding: 10px; font-size: 0.85rem; margin-bottom: 10px; border-left: 4px solid var(--accent);';
      noteItem.innerHTML = `
        <div style="font-weight: 700; margin-bottom: 4px;">Comment #${idx + 1}</div>
        <div style="color: var(--text-secondary);">${note.comment}</div>
      `;
      sidebar.appendChild(noteItem);
    });
  }

  const saveAnnotationsBtn = document.getElementById('save-annotations-btn');
  if (saveAnnotationsBtn) {
    saveAnnotationsBtn.onclick = async () => {
      try {
        window.showToast('Injecting comments...', 'info');
        const srcDoc = await window.PDFLib.PDFDocument.load(pdfData.arrayBuffer, { password: pdfData.password });
        const pages = srcDoc.getPages();
        const font = await srcDoc.embedFont(window.PDFLib.StandardFonts.HelveticaBold);
        const canvasEl = document.getElementById('annotator-canvas');

        stickyNotes.forEach((note) => {
          const page = pages[note.page - 1];
          const { width, height } = page.getSize();
          
          const factorX = width / canvasEl.width;
          const factorY = height / canvasEl.height;

          // Draw a small comment marker bubble in compiled PDF
          const rx = note.x * factorX;
          const ry = note.y * factorY;
          
          page.drawCircle({
            x: rx,
            y: ry,
            radius: 8,
            color: window.PDFLib.rgb(1, 0.6, 0)
          });
          
          page.drawText('C', {
            x: rx - 3,
            y: ry - 4,
            size: 10,
            font,
            color: window.PDFLib.rgb(1, 1, 1)
          });

          // Overlay small comments sidebar note (using default annotations tool if supported, or burning in coordinates)
          page.drawText(note.comment, {
            x: rx + 12,
            y: ry - 3,
            size: 8,
            font,
            color: window.PDFLib.rgb(0.3, 0.3, 0.3)
          });
        });

        const compiledBytes = await srcDoc.save();
        downloadBlob(new Blob([compiledBytes], { type: 'application/pdf' }), `annotated_document.pdf`);
        window.showToast('Annotations burned successfully!', 'success');
        loadSingleFile(new File([compiledBytes], pdfData.file.name, { type: 'application/pdf' }));
      } catch (err) {
        console.error(err);
        window.showToast('Failed to save comments.', 'danger');
      }
    };
  }

  // ==========================================
  // 5. COMPARE PDFs SIDE-BY-SIDE
  // ==========================================
  let comparePage = 1;

  function initCompareWorkspaceA() {
    const uploadB = document.getElementById('upload-zone-b');
    const inputB = document.getElementById('file-input-b');
    if (!uploadB || !inputB) return;

    uploadB.style.display = 'block';

    PdfHelper.setupDragAndDrop('upload-zone-b', 'file-input-b', async (file) => {
      if (file.type !== 'application/pdf') {
        window.showToast('Please select a valid PDF file.', 'danger');
        return;
      }
      try {
        window.showToast('Loading second document...', 'info');
        pdfDataB = await PdfHelper.loadPdf(file);
        pdfDataB.file = file;

        uploadB.style.display = 'none';
        document.getElementById('compare-controls').style.display = 'flex';
        renderCompareView();
      } catch (err) {
        console.error(err);
        window.showToast('Failed to parse second document.', 'danger');
      }
    });
  }

  async function renderCompareView() {
    const canvasA = document.getElementById('compare-canvas-a');
    const canvasB = document.getElementById('compare-canvas-b');
    if (!canvasA || !canvasB) return;

    await PdfHelper.renderPage(pdfData.doc, comparePage, canvasA, 1.0);
    
    if (pdfDataB && comparePage <= pdfDataB.doc.numPages) {
      canvasB.style.display = 'block';
      await PdfHelper.renderPage(pdfDataB.doc, comparePage, canvasB, 1.0);
    } else {
      canvasB.style.display = 'none';
    }

    document.getElementById('compare-page-stat').innerText = `Page ${comparePage}`;

    document.getElementById('compare-prev-btn').onclick = () => {
      if (comparePage > 1) {
        comparePage--;
        renderCompareView();
      }
    };

    document.getElementById('compare-next-btn').onclick = () => {
      const maxPages = Math.max(pdfData.doc.numPages, pdfDataB ? pdfDataB.doc.numPages : 0);
      if (comparePage < maxPages) {
        comparePage++;
        renderCompareView();
      }
    };
  }

  // ==========================================
  // 6. SIZE ANALYZER
  // ==========================================
  async function initSizeAnalyzerWorkspace() {
    try {
      window.showToast('Parsing object sizes...', 'info');
      await PdfHelper.loadScript('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js');

      const binaryStr = new TextDecoder().decode(pdfData.arrayBuffer);
      const imgCount = (binaryStr.match(/\/Subtype\s*\/Image/g) || []).length;
      const fontCount = (binaryStr.match(/\/Type\s*\/Font/g) || []).length;
      const textStreams = (binaryStr.match(/\/BT[\s\S]*?ET/g) || []).length;

      // Deduct sizes roughly
      const totalSize = pdfData.file.size;
      const approxImgSize = Math.min(totalSize * 0.5, imgCount * 80000); // 80kb avg
      const approxFontSize = Math.min(totalSize * 0.2, fontCount * 45000); // 45kb avg
      const approxTextSize = Math.min(totalSize * 0.1, textStreams * 3000); // 3kb avg
      const otherSize = totalSize - (approxImgSize + approxFontSize + approxTextSize);

      document.getElementById('images-stat-val').innerText = `${imgCount} objects (${PdfHelper.formatSize(approxImgSize)})`;
      document.getElementById('fonts-stat-val').innerText = `${fontCount} objects (${PdfHelper.formatSize(approxFontSize)})`;
      document.getElementById('text-stat-val').innerText = `${textStreams} streams (${PdfHelper.formatSize(approxTextSize)})`;
      document.getElementById('meta-stat-val').innerText = PdfHelper.formatSize(otherSize);

      // Render chart
      const chartCtx = document.getElementById('size-chart').getContext('2d');
      new window.Chart(chartCtx, {
        type: 'pie',
        data: {
          labels: ['Images', 'Fonts', 'Text Content', 'Metadata & Structure'],
          datasets: [{
            data: [approxImgSize, approxFontSize, approxTextSize, otherSize],
            backgroundColor: ['#ff3366', '#00ccff', '#33cc33', '#9933ff'],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              labels: {
                color: '#ffffff'
              }
            }
          }
        }
      });

    } catch (err) {
      console.error(err);
      window.showToast('Failed to analyze document metrics.', 'danger');
    }
  }

});

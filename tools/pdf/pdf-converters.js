/**
 * ToolHub Pro - PDF Converters Engine
 * Handles PDF to Image, Image to PDF, PDF to Text/Word/Excel/HTML/CSV/JSON and reverse conversions.
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
  let imageFiles = []; // For Image to PDF (multiple images)
  let docText = ""; // Extracted text

  // Load dependency scripts
  try {
    await PdfHelper.loadScript(PdfHelper.CDNS.JS_PDF);
  } catch (err) {
    console.error('Failed to load jsPDF library.', err);
  }

  // Identify Active Page
  const isImageToPdf = !!document.getElementById('image-files-list');
  const isExcelToPdf = window.location.pathname.includes('excel-to-pdf');
  const isCsvToPdf = window.location.pathname.includes('csv-to-pdf');
  const isWordToPdf = window.location.pathname.includes('word-to-pdf');
  const isJsonToPdf = window.location.pathname.includes('json-to-pdf');
  const isHtmlToPdf = window.location.pathname.includes('html-to-pdf');

  const acceptsMultiple = isImageToPdf;
  const mimeAccept = isImageToPdf ? 'image/*' : isExcelToPdf ? '.xlsx,.xls' : isCsvToPdf ? '.csv' : isWordToPdf ? '.docx' : isJsonToPdf ? '.json' : 'application/pdf';
  fileInput.accept = mimeAccept;

  // Setup Drag & Drop Upload
  PdfHelper.setupDragAndDrop('upload-zone', 'file-input', async (files) => {
    if (isImageToPdf) {
      const arrayFiles = Array.isArray(files) ? files : [files];
      for (const f of arrayFiles) {
        if (!f.type.startsWith('image/')) {
          window.showToast(`"${f.name}" is not an image file.`, 'warning');
          continue;
        }
        imageFiles.push(f);
      }
      renderImageFiles();
    } else {
      const file = Array.isArray(files) ? files[0] : files;
      if (isExcelToPdf || isCsvToPdf || isWordToPdf || isJsonToPdf || isHtmlToPdf) {
        await loadSourceFile(file);
      } else {
        if (file.type !== 'application/pdf') {
          window.showToast('Please select a valid PDF file.', 'danger');
          return;
        }
        await loadPdfFile(file);
      }
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

      // Update basic labels
      const fn = document.getElementById('filename-label');
      if (fn) fn.innerText = file.name;
      const sz = document.getElementById('size-label');
      if (sz) sz.innerText = PdfHelper.formatSize(file.size);
      const pg = document.getElementById('pages-label');
      if (pg) pg.innerText = `${pdfData.doc.numPages} Pages`;

      // Custom workspace loaders
      if (document.getElementById('pages-preview-grid')) {
        await PdfHelper.generateThumbnails(pdfData.doc, 'pages-preview-grid');
      }

      // Extract text content immediately for text-based tools
      if (window.location.pathname.includes('pdf-to-text') ||
          window.location.pathname.includes('pdf-to-word') ||
          window.location.pathname.includes('pdf-to-html') ||
          window.location.pathname.includes('pdf-to-excel') ||
          window.location.pathname.includes('pdf-to-csv') ||
          window.location.pathname.includes('pdf-to-json')) {
        await extractTextData();
      }
    } catch (err) {
      console.error(err);
      window.showToast(err.message || 'Error parsing PDF.', 'danger');
      resetWorkspace();
    }
  }

  /**
   * Loads non-PDF source files (Word, Excel, CSV, JSON)
   */
  async function loadSourceFile(file) {
    window.showToast('Reading uploaded file...', 'info');
    pdfData = { file, arrayBuffer: await file.arrayBuffer() };

    uploadZone.style.display = 'none';
    workspace.style.display = 'grid';

    const fn = document.getElementById('filename-label');
    if (fn) fn.innerText = file.name;
    const sz = document.getElementById('size-label');
    if (sz) sz.innerText = PdfHelper.formatSize(file.size);

    if (isJsonToPdf) {
      // Pre-populate textarea with json string
      const txt = await file.text();
      const area = document.getElementById('json-input');
      if (area) area.value = txt;
    }
  }

  /**
   * Helper to extract text runs from PDF
   */
  async function extractTextData() {
    window.showToast('Extracting text context...', 'info');
    docText = "";
    const totalPages = pdfData.doc.numPages;

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdfData.doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      docText += pageText + '\n';
    }

    const previewArea = document.getElementById('text-preview');
    if (previewArea) {
      previewArea.value = docText.slice(0, 5000) + (docText.length > 5000 ? '\n\n[Content Truncated for Preview]' : '');
    }
  }

  /**
   * Image files list renderer
   */
  function renderImageFiles() {
    const listContainer = document.getElementById('image-files-list');
    if (!listContainer) return;

    if (imageFiles.length === 0) {
      listContainer.innerHTML = `<p style="color: var(--text-secondary); text-align: center;">No images added yet.</p>`;
      workspace.style.display = 'none';
      return;
    }

    uploadZone.style.display = 'none';
    workspace.style.display = 'grid';

    listContainer.innerHTML = imageFiles.map((file, idx) => `
      <div class="glass-panel" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 1.5rem;"></span>
          <div>
            <div style="font-weight: 600;">${file.name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${PdfHelper.formatSize(file.size)}</div>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          ${idx > 0 ? `<button class="btn btn-secondary btn-sm move-up" data-index="${idx}">↑</button>` : ''}
          ${idx < imageFiles.length - 1 ? `<button class="btn btn-secondary btn-sm move-down" data-index="${idx}">↓</button>` : ''}
          <button class="btn btn-secondary btn-sm remove-file" data-index="${idx}" style="color: var(--danger);">✕</button>
        </div>
      </div>
    `).join('');

    listContainer.querySelectorAll('.move-up').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.index);
        const temp = imageFiles[idx];
        imageFiles[idx] = imageFiles[idx - 1];
        imageFiles[idx - 1] = temp;
        renderImageFiles();
      };
    });
    listContainer.querySelectorAll('.move-down').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.index);
        const temp = imageFiles[idx];
        imageFiles[idx] = imageFiles[idx + 1];
        imageFiles[idx + 1] = temp;
        renderImageFiles();
      };
    });
    listContainer.querySelectorAll('.remove-file').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.index);
        imageFiles.splice(idx, 1);
        renderImageFiles();
      };
    });
  }

  // File Download triggers
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
    imageFiles = [];
    docText = "";

    if (fileInput) fileInput.value = '';
    if (uploadZone) uploadZone.style.display = 'block';
    if (workspace) workspace.style.display = 'none';

    const previewGrid = document.getElementById('pages-preview-grid');
    if (previewGrid) previewGrid.innerHTML = '';
    const previewArea = document.getElementById('text-preview');
    if (previewArea) previewArea.value = '';
  }

  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.onclick = () => resetWorkspace();
  }

  // ==========================================
  // CONVERTERS SPECIFIC IMPLEMENTATION
  // ==========================================

  // 1. PDF to Image
  const pdfToImgBtn = document.getElementById('pdf-to-image-btn');
  if (pdfToImgBtn) {
    pdfToImgBtn.onclick = async () => {
      const format = document.getElementById('img-format').value; // 'image/png' or 'image/jpeg'
      const ext = format === 'image/png' ? 'png' : 'jpg';

      try {
        window.showToast('Rendering pages to images...', 'info');
        await PdfHelper.loadScript(PdfHelper.CDNS.JSZIP);
        const zip = new window.JSZip();

        for (let i = 1; i <= pdfData.doc.numPages; i++) {
          const canvas = document.createElement('canvas');
          await PdfHelper.renderPage(pdfData.doc, i, canvas, 2.0); // high resolution render
          
          const dataUrl = canvas.toDataURL(format);
          const base64Data = dataUrl.split(',')[1];
          zip.file(`page_${i}.${ext}`, base64Data, { base64: true });
        }

        const content = await zip.generateAsync({ type: 'blob' });
        downloadBlob(content, `${pdfData.file.name.replace('.pdf', '')}_images.zip`);
        window.showToast('ZIP folder downloaded!', 'success');
      } catch (err) {
        console.error(err);
        window.showToast('Rendering failed.', 'danger');
      }
    };
  }

  // 2. Image to PDF
  const imgToPdfBtn = document.getElementById('image-to-pdf-btn');
  if (imgToPdfBtn) {
    imgToPdfBtn.onclick = async () => {
      if (imageFiles.length === 0) {
        window.showToast('No images added.', 'warning');
        return;
      }
      try {
        window.showToast('Compiling PDF...', 'info');
        const doc = new window.jspdf.jsPDF();

        for (let i = 0; i < imageFiles.length; i++) {
          if (i > 0) doc.addPage();
          
          const imgUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(imageFiles[i]);
          });

          // Draw image to fill full page boundaries
          doc.addImage(imgUrl, 'JPEG', 0, 0, 210, 297);
        }

        doc.save('images_converted.pdf');
        window.showToast('PDF downloaded successfully!', 'success');
      } catch (err) {
        console.error(err);
        window.showToast('Failed to compile PDF.', 'danger');
      }
    };
  }

  // 3. PDF to Text
  const pdfToTxtBtn = document.getElementById('pdf-to-text-btn');
  if (pdfToTxtBtn) {
    pdfToTxtBtn.onclick = () => {
      if (!docText) return;
      const blob = new Blob([docText], { type: 'text/plain;charset=utf-8' });
      downloadBlob(blob, `${pdfData.file.name.replace('.pdf', '')}_extracted.txt`);
      window.showToast('Text file saved!', 'success');
    };
  }

  // 4. PDF to Word
  const pdfToWordBtn = document.getElementById('pdf-to-word-btn');
  if (pdfToWordBtn) {
    pdfToWordBtn.onclick = () => {
      if (!docText) return;
      // Word reads standard HTML inside document format perfectly
      const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><title>Converted Word Document</title><style>body { font-family: Arial; line-height: 1.6; }</style></head>
        <body>
          ${docText.split('\n').map(line => `<p>${line}</p>`).join('')}
        </body>
        </html>
      `;
      const blob = new Blob([htmlContent], { type: 'application/msword' });
      downloadBlob(blob, `${pdfData.file.name.replace('.pdf', '')}_converted.doc`);
      window.showToast('Word document saved!', 'success');
    };
  }

  // 5. Word to PDF
  const wordToPdfBtn = document.getElementById('word-to-pdf-btn');
  if (wordToPdfBtn) {
    wordToPdfBtn.onclick = async () => {
      try {
        window.showToast('Extracting Word text streams...', 'info');
        await PdfHelper.loadScript(PdfHelper.CDNS.JSZIP);

        const zip = await window.JSZip.loadAsync(pdfData.arrayBuffer);
        const docXmlText = await zip.file('word/document.xml').async('string');
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(docXmlText, 'text/xml');
        const textNodes = xmlDoc.getElementsByTagName('w:t');
        let lines = [];
        for (let node of textNodes) {
          lines.push(node.textContent);
        }

        const doc = new window.jspdf.jsPDF();
        let y = 15;
        lines.forEach(line => {
          if (y > 280) {
            doc.addPage();
            y = 15;
          }
          doc.text(line, 15, y);
          y += 8;
        });

        doc.save(`${pdfData.file.name.replace('.docx', '')}_converted.pdf`);
        window.showToast('PDF downloaded!', 'success');
      } catch (err) {
        console.error(err);
        window.showToast('Word compilation failed.', 'danger');
      }
    };
  }

  // 6. PDF to HTML
  const pdfToHtmlBtn = document.getElementById('pdf-to-html-btn');
  if (pdfToHtmlBtn) {
    pdfToHtmlBtn.onclick = () => {
      if (!docText) return;
      const htmlString = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>${pdfData.file.name.replace('.pdf', '')} - Converted HTML</title>
          <style>
            body { font-family: sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; background: #fafafa; color: #333; }
            .page-block { background: #fff; padding: 30px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
          </style>
        </head>
        <body>
          <div class="page-block">
            ${docText.split('\n').map(p => `<p>${p}</p>`).join('')}
          </div>
        </body>
        </html>
      `;
      const blob = new Blob([htmlString], { type: 'text/html;charset=utf-8' });
      downloadBlob(blob, `${pdfData.file.name.replace('.pdf', '')}_converted.html`);
      window.showToast('HTML page downloaded!', 'success');
    };
  }

  // 7. HTML to PDF
  const htmlToPdfBtn = document.getElementById('html-to-pdf-btn');
  if (htmlToPdfBtn) {
    htmlToPdfBtn.onclick = () => {
      const code = document.getElementById('html-code-input').value;
      if (!code.trim()) {
        window.showToast('Please enter HTML markup code.', 'warning');
        return;
      }
      try {
        window.showToast('Compiling layout...', 'info');
        const doc = new window.jspdf.jsPDF();

        // Extract clean text from markup
        const parser = new DOMParser();
        const docHtml = parser.parseFromString(code, 'text/html');
        const text = docHtml.body.innerText || docHtml.body.textContent || '';
        
        let y = 15;
        const lines = text.split('\n');
        lines.forEach(line => {
          if (line.trim() === '') return;
          if (y > 280) {
            doc.addPage();
            y = 15;
          }
          doc.text(line.trim(), 15, y);
          y += 8;
        });

        doc.save('html_converted.pdf');
        window.showToast('PDF downloaded!', 'success');
      } catch (err) {
        console.error(err);
        window.showToast('Compilation failed.', 'danger');
      }
    };
  }

  // 8. PDF to Excel / CSV / JSON
  const excelCsvJsonBtn = document.getElementById('pdf-to-data-btn');
  if (excelCsvJsonBtn) {
    excelCsvJsonBtn.onclick = async () => {
      const format = document.getElementById('data-format').value; // 'xlsx', 'csv', 'json'
      try {
        window.showToast('Parsing rows...', 'info');
        
        // Split text by multiple spaces to form rows/cells
        const rows = docText.split('\n').map(line => {
          return line.split(/\s{2,}/).map(cell => cell.trim()).filter(Boolean);
        }).filter(r => r.length > 0);

        if (format === 'json') {
          const jsonString = JSON.stringify({ filename: pdfData.file.name, data: rows }, null, 2);
          const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
          downloadBlob(blob, `${pdfData.file.name.replace('.pdf', '')}_data.json`);
        } else {
          // XLSX / CSV using SheetJS
          await PdfHelper.loadScript(PdfHelper.CDNS.SHEET_JS);
          const ws = window.XLSX.utils.aoa_to_sheet(rows);
          const wb = window.XLSX.utils.book_new();
          window.XLSX.utils.book_append_sheet(wb, ws, 'DataSheet');

          if (format === 'xlsx') {
            const out = window.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([out], { type: 'application/octet-stream' });
            downloadBlob(blob, `${pdfData.file.name.replace('.pdf', '')}_data.xlsx`);
          } else {
            const csv = window.XLSX.utils.sheet_to_csv(ws);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
            downloadBlob(blob, `${pdfData.file.name.replace('.pdf', '')}_data.csv`);
          }
        }
        window.showToast('Data exported successfully!', 'success');
      } catch (err) {
        console.error(err);
        window.showToast('Failed to export data.', 'danger');
      }
    };
  }

  // 9. Excel to PDF
  const excelToPdfBtn = document.getElementById('excel-to-pdf-btn');
  if (excelToPdfBtn) {
    excelToPdfBtn.onclick = async () => {
      try {
        window.showToast('Converting sheet grids...', 'info');
        await PdfHelper.loadScript(PdfHelper.CDNS.SHEET_JS);

        const workbook = window.XLSX.read(pdfData.arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const ws = workbook.Sheets[sheetName];
        const rows = window.XLSX.utils.sheet_to_json(ws, { header: 1 });

        const doc = new window.jspdf.jsPDF();
        let y = 15;

        rows.forEach((row) => {
          if (y > 280) {
            doc.addPage();
            y = 15;
          }
          const rowString = row.join(' | ');
          doc.text(rowString, 15, y);
          y += 8;
        });

        doc.save(`${pdfData.file.name.replace(/\.[^/.]+$/, '')}_converted.pdf`);
        window.showToast('PDF saved!', 'success');
      } catch (err) {
        console.error(err);
        window.showToast('Excel conversion failed.', 'danger');
      }
    };
  }

  // 10. CSV to PDF
  const csvToPdfBtn = document.getElementById('csv-to-pdf-btn');
  if (csvToPdfBtn) {
    csvToPdfBtn.onclick = async () => {
      try {
        window.showToast('Rendering CSV structure...', 'info');
        const textContent = await pdfData.file.text();
        
        const doc = new window.jspdf.jsPDF();
        let y = 15;
        const lines = textContent.split('\n');

        lines.forEach(line => {
          if (line.trim() === '') return;
          if (y > 280) {
            doc.addPage();
            y = 15;
          }
          const formattedLine = line.split(',').join('  |  ');
          doc.text(formattedLine, 15, y);
          y += 8;
        });

        doc.save(`${pdfData.file.name.replace('.csv', '')}_converted.pdf`);
        window.showToast('CSV converted successfully!', 'success');
      } catch (err) {
        console.error(err);
        window.showToast('CSV compilation failed.', 'danger');
      }
    };
  }

  // 11. JSON to PDF
  const jsonToPdfBtn = document.getElementById('json-to-pdf-btn');
  if (jsonToPdfBtn) {
    jsonToPdfBtn.onclick = () => {
      const code = document.getElementById('json-input').value;
      if (!code.trim()) {
        window.showToast('Please input JSON data.', 'warning');
        return;
      }
      try {
        const obj = JSON.parse(code);
        window.showToast('Compiling object hierarchy...', 'info');
        const doc = new window.jspdf.jsPDF();

        const formattedLines = JSON.stringify(obj, null, 2).split('\n');
        let y = 15;
        formattedLines.forEach(line => {
          if (y > 280) {
            doc.addPage();
            y = 15;
          }
          doc.text(line, 15, y);
          y += 6;
        });

        doc.save('json_converted.pdf');
        window.showToast('PDF compiled successfully!', 'success');
      } catch (err) {
        console.error(err);
        window.showToast('Invalid JSON structure.', 'danger');
      }
    };
  }

});

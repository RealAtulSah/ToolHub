/**
 * ToolHub Pro - Format Converters Engine
 * Handles JPG to PNG, PNG to JPG, WEBP to JPG, SVG to PNG, Image to PDF, PDF to Image, PDF to Text, Text to PDF, Word to PDF, PDF to Word, Excel to PDF, PDF to Excel.
 */
import ImageHelper from '../../assets/js/image-helper.js';
import PdfHelper from '../../assets/js/pdf-helper.js';

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const fileInput = document.getElementById('file-input');
  const uploadZone = document.getElementById('upload-zone');
  const workspace = document.getElementById('workspace');

  if (!fileInput) return;

  // State
  let sourceFile = null;
  let sourceImage = null; // HTMLImageElement
  let pdfData = null; // { doc, password, arrayBuffer }
  let extractedText = "";

  // Identify Tool Page
  const isJpgToPng = window.location.pathname.includes('jpg-to-png');
  const isPngToJpg = window.location.pathname.includes('png-to-jpg');
  const isWebpToJpg = window.location.pathname.includes('webp-to-jpg');
  const isSvgToPng = window.location.pathname.includes('svg-to-png');
  const isImageToPdf = window.location.pathname.includes('image-to-pdf');
  const isPdfToImage = window.location.pathname.includes('pdf-to-image');
  const isPdfToText = window.location.pathname.includes('pdf-to-text');
  const isTextToPdf = window.location.pathname.includes('text-to-pdf');
  const isWordToPdf = window.location.pathname.includes('word-to-pdf');
  const isPdfToWord = window.location.pathname.includes('pdf-to-word');
  const isExcelToPdf = window.location.pathname.includes('excel-to-pdf');
  const isPdfToExcel = window.location.pathname.includes('pdf-to-excel');

  // Load standard jsPDF library
  try {
    await PdfHelper.loadScript(PdfHelper.CDNS.JS_PDF);
  } catch (err) {
    console.error('Failed to load jsPDF library.', err);
  }

  // Set file input accept filter
  let acceptStr = '*/*';
  if (isJpgToPng) acceptStr = 'image/jpeg,image/jpg';
  else if (isPngToJpg) acceptStr = 'image/png';
  else if (isWebpToJpg) acceptStr = 'image/webp';
  else if (isSvgToPng) acceptStr = 'image/svg+xml';
  else if (isImageToPdf) acceptStr = 'image/*';
  else if (isPdfToImage || isPdfToText || isPdfToWord || isPdfToExcel) acceptStr = 'application/pdf';
  else if (isWordToPdf) acceptStr = '.docx';
  else if (isExcelToPdf) acceptStr = '.xlsx,.xls';
  else if (isTextToPdf) acceptStr = '.txt';

  fileInput.accept = acceptStr;

  // Setup Drag & Drop Upload
  PdfHelper.setupDragAndDrop('upload-zone', 'file-input', async (file) => {
    sourceFile = file;
    await processUploadedFile();
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
   * Process uploaded source file
   */
  async function processUploadedFile() {
    window.showToast('Reading file data...', 'info');
    uploadZone.style.display = 'none';
    workspace.style.display = 'grid';

    // Update details panel
    const fn = document.getElementById('filename-label');
    if (fn) fn.innerText = sourceFile.name;
    const sz = document.getElementById('size-label');
    if (sz) sz.innerText = PdfHelper.formatSize(sourceFile.size);

    try {
      if (isJpgToPng || isPngToJpg || isWebpToJpg || isSvgToPng || isImageToPdf) {
        // Load image file
        const loaded = await ImageHelper.loadImage(sourceFile);
        sourceImage = loaded.img;
        const previewEl = document.getElementById('image-preview');
        if (previewEl) previewEl.src = loaded.url;
      } else if (isPdfToImage || isPdfToText || isPdfToWord || isPdfToExcel) {
        // Load PDF document
        pdfData = await PdfHelper.loadPdf(sourceFile);
        
        const pg = document.getElementById('pages-label');
        if (pg) pg.innerText = `${pdfData.doc.numPages} Pages`;

        // Previews
        if (document.getElementById('pages-preview-grid')) {
          await PdfHelper.generateThumbnails(pdfData.doc, 'pages-preview-grid');
        }

        if (isPdfToText || isPdfToWord || isPdfToExcel) {
          await extractPdfTextContent();
        }
      } else if (isTextToPdf) {
        const text = await sourceFile.text();
        const area = document.getElementById('text-input-preview');
        if (area) area.value = text;
      }
    } catch (err) {
      console.error(err);
      window.showToast(err.message || 'Error processing source file.', 'danger');
      resetWorkspace();
    }
  }

  /**
   * Extracts text runs from PDF
   */
  async function extractPdfTextContent() {
    window.showToast('Extracting text context...', 'info');
    extractedText = "";
    const totalPages = pdfData.doc.numPages;

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdfData.doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      extractedText += pageText + '\n';
    }

    const previewArea = document.getElementById('text-preview');
    if (previewArea) {
      previewArea.value = extractedText.slice(0, 5000) + (extractedText.length > 5000 ? '\n\n[Content Truncated for Preview]' : '');
    }
  }

  function downloadBlob(blob, name) {
    if (window.showPreviewModal) {
      window.showPreviewModal(blob, name);
    } else {
      const url = PdfHelper.createObjectUrl(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  function resetWorkspace() {
    ImageHelper.cleanMemory();
    PdfHelper.cleanMemory();
    sourceFile = null;
    sourceImage = null;
    pdfData = null;
    extractedText = "";

    if (fileInput) fileInput.value = '';
    if (uploadZone) uploadZone.style.display = 'block';
    if (workspace) workspace.style.display = 'none';

    const pGrid = document.getElementById('pages-preview-grid');
    if (pGrid) pGrid.innerHTML = '';
    const imgPrev = document.getElementById('image-preview');
    if (imgPrev) imgPrev.removeAttribute('src');
    const txtPrev = document.getElementById('text-preview');
    if (txtPrev) txtPrev.value = '';
  }

  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.onclick = () => resetWorkspace();
  }

  // ==========================================
  // CONVERSION ACTIONS
  // ==========================================

  // 1. JPG to PNG / PNG to JPG / WEBP to JPG / SVG to PNG
  const imgConvertBtn = document.getElementById('img-convert-btn');
  if (imgConvertBtn) {
    imgConvertBtn.onclick = () => {
      const canvas = document.createElement('canvas');
      canvas.width = sourceImage.width;
      canvas.height = sourceImage.height;
      const ctx = canvas.getContext('2d');

      let format = 'image/png';
      let name = `${sourceFile.name.split('.')[0]}.png`;

      if (isPngToJpg || isWebpToJpg) {
        format = 'image/jpeg';
        name = `${sourceFile.name.split('.')[0]}.jpg`;
        // Draw white background for JPEGs
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(sourceImage, 0, 0);

      canvas.toBlob((blob) => {
        downloadBlob(blob, name);
        window.showToast('Image converted successfully!', 'success');
      }, format, 0.9);
    };
  }

  // 2. Image to PDF
  const imgToPdfBtn = document.getElementById('image-to-pdf-btn');
  if (imgToPdfBtn) {
    imgToPdfBtn.onclick = () => {
      try {
        window.showToast('Compiling PDF...', 'info');
        const doc = new window.jspdf.jsPDF();
        
        const canvas = document.createElement('canvas');
        canvas.width = sourceImage.width;
        canvas.height = sourceImage.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(sourceImage, 0, 0);
        
        const imgUrl = canvas.toDataURL('image/jpeg', 0.9);
        doc.addImage(imgUrl, 'JPEG', 0, 0, 210, 297);
        doc.save(`${sourceFile.name.split('.')[0]}.pdf`);
        window.showToast('PDF downloaded successfully!', 'success');
      } catch (err) {
        console.error(err);
        window.showToast('Failed to compile PDF.', 'danger');
      }
    };
  }

  // 3. PDF to Image
  const pdfToImgBtn = document.getElementById('pdf-to-image-btn');
  if (pdfToImgBtn) {
    pdfToImgBtn.onclick = async () => {
      try {
        window.showToast('Extracting pages to images...', 'info');
        await PdfHelper.loadScript(PdfHelper.CDNS.JSZIP);
        const zip = new window.JSZip();
        const canvas = document.createElement('canvas');

        for (let i = 1; i <= pdfData.doc.numPages; i++) {
          await PdfHelper.renderPage(pdfData.doc, i, canvas, 2.0);
          const dataUrl = canvas.toDataURL('image/png');
          const base64Data = dataUrl.split(',')[1];
          zip.file(`page_${i}.png`, base64Data, { base64: true });
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, `${sourceFile.name.replace('.pdf', '')}_extracted_pages.zip`);
        window.showToast('Images extracted and zipped!', 'success');
      } catch (err) {
        console.error(err);
        window.showToast('Extraction failed.', 'danger');
      }
    };
  }

  // 4. PDF to Text / PDF to Word
  const pdfToTextBtn = document.getElementById('pdf-to-text-btn');
  if (pdfToTextBtn) {
    pdfToTextBtn.onclick = () => {
      if (!extractedText) return;
      if (isPdfToWord) {
        const htmlContent = `
          <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
          <head><meta charset="utf-8"></head>
          <body>
            ${extractedText.split('\n').map(line => `<p>${line}</p>`).join('')}
          </body>
          </html>
        `;
        const blob = new Blob([htmlContent], { type: 'application/msword' });
        downloadBlob(blob, `${sourceFile.name.replace('.pdf', '')}_converted.doc`);
        window.showToast('Word file downloaded!', 'success');
      } else {
        const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
        downloadBlob(blob, `${sourceFile.name.replace('.pdf', '')}_extracted.txt`);
        window.showToast('TXT document downloaded!', 'success');
      }
    };
  }

  // 5. Text to PDF
  const textToPdfBtn = document.getElementById('text-to-pdf-btn');
  if (textToPdfBtn) {
    textToPdfBtn.onclick = () => {
      const text = document.getElementById('text-input-preview').value;
      if (!text.trim()) {
        window.showToast('No text to convert.', 'warning');
        return;
      }
      try {
        const doc = new window.jspdf.jsPDF();
        const lines = text.split('\n');
        let y = 15;

        lines.forEach((line) => {
          if (y > 280) {
            doc.addPage();
            y = 15;
          }
          doc.text(line, 15, y);
          y += 7;
        });

        doc.save(`${sourceFile ? sourceFile.name.split('.')[0] : 'text'}_converted.pdf`);
        window.showToast('PDF compiled successfully!', 'success');
      } catch (err) {
        console.error(err);
        window.showToast('Conversion failed.', 'danger');
      }
    };
  }

  // 6. Word to PDF
  const wordToPdfBtn = document.getElementById('word-to-pdf-btn');
  if (wordToPdfBtn) {
    wordToPdfBtn.onclick = async () => {
      try {
        window.showToast('Unzipping DOCX structure...', 'info');
        await PdfHelper.loadScript(PdfHelper.CDNS.JSZIP);

        const arrayBuffer = await sourceFile.arrayBuffer();
        const zip = await window.JSZip.loadAsync(arrayBuffer);
        const docXmlText = await zip.file('word/document.xml').async('string');

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(docXmlText, 'text/xml');
        const textNodes = xmlDoc.getElementsByTagName('w:t');
        let textLines = [];
        for (let node of textNodes) {
          textLines.push(node.textContent);
        }

        const doc = new window.jspdf.jsPDF();
        let y = 15;
        textLines.forEach((line) => {
          if (y > 280) {
            doc.addPage();
            y = 15;
          }
          doc.text(line, 15, y);
          y += 7;
        });

        doc.save(`${sourceFile.name.replace('.docx', '')}_converted.pdf`);
        window.showToast('Word converted to PDF successfully!', 'success');
      } catch (err) {
        console.error(err);
        window.showToast('Failed to convert Word file.', 'danger');
      }
    };
  }

  // 7. Excel to PDF
  const excelToPdfBtn = document.getElementById('excel-to-pdf-btn');
  if (excelToPdfBtn) {
    excelToPdfBtn.onclick = async () => {
      try {
        window.showToast('Converting sheet cells...', 'info');
        await PdfHelper.loadScript(PdfHelper.CDNS.SHEET_JS);

        const arrayBuffer = await sourceFile.arrayBuffer();
        const workbook = window.XLSX.read(arrayBuffer, { type: 'array' });
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
          y += 7;
        });

        doc.save(`${sourceFile.name.replace(/\.[^/.]+$/, '')}_converted.pdf`);
        window.showToast('Excel document converted!', 'success');
      } catch (err) {
        console.error(err);
        window.showToast('Excel conversion failed.', 'danger');
      }
    };
  }

  // 8. PDF to Excel
  const pdfToExcelBtn = document.getElementById('pdf-to-excel-btn');
  if (pdfToExcelBtn) {
    pdfToExcelBtn.onclick = async () => {
      try {
        window.showToast('Exporting table blocks...', 'info');
        await PdfHelper.loadScript(PdfHelper.CDNS.SHEET_JS);

        const rows = extractedText.split('\n').map(line => {
          return line.split(/\s{2,}/).map(cell => cell.trim()).filter(Boolean);
        }).filter(r => r.length > 0);

        const ws = window.XLSX.utils.aoa_to_sheet(rows);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

        const out = window.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        downloadBlob(new Blob([out], { type: 'application/octet-stream' }), `${sourceFile.name.replace('.pdf', '')}_data.xlsx`);
        window.showToast('Excel workbook exported!', 'success');
      } catch (err) {
        console.error(err);
        window.showToast('Failed to export Excel workbook.', 'danger');
      }
    };
  }

});

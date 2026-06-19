/**
 * ToolHub Pro - PDF Modifiers Engine
 * Handles Merge, Split, Compress, Rotate, Rearrange, Delete, Extract, Page Numbering, and Book Creation.
 */
import PdfHelper from '../../assets/js/pdf-helper.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Identify the active tool by checking DOM elements
  const fileInput = document.getElementById('file-input');
  const uploadZone = document.getElementById('upload-zone');
  const workspace = document.getElementById('workspace');

  if (!fileInput) return;

  // State
  let pdfData = null; // Stores { doc, password, arrayBuffer, file }
  let selectedPages = new Set();
  let filesList = []; // For Merge PDF and Book Creator (multiple files)

  // 1. Dynamic check for specific tool layouts
  const isMergeTool = !!document.getElementById('merge-files-list');
  const isBookTool = !!document.getElementById('book-files-list');

  // Load PDF-Lib dependency
  try {
    await PdfHelper.loadScript(PdfHelper.CDNS.PDF_LIB);
  } catch (err) {
    console.error(err);
    window.showToast('Failed to load PDF processing library.', 'danger');
  }

  // Setup Drag & Drop Upload
  PdfHelper.setupDragAndDrop('upload-zone', 'file-input', async (files) => {
    if (isMergeTool || isBookTool) {
      // Multiple files mode
      const arrayFiles = Array.isArray(files) ? files : [files];
      for (const f of arrayFiles) {
        if (f.type !== 'application/pdf') {
          window.showToast(`"${f.name}" is not a PDF file.`, 'warning');
          continue;
        }
        filesList.push(f);
      }
      renderFilesList();
    } else {
      // Single file mode
      const file = Array.isArray(files) ? files[0] : files;
      if (file.type !== 'application/pdf') {
        window.showToast('Please select a valid PDF file.', 'danger');
        return;
      }
      await loadSingleFile(file);
    }
  }, isMergeTool || isBookTool);

  // Browse files fallback inside Upload zone button
  const browseBtn = uploadZone.querySelector('button');
  if (browseBtn) {
    browseBtn.onclick = (e) => {
      e.stopPropagation();
      fileInput.click();
    };
  }

  /**
   * Loads single PDF file into workspace
   */
  async function loadSingleFile(file) {
    try {
      window.showToast('Loading PDF file...', 'info');
      pdfData = await PdfHelper.loadPdf(file);
      pdfData.file = file;

      // Show workspace
      uploadZone.style.display = 'none';
      workspace.style.display = 'grid';

      // Initialize workspace tools
      initSingleFileWorkspace();
    } catch (err) {
      console.error(err);
      window.showToast(err.message || 'Error parsing PDF document.', 'danger');
      resetWorkspace();
    }
  }

  /**
   * Multi-file renderer
   */
  function renderFilesList() {
    const listContainer = document.getElementById(isMergeTool ? 'merge-files-list' : 'book-files-list');
    if (!listContainer) return;

    if (filesList.length === 0) {
      listContainer.innerHTML = `<p style="color: var(--text-secondary); text-align: center;">No PDF files added yet.</p>`;
      if (workspace) workspace.style.display = 'none';
      return;
    }

    uploadZone.style.display = 'none';
    if (workspace) workspace.style.display = 'grid';

    listContainer.innerHTML = filesList.map((file, idx) => `
      <div class="glass-panel" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px;">
        <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
          <span style="font-size: 1.5rem;"></span>
          <div style="min-width: 0;">
            <div style="font-weight: 600; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${file.name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${PdfHelper.formatSize(file.size)}</div>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          ${idx > 0 ? `<button class="btn btn-secondary btn-sm move-up" data-index="${idx}" style="padding: 4px 8px;">↑</button>` : ''}
          ${idx < filesList.length - 1 ? `<button class="btn btn-secondary btn-sm move-down" data-index="${idx}" style="padding: 4px 8px;">↓</button>` : ''}
          <button class="btn btn-secondary btn-sm remove-file" data-index="${idx}" style="padding: 4px 8px; color: var(--danger);">✕</button>
        </div>
      </div>
    `).join('');

    // Rebind buttons
    listContainer.querySelectorAll('.move-up').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.index);
        const temp = filesList[idx];
        filesList[idx] = filesList[idx - 1];
        filesList[idx - 1] = temp;
        renderFilesList();
      };
    });
    listContainer.querySelectorAll('.move-down').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.index);
        const temp = filesList[idx];
        filesList[idx] = filesList[idx + 1];
        filesList[idx + 1] = temp;
        renderFilesList();
      };
    });
    listContainer.querySelectorAll('.remove-file').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.index);
        filesList.splice(idx, 1);
        renderFilesList();
      };
    });
  }

  /**
   * Single file workspace initializer
   */
  async function initSingleFileWorkspace() {
    // 1. Update document statistics
    const filenameLabel = document.getElementById('filename-label');
    if (filenameLabel) filenameLabel.innerText = pdfData.file.name;
    const pagesLabel = document.getElementById('pages-label');
    if (pagesLabel) pagesLabel.innerText = `${pdfData.doc.numPages} Pages`;
    const sizeLabel = document.getElementById('size-label');
    if (sizeLabel) sizeLabel.innerText = PdfHelper.formatSize(pdfData.file.size);

    // 2. Render Page Previews (Split, Rearrange, Delete, Extract, Rotate, Page Numbers)
    const previewGrid = document.getElementById('pages-preview-grid');
    if (previewGrid) {
      selectedPages.clear();
      // Render previews and bind change events
      await PdfHelper.generateThumbnails(pdfData.doc, 'pages-preview-grid', (pageNum, selected) => {
        if (selected) {
          selectedPages.add(pageNum);
        } else {
          selectedPages.delete(pageNum);
        }
        updateSelectionStats();
      }, selectedPages);

      updateSelectionStats();
    }
  }

  function updateSelectionStats() {
    const statLabel = document.getElementById('selection-stat');
    if (statLabel) {
      statLabel.innerText = `${selectedPages.size} pages selected / ${pdfData.doc.numPages} total`;
    }
  }

  // Multi-select actions (Select All / Clear All)
  const selectAllBtn = document.getElementById('select-all-btn');
  if (selectAllBtn) {
    selectAllBtn.onclick = () => {
      const checkboxes = document.querySelectorAll('#pages-preview-grid input[type="checkbox"]');
      checkboxes.forEach(cb => {
        if (!cb.checked) cb.click();
      });
    };
  }

  const clearAllBtn = document.getElementById('clear-all-btn');
  if (clearAllBtn) {
    clearAllBtn.onclick = () => {
      const checkboxes = document.querySelectorAll('#pages-preview-grid input[type="checkbox"]');
      checkboxes.forEach(cb => {
        if (cb.checked) cb.click();
      });
    };
  }

  // Helper to trigger standard download of bytes
  function downloadBytes(bytes, name) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
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

  // Reset tool views
  function resetWorkspace() {
    PdfHelper.cleanMemory();
    pdfData = null;
    selectedPages.clear();
    filesList = [];

    if (fileInput) fileInput.value = '';
    if (uploadZone) uploadZone.style.display = 'block';
    if (workspace) workspace.style.display = 'none';

    // Clear previews
    const previewGrid = document.getElementById('pages-preview-grid');
    if (previewGrid) previewGrid.innerHTML = '';
  }

  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.onclick = () => resetWorkspace();
  }

  // ==========================================
  // TOOL SPECIFIC ACTIONS
  // ==========================================

  // 1. Merge PDF Tool
  const mergeBtn = document.getElementById('merge-btn');
  if (mergeBtn) {
    mergeBtn.onclick = async () => {
      if (filesList.length < 2) {
        window.showToast('Please add at least 2 PDF files to merge.', 'warning');
        return;
      }
      try {
        window.showToast('Merging documents...', 'info');
        const mergedPdf = await window.PDFLib.PDFDocument.create();

        for (const file of filesList) {
          const loaded = await PdfHelper.loadPdf(file);
          const srcDoc = await window.PDFLib.PDFDocument.load(loaded.arrayBuffer, { password: loaded.password });
          const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
          copiedPages.forEach(p => mergedPdf.addPage(p));
        }

        const mergedBytes = await mergedPdf.save();
        downloadBytes(mergedBytes, 'merged_document.pdf');
        window.showToast('Documents merged successfully!', 'success');
      } catch (err) {
        console.error(err);
        window.showToast('Failed to merge documents.', 'danger');
      }
    };
  }

  // 2. Split PDF Tool
  const splitBtn = document.getElementById('split-btn');
  if (splitBtn) {
    splitBtn.onclick = async () => {
      const mode = document.getElementById('split-mode').value; // 'ranges' or 'all'
      try {
        window.showToast('Splitting document...', 'info');
        const srcDoc = await window.PDFLib.PDFDocument.load(pdfData.arrayBuffer, { password: pdfData.password });

        if (mode === 'all') {
          // Download each page as separate PDF files (or pack into a ZIP)
          await PdfHelper.loadScript(PdfHelper.CDNS.JSZIP);
          const zip = new window.JSZip();

          for (let i = 0; i < srcDoc.getPageCount(); i++) {
            const tempDoc = await window.PDFLib.PDFDocument.create();
            const [copied] = await tempDoc.copyPages(srcDoc, [i]);
            tempDoc.addPage(copied);
            const bytes = await tempDoc.save();
            zip.file(`page_${i + 1}.pdf`, bytes);
          }

          const zipBlob = await zip.generateAsync({ type: 'blob' });
          if (window.showPreviewModal) {
            window.showPreviewModal(zipBlob, `${pdfData.file.name}_split_pages.zip`);
          } else {
            const zipUrl = PdfHelper.createObjectUrl(zipBlob);
            const link = document.createElement('a');
            link.href = zipUrl;
            link.download = `${pdfData.file.name}_split_pages.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
          window.showToast('Split pages packed in ZIP!', 'success');
        } else {
          // Split by range indices
          const rangeVal = document.getElementById('range-input').value; // e.g. "1-3, 5"
          const indices = parseRanges(rangeVal, srcDoc.getPageCount());
          if (indices.length === 0) {
            window.showToast('Invalid page range specified.', 'warning');
            return;
          }

          const tempDoc = await window.PDFLib.PDFDocument.create();
          const copied = await tempDoc.copyPages(srcDoc, indices);
          copied.forEach(p => tempDoc.addPage(p));
          
          const bytes = await tempDoc.save();
          downloadBytes(bytes, `split_range.pdf`);
          window.showToast('Document split completed!', 'success');
        }
      } catch (err) {
        console.error(err);
        window.showToast('Split operation failed.', 'danger');
      }
    };
  }

  // Helper for range parsing e.g. "1-3, 5" -> [0, 1, 2, 4]
  function parseRanges(str, totalPages) {
    const indices = [];
    const parts = str.split(',');
    for (let part of parts) {
      part = part.trim();
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(x => parseInt(x.trim()));
        if (!isNaN(start) && !isNaN(end)) {
          const s = Math.max(1, start);
          const e = Math.min(totalPages, end);
          for (let i = s; i <= e; i++) {
            indices.push(i - 1);
          }
        }
      } else {
        const val = parseInt(part);
        if (!isNaN(val) && val >= 1 && val <= totalPages) {
          indices.push(val - 1);
        }
      }
    }
    return Array.from(new Set(indices)).sort((a,b) => a - b);
  }

  // 3. Compress PDF Tool
  const compressBtn = document.getElementById('compress-btn');
  if (compressBtn) {
    compressBtn.onclick = async () => {
      try {
        window.showToast('Compressing document streams...', 'info');
        const srcDoc = await window.PDFLib.PDFDocument.load(pdfData.arrayBuffer, { password: pdfData.password });
        
        // Compact streams and discard metadata blocks
        const compressedBytes = await srcDoc.save({
          useObjectStreams: true
        });

        const originalSize = pdfData.file.size;
        const compressedSize = compressedBytes.length;
        const savingPercent = Math.round((1 - (compressedSize / originalSize)) * 100);

        if (savingPercent <= 0) {
          window.showToast('Document is already highly compressed.', 'info');
        } else {
          window.showToast(`Compressed by ${savingPercent}%!`, 'success');
        }

        downloadBytes(compressedBytes, `${pdfData.file.name.replace('.pdf', '')}_compressed.pdf`);
      } catch (err) {
        console.error(err);
        window.showToast('Compression failed.', 'danger');
      }
    };
  }

  // 4. Rotate PDF Tool
  const rotateBtn = document.getElementById('rotate-btn');
  if (rotateBtn) {
    rotateBtn.onclick = async () => {
      const angle = parseInt(document.getElementById('rotate-angle').value); // 90, 180, 270
      try {
        window.showToast('Rotating selected pages...', 'info');
        const srcDoc = await window.PDFLib.PDFDocument.load(pdfData.arrayBuffer, { password: pdfData.password });
        const pages = srcDoc.getPages();

        if (selectedPages.size === 0) {
          // If no selection, rotate ALL pages
          pages.forEach((p) => {
            const curr = p.getRotation().angle;
            p.setRotation(window.PDFLib.degrees((curr + angle) % 360));
          });
        } else {
          selectedPages.forEach((pageNum) => {
            const p = pages[pageNum - 1];
            const curr = p.getRotation().angle;
            p.setRotation(window.PDFLib.degrees((curr + angle) % 360));
          });
        }

        const rotatedBytes = await srcDoc.save();
        downloadBytes(rotatedBytes, `rotated_document.pdf`);
        window.showToast('Rotation complete!', 'success');
        loadSingleFile(new File([rotatedBytes], pdfData.file.name, { type: 'application/pdf' }));
      } catch (err) {
        console.error(err);
        window.showToast('Rotation failed.', 'danger');
      }
    };
  }

  // 5. Rearrange Pages Tool
  const rearrangeBtn = document.getElementById('rearrange-btn');
  if (rearrangeBtn) {
    rearrangeBtn.onclick = async () => {
      try {
        window.showToast('Rearranging pages...', 'info');
        const srcDoc = await window.PDFLib.PDFDocument.load(pdfData.arrayBuffer, { password: pdfData.password });
        
        // Grab current index lists from preview children
        const previewGrid = document.getElementById('pages-preview-grid');
        const order = Array.from(previewGrid.children).map(child => parseInt(child.dataset.page) - 1);

        const newDoc = await window.PDFLib.PDFDocument.create();
        const copied = await newDoc.copyPages(srcDoc, order);
        copied.forEach(p => newDoc.addPage(p));

        const rearrangedBytes = await newDoc.save();
        downloadBytes(rearrangedBytes, `rearranged_document.pdf`);
        window.showToast('Rearrangement saved!', 'success');
        loadSingleFile(new File([rearrangedBytes], pdfData.file.name, { type: 'application/pdf' }));
      } catch (err) {
        console.error(err);
        window.showToast('Rearranging failed.', 'danger');
      }
    };

    // Sortable preview setup using standard drag/drop
    const previewGrid = document.getElementById('pages-preview-grid');
    if (previewGrid) {
      let draggedItem = null;
      
      previewGrid.addEventListener('dragstart', (e) => {
        draggedItem = e.target.closest('.pdf-page-thumb');
        if (draggedItem) {
          draggedItem.style.opacity = '0.5';
          e.dataTransfer.effectAllowed = 'move';
        }
      });

      previewGrid.addEventListener('dragend', () => {
        if (draggedItem) {
          draggedItem.style.opacity = '1';
        }
        draggedItem = null;
      });

      previewGrid.addEventListener('dragover', (e) => {
        e.preventDefault();
        const overItem = e.target.closest('.pdf-page-thumb');
        if (overItem && overItem !== draggedItem) {
          const rect = overItem.getBoundingClientRect();
          const next = (e.clientX - rect.left) > (rect.width / 2);
          previewGrid.insertBefore(draggedItem, next ? overItem.nextSibling : overItem);
        }
      });
      
      // Make pages draggable
      setInterval(() => {
        previewGrid.querySelectorAll('.pdf-page-thumb').forEach(el => {
          if (!el.getAttribute('draggable')) {
            el.setAttribute('draggable', 'true');
          }
        });
      }, 1000);
    }
  }

  // 6. Delete Pages Tool
  const deleteBtn = document.getElementById('delete-btn');
  if (deleteBtn) {
    deleteBtn.onclick = async () => {
      if (selectedPages.size === 0) {
        window.showToast('Please select at least one page to delete.', 'warning');
        return;
      }
      if (selectedPages.size === pdfData.doc.numPages) {
        window.showToast('Cannot delete all pages from the PDF.', 'warning');
        return;
      }

      try {
        window.showToast('Deleting pages...', 'info');
        const srcDoc = await window.PDFLib.PDFDocument.load(pdfData.arrayBuffer, { password: pdfData.password });
        
        // Remove pages from the end to keep indices intact
        const toDelete = Array.from(selectedPages).map(x => x - 1).sort((a,b) => b - a);
        toDelete.forEach(idx => srcDoc.removePage(idx));

        const bytes = await srcDoc.save();
        downloadBytes(bytes, `pages_deleted.pdf`);
        window.showToast('Pages deleted successfully!', 'success');
        loadSingleFile(new File([bytes], pdfData.file.name, { type: 'application/pdf' }));
      } catch (err) {
        console.error(err);
        window.showToast('Failed to delete pages.', 'danger');
      }
    };
  }

  // 7. Extract Pages Tool
  const extractBtn = document.getElementById('extract-btn');
  if (extractBtn) {
    extractBtn.onclick = async () => {
      if (selectedPages.size === 0) {
        window.showToast('Please select pages to extract.', 'warning');
        return;
      }

      try {
        window.showToast('Extracting selected pages...', 'info');
        const srcDoc = await window.PDFLib.PDFDocument.load(pdfData.arrayBuffer, { password: pdfData.password });
        
        const newDoc = await window.PDFLib.PDFDocument.create();
        const toExtract = Array.from(selectedPages).map(x => x - 1).sort((a,b) => a - b);
        const copied = await newDoc.copyPages(srcDoc, toExtract);
        copied.forEach(p => newDoc.addPage(p));

        const bytes = await newDoc.save();
        downloadBytes(bytes, `extracted_pages.pdf`);
        window.showToast('Extraction successful!', 'success');
      } catch (err) {
        console.error(err);
        window.showToast('Extraction failed.', 'danger');
      }
    };
  }

  // 8. Page Numbering Tool
  const numberingBtn = document.getElementById('add-numbers-btn');
  if (numberingBtn) {
    numberingBtn.onclick = async () => {
      const style = document.getElementById('num-style').value; // 'simple' or 'page-x-y'
      const pos = document.getElementById('num-position').value; // 'bottom-center', 'bottom-right', etc.
      const size = parseInt(document.getElementById('num-size').value) || 10;

      try {
        window.showToast('Injecting page numbers...', 'info');
        const srcDoc = await window.PDFLib.PDFDocument.load(pdfData.arrayBuffer, { password: pdfData.password });
        const pages = srcDoc.getPages();
        const font = await srcDoc.embedFont(window.PDFLib.StandardFonts.Helvetica);

        pages.forEach((page, i) => {
          const { width, height } = page.getSize();
          const text = style === 'simple' ? `${i + 1}` : `Page ${i + 1} of ${pages.length}`;
          
          let x = width / 2;
          let y = 30;

          if (pos.startsWith('top')) {
            y = height - 40;
          }
          if (pos.endsWith('left')) {
            x = 40;
          } else if (pos.endsWith('right')) {
            x = width - 80;
          }

          page.drawText(text, {
            x,
            y,
            size,
            font,
            color: window.PDFLib.rgb(0.3, 0.3, 0.3)
          });
        });

        const numberedBytes = await srcDoc.save();
        downloadBytes(numberedBytes, `numbered_document.pdf`);
        window.showToast('Page numbering added!', 'success');
        loadSingleFile(new File([numberedBytes], pdfData.file.name, { type: 'application/pdf' }));
      } catch (err) {
        console.error(err);
        window.showToast('Failed to add page numbers.', 'danger');
      }
    };
  }

  // 9. Book Creator Tool
  const bookBtn = document.getElementById('create-book-btn');
  if (bookBtn) {
    bookBtn.onclick = async () => {
      const bookTitle = document.getElementById('book-title').value || 'My Compiled Book';
      const bookAuthor = document.getElementById('book-author').value || 'ToolHub Pro';

      if (filesList.length === 0) {
        window.showToast('Please add at least one document chapter.', 'warning');
        return;
      }

      try {
        window.showToast('Creating book cover and compiling sections...', 'info');
        const newDoc = await window.PDFLib.PDFDocument.create();

        // 1. Create styled Cover Page
        const coverPage = newDoc.addPage([600, 800]);
        const boldFont = await newDoc.embedFont(window.PDFLib.StandardFonts.HelveticaBold);
        const regularFont = await newDoc.embedFont(window.PDFLib.StandardFonts.Helvetica);

        // Draw elegant decorative borders/boxes
        coverPage.drawRectangle({
          x: 20,
          y: 20,
          width: 560,
          height: 760,
          borderColor: window.PDFLib.rgb(0.29, 0.38, 0.96),
          borderWidth: 4
        });

        coverPage.drawText(bookTitle, {
          x: 50,
          y: 500,
          size: 32,
          font: boldFont,
          color: window.PDFLib.rgb(0.1, 0.1, 0.1)
        });

        coverPage.drawText(`By ${bookAuthor}`, {
          x: 50,
          y: 450,
          size: 18,
          font: regularFont,
          color: window.PDFLib.rgb(0.4, 0.4, 0.4)
        });

        coverPage.drawText('Generated with ToolHub Pro Book Creator', {
          x: 50,
          y: 100,
          size: 10,
          font: regularFont,
          color: window.PDFLib.rgb(0.6, 0.6, 0.6)
        });

        // 2. Append Chapters
        for (const file of filesList) {
          const loaded = await PdfHelper.loadPdf(file);
          const srcDoc = await window.PDFLib.PDFDocument.load(loaded.arrayBuffer, { password: loaded.password });
          const copiedPages = await newDoc.copyPages(srcDoc, srcDoc.getPageIndices());
          copiedPages.forEach(p => newDoc.addPage(p));
        }

        const bookBytes = await newDoc.save();
        downloadBytes(bookBytes, `${bookTitle.replace(/\s+/g, '_')}.pdf`);
        window.showToast('Book created successfully!', 'success');
      } catch (err) {
        console.error(err);
        window.showToast('Failed to create book.', 'danger');
      }
    };
  }

});

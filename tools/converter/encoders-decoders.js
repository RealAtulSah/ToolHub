/**
 * ToolHub Pro - Encoders & Decoders Engine
 * Handles Base64, URL, HTML, Markdown, Binary, and Hex conversions.
 */
import PdfHelper from '../../assets/js/pdf-helper.js';

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-input');
  const uploadZone = document.getElementById('upload-zone');
  const workspace = document.getElementById('workspace');

  if (!fileInput) return;

  // Identify Current Tool Page
  const path = window.location.pathname;
  const isBase64Enc = path.includes('base64-encode');
  const isBase64Dec = path.includes('base64-decode');
  const isUrlEnc = path.includes('url-encode');
  const isUrlDec = path.includes('url-decode');
  const isHtmlEnc = path.includes('html-encode');
  const isHtmlDec = path.includes('html-decode');
  const isMdToHtml = path.includes('markdown-to-html');
  const isHtmlToMd = path.includes('html-to-markdown');
  const isTextToBin = path.includes('text-to-binary');
  const isBinToText = path.includes('binary-to-text');
  const isTextToHex = path.includes('text-to-hex');
  const isHexToText = path.includes('hex-to-text');

  // Configure file input file filters
  let acceptStr = 'text/*';
  if (isBase64Enc) acceptStr = '*/*'; // base64 encode can encode any file
  fileInput.accept = acceptStr;

  // Setup Drag & Drop Upload
  PdfHelper.setupDragAndDrop('upload-zone', 'file-input', async (file) => {
    window.showToast('Loading file...', 'info');
    uploadZone.style.display = 'none';
    workspace.style.display = 'grid';

    // Update details
    const fn = document.getElementById('filename-label');
    if (fn) fn.innerText = file.name;
    const sz = document.getElementById('size-label');
    if (sz) sz.innerText = PdfHelper.formatSize(file.size);

    try {
      const inputArea = document.getElementById('data-input-preview');
      if (isBase64Enc) {
        // For base64 encode, offer choice of raw base64 or Data URL
        // We will read as ArrayBuffer / DataURL
        const reader = new FileReader();
        reader.onload = (e) => {
          if (inputArea) inputArea.value = e.target.result;
          window.showToast('File loaded. Click Encode to proceed.', 'info');
        };
        reader.readAsDataURL(file);
      } else {
        const text = await file.text();
        if (inputArea) inputArea.value = text;
      }
    } catch (err) {
      console.error(err);
      window.showToast('Failed to read file.', 'danger');
      resetWorkspace();
    }
  });

  // Browse button trigger
  const browseBtn = uploadZone.querySelector('button');
  if (browseBtn) {
    browseBtn.onclick = (e) => {
      e.stopPropagation();
      fileInput.click();
    };
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
    PdfHelper.cleanMemory();
    if (fileInput) fileInput.value = '';
    if (uploadZone) uploadZone.style.display = 'block';
    if (workspace) workspace.style.display = 'none';

    const inputArea = document.getElementById('data-input-preview');
    if (inputArea) inputArea.value = '';
    const outputArea = document.getElementById('data-output-preview');
    if (outputArea) outputArea.value = '';
  }

  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.onclick = () => resetWorkspace();
  }

  // ==========================================
  // CONVERSION ALGORITHMS
  // ==========================================
  const translateBtn = document.getElementById('translate-btn');
  if (translateBtn) {
    translateBtn.onclick = () => {
      const input = document.getElementById('data-input-preview').value;
      const outputArea = document.getElementById('data-output-preview');

      if (!input.trim() && !isBase64Enc) {
        window.showToast('Please enter or upload data first.', 'warning');
        return;
      }

      try {
        let output = "";
        let ext = "txt";

        if (isBase64Enc) {
          // Input might be a DataURL from drag-drop, or typed string
          if (input.startsWith('data:')) {
            // It's already in Data URL format, extract raw base64 or keep it
            const parts = input.split(',');
            output = parts[1] || parts[0];
          } else {
            output = btoa(unescape(encodeURIComponent(input)));
          }
          ext = "txt";
        } else if (isBase64Dec) {
          // Remove potential whitespace or header
          let cleaned = input.trim().replace(/^data:.*?;base64,/, '');
          output = decodeURIComponent(escape(atob(cleaned)));
        } else if (isUrlEnc) {
          output = encodeURIComponent(input);
        } else if (isUrlDec) {
          output = decodeURIComponent(input);
        } else if (isHtmlEnc) {
          output = htmlEncode(input);
          ext = "html";
        } else if (isHtmlDec) {
          output = htmlDecode(input);
        } else if (isMdToHtml) {
          output = markdownToHtml(input);
          ext = "html";
        } else if (isHtmlToMd) {
          output = htmlToMarkdown(input);
          ext = "md";
        } else if (isTextToBin) {
          output = textToBinary(input);
        } else if (isBinToText) {
          output = binaryToText(input);
        } else if (isTextToHex) {
          output = textToHex(input);
        } else if (isHexToText) {
          output = hexToText(input);
        }

        outputArea.value = output;

        // Setup download button
        const dlBtn = document.getElementById('save-data-btn');
        if (dlBtn) {
          dlBtn.onclick = () => {
            const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
            downloadBlob(blob, `converted_result.${ext}`);
            window.showToast('File downloaded successfully!', 'success');
          };
        }

        window.showToast('Translated successfully!', 'success');

      } catch (err) {
        console.error(err);
        window.showToast('Conversion failed. Check your input formatting.', 'danger');
        outputArea.value = `Error Details:\n${err.message}`;
      }
    };
  }

  // --- Encoder/Decoder Helpers ---

  function htmlEncode(str) {
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
  }

  function htmlDecode(str) {
    const doc = new DOMParser().parseFromString(str, 'text/html');
    return doc.documentElement.textContent || doc.body.textContent || "";
  }

  function textToBinary(str) {
    return Array.from(new TextEncoder().encode(str))
      .map(byte => byte.toString(2).padStart(8, '0'))
      .join(' ');
  }

  function binaryToText(str) {
    const cleanStr = str.replace(/[^01]/g, '');
    if (cleanStr.length % 8 !== 0) {
      throw new Error("Invalid binary length. Must be a multiple of 8 binary digits.");
    }
    const bytes = [];
    for (let i = 0; i < cleanStr.length; i += 8) {
      bytes.push(parseInt(cleanStr.substring(i, i + 8), 2));
    }
    return new TextDecoder().decode(new Uint8Array(bytes));
  }

  function textToHex(str) {
    return Array.from(new TextEncoder().encode(str))
      .map(byte => byte.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');
  }

  function hexToText(str) {
    const cleanStr = str.replace(/[^0-9a-fA-F]/g, '');
    if (cleanStr.length % 2 !== 0) {
      throw new Error("Invalid hex length. Must be a multiple of 2 hex characters.");
    }
    const bytes = [];
    for (let i = 0; i < cleanStr.length; i += 2) {
      bytes.push(parseInt(cleanStr.substring(i, i + 2), 16));
    }
    return new TextDecoder().decode(new Uint8Array(bytes));
  }

  function markdownToHtml(md) {
    let html = md
      // Escaping HTML entities first to prevent xss
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headers
    html = html.replace(/^###### (.*?)$/gm, '<h6>$1</h6>')
               .replace(/^##### (.*?)$/gm, '<h5>$1</h5>')
               .replace(/^#### (.*?)$/gm, '<h4>$1</h4>')
               .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
               .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
               .replace(/^# (.*?)$/gm, '<h1>$1</h1>');

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Inline Code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold & Italic
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
               .replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // Lists
    html = html.replace(/^\s*-\s+(.*?)$/gm, '<li>$1</li>');
    // Group adjacent lists
    html = html.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s*<ul>/g, '');

    // Paragraphs
    html = html.split('\n\n').map(p => {
      p = p.trim();
      if (!p) return '';
      if (p.startsWith('<h') || p.startsWith('<pre') || p.startsWith('<ul') || p.startsWith('<li')) return p;
      return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }).join('\n');

    return html;
  }

  function htmlToMarkdown(html) {
    let md = html
      // Block elements
      .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<h4>(.*?)<\/h4>/gi, '#### $1\n\n')
      .replace(/<h5>(.*?)<\/h5>/gi, '##### $1\n\n')
      .replace(/<h6>(.*?)<\/h6>/gi, '###### $1\n\n')
      .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      // Lists
      .replace(/<ul>([\s\S]*?)<\/ul>/gi, '$1\n')
      .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
      // Inline formatting
      .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i>(.*?)<\/i>/gi, '*$1*')
      // Links
      .replace(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      // Code
      .replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```\n\n')
      .replace(/<code>(.*?)<\/code>/gi, '`$1`');

    // Clean up HTML tags not supported or extra spaces
    md = md.replace(/<[^>]+>/g, '');
    
    // Unescape basic HTML entities
    md = md.replace(/&amp;/g, '&')
           .replace(/&lt;/g, '<')
           .replace(/&gt;/g, '>')
           .replace(/&quot;/g, '"')
           .replace(/&#039;/g, "'");

    return md.trim();
  }
});

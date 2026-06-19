/**
 * ToolHub Pro - Data & Table Translators Engine
 * Handles CSV to JSON, JSON to CSV, JSON to XML, XML to JSON, XML to CSV, CSV to XML.
 */
import PdfHelper from '../../assets/js/pdf-helper.js';

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const fileInput = document.getElementById('file-input');
  const uploadZone = document.getElementById('upload-zone');
  const workspace = document.getElementById('workspace');

  if (!fileInput) return;

  // Identify Tool Page
  const isCsvToJson = window.location.pathname.includes('csv-to-json');
  const isJsonToCsv = window.location.pathname.includes('json-to-csv');
  const isJsonToXml = window.location.pathname.includes('json-to-xml');
  const isXmlToJson = window.location.pathname.includes('xml-to-json');
  const isXmlToCsv = window.location.pathname.includes('xml-to-csv');
  const isCsvToXml = window.location.pathname.includes('csv-to-xml');

  // Input MIME filter
  let acceptStr = '*/*';
  if (isCsvToJson || isCsvToXml) acceptStr = '.csv';
  else if (isJsonToCsv || isJsonToXml) acceptStr = '.json';
  else if (isXmlToJson || isXmlToCsv) acceptStr = '.xml';
  fileInput.accept = acceptStr;

  // Setup Drag & Drop Upload
  PdfHelper.setupDragAndDrop('upload-zone', 'file-input', async (file) => {
    window.showToast('Reading file...', 'info');
    uploadZone.style.display = 'none';
    workspace.style.display = 'grid';

    // Update details
    const fn = document.getElementById('filename-label');
    if (fn) fn.innerText = file.name;
    const sz = document.getElementById('size-label');
    if (sz) sz.innerText = PdfHelper.formatSize(file.size);

    try {
      const text = await file.text();
      const inputArea = document.getElementById('data-input-preview');
      if (inputArea) inputArea.value = text;
    } catch (err) {
      console.error(err);
      window.showToast('Failed to read file content.', 'danger');
      resetWorkspace();
    }
  });

  // Browse files fallback inside Upload zone button
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
  // TRANSLATION ALGORITHMS
  // ==========================================
  const translateBtn = document.getElementById('translate-btn');
  if (translateBtn) {
    translateBtn.onclick = () => {
      const input = document.getElementById('data-input-preview').value;
      const outputArea = document.getElementById('data-output-preview');

      if (!input.trim()) {
        window.showToast('Please enter or upload data first.', 'warning');
        return;
      }

      try {
        let output = "";
        let ext = "txt";

        if (isCsvToJson) {
          output = csvToJson(input);
          ext = "json";
        } else if (isJsonToCsv) {
          output = jsonToCsv(input);
          ext = "csv";
        } else if (isJsonToXml) {
          output = jsonToXml(input);
          ext = "xml";
        } else if (isXmlToJson) {
          output = xmlToJson(input);
          ext = "json";
        } else if (isXmlToCsv) {
          output = xmlToCsv(input);
          ext = "csv";
        } else if (isCsvToXml) {
          output = csvToXml(input);
          ext = "xml";
        }

        outputArea.value = output;
        
        // Setup download button
        const dlBtn = document.getElementById('save-data-btn');
        if (dlBtn) {
          dlBtn.onclick = () => {
            const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
            downloadBlob(blob, `converted_data.${ext}`);
            window.showToast('File downloaded successfully!', 'success');
          };
        }

        window.showToast('Data translated successfully!', 'success');

      } catch (err) {
        console.error(err);
        window.showToast('Translation failed. Verify input format syntax.', 'danger');
        outputArea.value = `Error Details:\n${err.message}`;
      }
    };
  }

  // Helper functions
  function csvToJson(csv) {
    const lines = csv.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return "[]";
    const headers = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim());
    const result = [];
    for (let i = 1; i < lines.length; i++) {
      const obj = {};
      const currentline = lines[i].split(',').map(c => c.replace(/^["']|["']$/g, '').trim());
      for (let j = 0; j < headers.length; j++) {
        obj[headers[j]] = currentline[j] || "";
      }
      result.push(obj);
    }
    return JSON.stringify(result, null, 2);
  }

  function jsonToCsv(json) {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr) || arr.length === 0) throw new Error("JSON input must be an array of objects.");
    const headers = Object.keys(arr[0]);
    const csvRows = [headers.join(',')];
    for (const row of arr) {
      const values = headers.map(header => {
        const val = row[header];
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
      });
      csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
  }

  function jsonToXml(json) {
    const obj = JSON.parse(json);
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n';
    function recurse(o, indent = '  ') {
      for (let key in o) {
        if (typeof o[key] === 'object' && o[key] !== null) {
          xml += `${indent}<${key}>\n`;
          recurse(o[key], indent + '  ');
          xml += `${indent}</${key}>\n`;
        } else {
          xml += `${indent}<${key}>${o[key]}</${key}>\n`;
        }
      }
    }
    recurse(obj);
    xml += '</root>';
    return xml;
  }

  function xmlToJson(xmlStr) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlStr, "text/xml");
    
    // Parse error check
    const parsererror = xmlDoc.getElementsByTagName("parsererror");
    if (parsererror.length > 0) throw new Error("XML parser error: " + parsererror[0].textContent);

    function xmlNodeToJson(node) {
      const obj = {};
      if (node.nodeType === 1) { // element
        if (node.attributes.length > 0) {
          obj["@attributes"] = {};
          for (let j = 0; j < node.attributes.length; j++) {
            const attribute = node.attributes.item(j);
            obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
          }
        }
      } else if (node.nodeType === 3) { // text
        return node.nodeValue.trim();
      }
      if (node.hasChildNodes()) {
        for (let i = 0; i < node.childNodes.length; i++) {
          const item = node.childNodes.item(i);
          const nodeName = item.nodeName;
          if (nodeName === '#text') {
            const txt = item.nodeValue.trim();
            if (txt) return txt;
            continue;
          }
          if (typeof (obj[nodeName]) === 'undefined') {
            obj[nodeName] = xmlNodeToJson(item);
          } else {
            if (!Array.isArray(obj[nodeName])) {
              const old = obj[nodeName];
              obj[nodeName] = [old];
            }
            obj[nodeName].push(xmlNodeToJson(item));
          }
        }
      }
      return obj;
    }
    return JSON.stringify(xmlNodeToJson(xmlDoc.documentElement), null, 2);
  }

  function xmlToCsv(xmlStr) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlStr, "text/xml");
    const parsererror = xmlDoc.getElementsByTagName("parsererror");
    if (parsererror.length > 0) throw new Error("XML parser error.");

    const root = xmlDoc.documentElement;
    const items = root.children;
    if (items.length === 0) return "";
    const headers = Array.from(items[0].children).map(c => c.nodeName);
    const csvRows = [headers.join(',')];
    for (let i = 0; i < items.length; i++) {
      const values = headers.map(header => {
        const child = items[i].getElementsByTagName(header)[0];
        return child ? child.textContent.trim() : "";
      });
      csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
  }

  function csvToXml(csv) {
    const lines = csv.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return "<root></root>";
    const headers = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim());
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n';
    for (let i = 1; i < lines.length; i++) {
      xml += '  <row>\n';
      const currentline = lines[i].split(',').map(c => c.replace(/^["']|["']$/g, '').trim());
      for (let j = 0; j < headers.length; j++) {
        xml += `    <${headers[j]}>${currentline[j] || ""}</${headers[j]}>\n`;
      }
      xml += '  </row>\n';
    }
    xml += '</root>';
    return xml;
  }

});

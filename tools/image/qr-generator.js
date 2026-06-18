/**
 * ToolHub Pro - QR Code Generator Tool
 * Generates and formats customizable QR codes dynamically client-side.
 */
import ImageHelper from '../../assets/js/image-helper.js';

// DOM Elements
const qrcodeRender = document.getElementById('qrcode-render');
const downloadBtn = document.getElementById('download-btn');

// Input Tabs
const tabText = document.getElementById('tab-text');
const tabWifi = document.getElementById('tab-wifi');
const tabVcard = document.getElementById('tab-vcard');

// Content Panels
const panelText = document.getElementById('panel-text');
const panelWifi = document.getElementById('panel-wifi');
const panelVcard = document.getElementById('panel-vcard');

// Inputs
const textInput = document.getElementById('text-input');

const wifiSsid = document.getElementById('wifi-ssid');
const wifiPassword = document.getElementById('wifi-password');
const wifiEncryption = document.getElementById('wifi-encryption');

const vcardName = document.getElementById('vcard-name');
const vcardPhone = document.getElementById('vcard-phone');
const vcardEmail = document.getElementById('vcard-email');

// Customization
const colorFgInput = document.getElementById('color-fg');
const colorBgInput = document.getElementById('color-bg');
const sizeInput = document.getElementById('size-input');
const sizeValue = document.getElementById('size-value');

// State
let qrcodeInstance = null;
let currentTab = 'text'; // 'text' | 'wifi' | 'vcard'

const QRCODE_JS = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';

// Load libraries on startup
initGenerator();

async function initGenerator() {
  try {
    await ImageHelper.loadScript(QRCODE_JS);
    setupEventListeners();
    generateQrCode();
  } catch (error) {
    console.error(error);
    window.showToast('Failed to load QR Code generator library.', 'danger');
  }
}

/**
 * Generate formatted payload based on active tab
 */
function getQrContent() {
  if (currentTab === 'text') {
    return textInput.value || 'https://toolhub.pro';
  }
  
  if (currentTab === 'wifi') {
    const ssid = wifiSsid.value || 'WiFi';
    const password = wifiPassword.value || '';
    const encryption = wifiEncryption.value;
    // Standard Wi-Fi string structure: WIFI:S:SSID;T:WPA;P:PASSWORD;;
    return `WIFI:S:${ssid};T:${encryption};P:${password};;`;
  }

  if (currentTab === 'vcard') {
    const name = vcardName.value || 'User';
    const phone = vcardPhone.value || '';
    const email = vcardEmail.value || '';
    
    // Standard vCard string structure
    return [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${name}`,
      `TEL;TYPE=CELL:${phone}`,
      `EMAIL;TYPE=PREF,INTERNET:${email}`,
      'END:VCARD'
    ].join('\n');
  }

  return 'https://toolhub.pro';
}

/**
 * Render the QR Code into container
 */
function generateQrCode() {
  if (!window.QRCode) return;

  const content = getQrContent();
  const size = parseInt(sizeInput.value);
  const colorDark = colorFgInput.value;
  const colorLight = colorBgInput.value;

  // Clear previous renders
  qrcodeRender.innerHTML = '';

  // Initialize new QR Code
  qrcodeInstance = new window.QRCode(qrcodeRender, {
    text: content,
    width: size,
    height: size,
    colorDark: colorDark,
    colorLight: colorLight,
    correctLevel: window.QRCode.CorrectLevel.H
  });
}

/**
 * Debounce utility wrapper
 */
let debounceTimer = null;
function triggerRegeneration() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    generateQrCode();
  }, 200);
}

/**
 * Bind configuration and interactive inputs
 */
function setupEventListeners() {
  // Input changes
  textInput.addEventListener('input', triggerRegeneration);
  wifiSsid.addEventListener('input', triggerRegeneration);
  wifiPassword.addEventListener('input', triggerRegeneration);
  wifiEncryption.addEventListener('change', triggerRegeneration);
  vcardName.addEventListener('input', triggerRegeneration);
  vcardPhone.addEventListener('input', triggerRegeneration);
  vcardEmail.addEventListener('input', triggerRegeneration);

  // Customizers
  colorFgInput.addEventListener('input', triggerRegeneration);
  colorBgInput.addEventListener('input', triggerRegeneration);
  
  sizeInput.addEventListener('input', (e) => {
    sizeValue.innerText = `${e.target.value}px`;
    triggerRegeneration();
  });

  // Tab selections
  tabText.addEventListener('click', () => selectTab('text'));
  tabWifi.addEventListener('click', () => selectTab('wifi'));
  tabVcard.addEventListener('click', () => selectTab('vcard'));

  // Download Action
  downloadBtn.addEventListener('click', handleDownload);
}

/**
 * Handles toggling input layout forms
 */
function selectTab(tab) {
  currentTab = tab;
  
  // Update tabs UI
  tabText.style.background = tab === 'text' ? 'var(--bg-secondary)' : 'transparent';
  tabWifi.style.background = tab === 'wifi' ? 'var(--bg-secondary)' : 'transparent';
  tabVcard.style.background = tab === 'vcard' ? 'var(--bg-secondary)' : 'transparent';

  // Toggle panels visibility
  panelText.style.display = tab === 'text' ? 'flex' : 'none';
  panelWifi.style.display = tab === 'wifi' ? 'flex' : 'none';
  panelVcard.style.display = tab === 'vcard' ? 'flex' : 'none';

  generateQrCode();
}

/**
 * Handles exporting output QR code to PNG
 */
function handleDownload() {
  // QRCodeJS renders either canvas or image depending on browser
  const canvas = qrcodeRender.querySelector('canvas');
  const img = qrcodeRender.querySelector('img');

  if (canvas) {
    const url = canvas.toDataURL('image/png');
    triggerDownload(url);
  } else if (img && img.src) {
    triggerDownload(img.src);
  } else {
    window.showToast('Could not extract generated QR Code.', 'danger');
  }
}

function triggerDownload(dataUrl) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `qrcode_${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.showToast('QR Code downloaded successfully!', 'success');
}

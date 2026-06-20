/**
 * ToolHub Pro - Security Utilities
 * Shared hardening helpers: HTML escaping, frame-busting, console warnings, input validation.
 */
const Security = {

  /**
   * Escapes HTML special characters to prevent XSS when inserting into innerHTML.
   * Uses DOM-based escaping for maximum safety.
   */
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const s = String(str);
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  },

  /**
   * Sets an element's text safely without interpreting HTML.
   * Preferred over innerHTML when displaying user/untrusted content.
   */
  safeSetText(el, text) {
    if (el) el.textContent = text;
  },

  /**
   * Validates that a value is a simple identifier (alphanumeric + hyphens).
   * Used for sanitizing tool IDs from localStorage.
   */
  isValidId(id) {
    return typeof id === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(id);
  },

  /**
   * Validates a URL to block dangerous schemes (javascript:, data:, vbscript:).
   * Returns true if URL is safe to use in href attributes.
   */
  isSafeUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim().toLowerCase();
    return !(/^(javascript|data|vbscript)\s*:/i.test(trimmed));
  },

  /**
   * Enforces file size limit. Returns true if within limit.
   * @param {File} file - The file to check.
   * @param {number} maxMB - Maximum allowed size in megabytes (default 50MB).
   */
  checkFileSize(file, maxMB = 50) {
    if (!file) return false;
    const maxBytes = maxMB * 1024 * 1024;
    if (file.size > maxBytes) {
      if (window.showToast) {
        window.showToast(`File exceeds the ${maxMB}MB size limit. Please select a smaller file.`, 'danger');
      }
      return false;
    }
    return true;
  },

  /**
   * Frame-busting: Prevents the page from being embedded in an iframe.
   */
  preventFraming() {
    if (window.self !== window.top) {
      try {
        window.top.location = window.self.location;
      } catch (e) {
        // Cross-origin frame — destroy content as a fallback
        document.documentElement.innerHTML = '';
      }
    }
  },

  /**
   * DevTools console warning to deter Self-XSS social engineering.
   */
  showConsoleWarning() {
    if (typeof console !== 'undefined') {
      console.log(
        '%c⚠️ STOP!',
        'color: #e74c3c; font-size: 48px; font-weight: bold; text-shadow: 2px 2px 0 #333;'
      );
      console.log(
        '%cThis is a browser feature intended for developers.\nIf someone told you to copy-paste something here to "unlock" a feature or "hack" something, it is a scam and will give them access to your data.',
        'font-size: 14px; color: #f39c12; font-weight: 600; line-height: 1.5;'
      );
      console.log(
        '%cFor more info: https://en.wikipedia.org/wiki/Self-XSS',
        'font-size: 12px; color: #888;'
      );
    }
  }
};

window.Security = Security;
export default Security;

/**
 * ToolHub Pro - Global Footer Component
 * Dynamically renders the simplified footer.
 */
function getRootPath() {
  const loc = window.location.pathname;
  if (loc.includes('/tools/')) {
    return '../../';
  }
  return './';
}

const FooterComponent = {
  render() {
    const footerEl = document.getElementById('global-footer');
    if (!footerEl) return;

    const rootPath = getRootPath();
    const currentYear = new Date().getFullYear();

    footerEl.className = 'global-footer';
    footerEl.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 20px 0; border-top: 1px solid var(--border-color); width: 100%; margin-top: 40px; font-size: 0.85rem; color: var(--text-secondary);">
        <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; color: var(--text-primary);">
          <span>ToolHub Pro</span>
        </div>
        <div style="display: flex; gap: 16px; flex-wrap: wrap; justify-content: center;">
          <a href="${rootPath}privacy.html">Privacy Policy</a>
          <a href="${rootPath}terms.html">Terms of Service</a>
          <a href="${rootPath}disclaimer.html">Disclaimer</a>
          <a href="${rootPath}index.html#faq">FAQ</a>
        </div>
        <div>&copy; ${currentYear} ToolHub Pro. developed by <a href="https://realatulsah.github.io/site/" target="_blank" rel="noopener noreferrer" style="color: var(--accent); text-decoration: none; font-weight: 500;">Atul Sah</a> All rights reserved.</div>
      </div>
    `;
  }
};

window.FooterComponent = FooterComponent;
export default FooterComponent;

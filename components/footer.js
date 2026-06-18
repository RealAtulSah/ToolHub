/**
 * ToolHub Pro - Global Footer Component
 * Dynamically renders the footer sections.
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
      <div class="footer-content">
        <div class="footer-brand">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="logo-icon" style="background: linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%); width: 28px; height: 28px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; color: white; font-size: 1rem; font-weight: bold;">T</div>
            <span style="font-family: var(--font-heading); font-weight: 700; font-size: 1.15rem;">ToolHub Pro</span>
          </div>
          <p>Complete All-in-One Tools suite. 100% serverless, private, and client-side processing directly inside your browser.</p>
        </div>

        <div class="footer-section">
          <h4>Product</h4>
          <div class="footer-links">
            <a href="${rootPath}index.html#image-tools">Image Tools</a>
            <a href="${rootPath}index.html#pdf-tools">PDF Tools</a>
            <a href="${rootPath}index.html#converter-tools">Converter Tools</a>
          </div>
        </div>

        <div class="footer-section">
          <h4>Legal</h4>
          <div class="footer-links">
            <a href="${rootPath}privacy.html">Privacy Policy</a>
            <a href="${rootPath}terms.html">Terms of Service</a>
            <a href="${rootPath}disclaimer.html">Disclaimer</a>
          </div>
        </div>

        <div class="footer-section">
          <h4>Quick Links</h4>
          <div class="footer-links">
            <a href="${rootPath}index.html">Homepage</a>
            <a href="${rootPath}index.html#faq">FAQ</a>
            <a href="https://github.com" target="_blank" rel="noopener">GitHub Project</a>
          </div>
        </div>
      </div>

      <div class="footer-bottom">
        <div>&copy; ${currentYear} ToolHub Pro. All rights reserved.</div>
        <div style="display: flex; gap: 16px;">
          <span>Optimized for Lighthouse 98+</span>
          <span>No Backend, 100% Secure</span>
        </div>
      </div>
    `;
  }
};

window.FooterComponent = FooterComponent;
export default FooterComponent;

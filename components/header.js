/**
 * ToolHub Pro - Global Header Component
 * Dynamically renders the header and binds event listeners.
 */
function getRootPath() {
  const loc = window.location.pathname;
  if (loc.includes('/tools/')) {
    return '../../';
  }
  return './';
}

const HeaderComponent = {
  render(toolsData = null) {
    const headerEl = document.getElementById('global-header');
    if (!headerEl) return;

    const tools = toolsData || window.allTools || [];
    const rootPath = getRootPath();
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';

    // Segment tools
    const imageTools = tools.filter(t => t.category === 'image');
    const pdfTools = tools.filter(t => t.category === 'pdf');
    const converterTools = tools.filter(t => t.category === 'converter');

    // Build lists HTML
    const imageToolsHtml = imageTools.map(t => `<li><a href="${rootPath}${t.path}">${t.name}</a></li>`).join('');
    const pdfToolsHtml = pdfTools.map(t => `<li><a href="${rootPath}${t.path}">${t.name}</a></li>`).join('');
    const converterToolsHtml = converterTools.map(t => `<li><a href="${rootPath}${t.path}">${t.name}</a></li>`).join('');

    headerEl.className = 'global-header glass-panel';
    headerEl.innerHTML = `
      <div class="header-left">
        <a href="${rootPath}index.html" class="header-logo">
          <div class="logo-icon" style="background: linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%); width: 26px; height: 26px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; color: white; font-size: 0.9rem; font-weight: bold;">T</div>
          <span class="logo-text">ToolHub Pro</span>
        </a>
        
        <nav class="tools-nav-menu">
          <!-- Image Tools Dropdown -->
          <div class="tools-dropdown-container">
            <button class="tools-dropdown-trigger" id="img-dropdown-btn">
              Image Tools
              <svg class="dropdown-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <div class="tools-dropdown-menu">
              <ul class="dropdown-list scrollbar-custom">
                ${imageToolsHtml || '<li style="padding: 6px 12px; font-size: 0.75rem; color: var(--text-muted);">Loading...</li>'}
              </ul>
            </div>
          </div>

          <!-- PDF Tools Dropdown -->
          <div class="tools-dropdown-container">
            <button class="tools-dropdown-trigger" id="pdf-dropdown-btn">
              PDF Tools
              <svg class="dropdown-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <div class="tools-dropdown-menu">
              <ul class="dropdown-list scrollbar-custom">
                ${pdfToolsHtml || '<li style="padding: 6px 12px; font-size: 0.75rem; color: var(--text-muted);">Loading...</li>'}
              </ul>
            </div>
          </div>

          <!-- Converter Tools Dropdown -->
          <div class="tools-dropdown-container">
            <button class="tools-dropdown-trigger" id="conv-dropdown-btn">
              Converter Tools
              <svg class="dropdown-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <div class="tools-dropdown-menu">
              <ul class="dropdown-list scrollbar-custom">
                ${converterToolsHtml || '<li style="padding: 6px 12px; font-size: 0.75rem; color: var(--text-muted);">Loading...</li>'}
              </ul>
            </div>
          </div>
        </nav>
      </div>
      
      <div class="header-search">
        <span class="search-icon">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </span>
        <input type="text" placeholder="Search tools... (Press '/' to focus)" aria-label="Search tools" id="nav-search-input">
        <span class="search-kbd">/</span>
      </div>

      <div class="header-actions">
        <button id="theme-toggle" class="btn-icon" title="Toggle Dark/Light Mode">
          ${currentTheme === 'dark' 
            ? '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"></path></svg>'
            : '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>'
          }
        </button>
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    // Theme Toggle listener
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn && window.ThemeEngine) {
      themeBtn.addEventListener('click', () => {
        window.ThemeEngine.toggleTheme();
      });
    }

    // Dropdowns click behavior
    const dropdownContainers = document.querySelectorAll('.tools-dropdown-container');
    dropdownContainers.forEach(container => {
      const trigger = container.querySelector('.tools-dropdown-trigger');
      if (trigger) {
        trigger.onclick = (e) => {
          e.stopPropagation();
          // Close other dropdowns
          dropdownContainers.forEach(other => {
            if (other !== container) other.classList.remove('open');
          });
          container.classList.toggle('open');
        };
      }
    });

    // Close dropdowns on outside clicks
    document.addEventListener('click', () => {
      dropdownContainers.forEach(container => container.classList.remove('open'));
    });

    // Close dropdowns on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        dropdownContainers.forEach(container => container.classList.remove('open'));
      }
    });

    // Search Input listeners (Delegated to search.js or app.js)
    const searchInput = document.getElementById('nav-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        window.dispatchEvent(new CustomEvent('globalSearch', { detail: { query: e.target.value } }));
      });
    }
  }
};

window.HeaderComponent = HeaderComponent;
export default HeaderComponent;

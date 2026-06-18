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
  render() {
    const headerEl = document.getElementById('global-header');
    if (!headerEl) return;

    const rootPath = getRootPath();
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    
    headerEl.className = 'global-header glass-panel';
    headerEl.innerHTML = `
      <div class="menu-toggle-btn btn-icon" id="sidebar-toggle-btn" style="display: none; align-items: center; justify-content: center;">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"></path>
        </svg>
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
        <a href="${rootPath}index.html#favorites" class="btn-icon" title="View Favorites" style="display: flex; align-items: center; justify-content: center;">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
          </svg>
        </a>
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

    // Sidebar Mobile Toggle listener
    const sidebarToggle = document.getElementById('sidebar-toggle-btn');
    const sidebar = document.getElementById('global-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        if (overlay) overlay.classList.toggle('active');
      });
    }

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

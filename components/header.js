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

    // Fetch favorites
    const favIds = window.StorageEngine ? window.StorageEngine.getFavorites() : [];
    const favTools = tools.filter(t => favIds.includes(t.id));
    const favToolsHtml = favTools.length > 0
      ? favTools.map(t => `<li><a href="${rootPath}${t.path}">★ ${t.name}</a></li>`).join('')
      : '<li style="padding: 12px; font-size: 0.8rem; color: var(--text-muted); text-align: center;">No favorites added yet.</li>';

    headerEl.className = 'global-header glass-panel';
    headerEl.innerHTML = `
      <div class="header-left">
        <a href="${rootPath}index.html" class="header-logo">
          <img src="${rootPath}assets/images/logo.png" alt="ToolHub Pro Logo" class="logo-image" style="height: 28px; width: auto; object-fit: contain;">
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

          <!-- Favorites Dropdown -->
          <div class="tools-dropdown-container" id="fav-dropdown-container">
            <button class="tools-dropdown-trigger" id="fav-dropdown-btn" style="color: #f59e0b;">
              ★ Favorites
              <svg class="dropdown-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <div class="tools-dropdown-menu" style="width: 300px;">
              <ul class="dropdown-list scrollbar-custom" id="header-fav-list" style="grid-template-columns: 1fr;">
                ${favToolsHtml}
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
        <button class="mobile-menu-toggle btn-icon" id="mobile-menu-btn" aria-label="Toggle Mobile Navigation" style="display: none;">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>
      </div>

      <!-- Mobile Navigation Side Drawer -->
      <div class="mobile-drawer-overlay" id="mobile-drawer-overlay"></div>
      <div class="mobile-nav-drawer" id="mobile-nav-drawer">
        <div class="drawer-header">
          <img src="${rootPath}assets/images/logo.png" alt="ToolHub Pro Logo" class="logo-image" style="height: 24px; width: auto; object-fit: contain;">
          <button class="drawer-close-btn" id="drawer-close-btn" style="background:none; border:none; font-size:1.75rem; line-height:1; cursor:pointer; color:var(--text-secondary);">&times;</button>
        </div>
        <div class="drawer-content scrollbar-custom" style="flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:20px;">
          <!-- Search in mobile drawer -->
          <div class="drawer-search" style="position:relative; width:100%;">
            <input type="text" placeholder="Search tools..." id="drawer-search-input" style="width:100%; background:var(--bg-tertiary); border:1px solid var(--border-color); padding:10px 16px; border-radius:var(--radius-md); color:var(--text-primary);">
          </div>
          
          <!-- Drawer Favorites -->
          <div class="drawer-section">
            <h4 class="drawer-section-title" style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted); margin-bottom:10px; font-weight:700;">★ Favorites</h4>
            <ul class="drawer-fav-list" id="mobile-drawer-fav-list" style="display:flex; flex-direction:column; gap:6px; list-style:none; padding:0;">
              ${favToolsHtml}
            </ul>
          </div>

          <!-- Drawer Categories Accordions -->
          <div class="drawer-section" style="display:flex; flex-direction:column; gap:12px;">
            <h4 class="drawer-section-title" style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted); margin-bottom:4px; font-weight:700;">Categories</h4>
            
            <details class="drawer-details" style="border:1px solid var(--border-color); border-radius:var(--radius-md); background:var(--bg-tertiary); overflow:hidden;">
              <summary style="padding:12px; font-weight:600; font-size:0.9rem; cursor:pointer; user-select:none; color:var(--text-primary); display:flex; justify-content:space-between; align-items:center;">Image Tools</summary>
              <ul style="list-style:none; padding:8px 12px; border-top:1px solid var(--border-color); background:var(--bg-secondary); display:flex; flex-direction:column; gap:6px; max-height:250px; overflow-y:auto;" class="scrollbar-custom">
                ${imageToolsHtml}
              </ul>
            </details>

            <details class="drawer-details" style="border:1px solid var(--border-color); border-radius:var(--radius-md); background:var(--bg-tertiary); overflow:hidden;">
              <summary style="padding:12px; font-weight:600; font-size:0.9rem; cursor:pointer; user-select:none; color:var(--text-primary); display:flex; justify-content:space-between; align-items:center;">PDF Tools</summary>
              <ul style="list-style:none; padding:8px 12px; border-top:1px solid var(--border-color); background:var(--bg-secondary); display:flex; flex-direction:column; gap:6px; max-height:250px; overflow-y:auto;" class="scrollbar-custom">
                ${pdfToolsHtml}
              </ul>
            </details>

            <details class="drawer-details" style="border:1px solid var(--border-color); border-radius:var(--radius-md); background:var(--bg-tertiary); overflow:hidden;">
              <summary style="padding:12px; font-weight:600; font-size:0.9rem; cursor:pointer; user-select:none; color:var(--text-primary); display:flex; justify-content:space-between; align-items:center;">Converter Tools</summary>
              <ul style="list-style:none; padding:8px 12px; border-top:1px solid var(--border-color); background:var(--bg-secondary); display:flex; flex-direction:column; gap:6px; max-height:250px; overflow-y:auto;" class="scrollbar-custom">
                ${converterToolsHtml}
              </ul>
            </details>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(tools, rootPath);
  },

  bindEvents(tools, rootPath) {
    // Theme Toggle listener
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn && window.ThemeEngine) {
      themeBtn.addEventListener('click', () => {
        window.ThemeEngine.toggleTheme();
      });
    }

    // Dropdowns click behavior (fallback for mobile/touch or debug toggle)
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
        closeDrawer();
      }
    });

    // Search Input listeners (Delegated to search.js or app.js)
    const searchInput = document.getElementById('nav-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        window.dispatchEvent(new CustomEvent('globalSearch', { detail: { query: e.target.value } }));
      });
    }

    // Mobile Navigation Drawer Toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const drawerOverlay = document.getElementById('mobile-drawer-overlay');
    const navDrawer = document.getElementById('mobile-nav-drawer');
    const drawerCloseBtn = document.getElementById('drawer-close-btn');

    function openDrawer() {
      if (navDrawer && drawerOverlay) {
        navDrawer.classList.add('open');
        drawerOverlay.classList.add('open');
        document.body.style.overflow = 'hidden'; // prevent bg scroll
      }
    }

    function closeDrawer() {
      if (navDrawer && drawerOverlay) {
        navDrawer.classList.remove('open');
        drawerOverlay.classList.remove('open');
        document.body.style.overflow = '';
      }
    }

    if (mobileMenuBtn) {
      mobileMenuBtn.onclick = (e) => {
        e.stopPropagation();
        openDrawer();
      };
    }

    if (drawerCloseBtn) {
      drawerCloseBtn.onclick = closeDrawer;
    }

    if (drawerOverlay) {
      drawerOverlay.onclick = closeDrawer;
    }

    // Drawer Search Input listener
    const drawerSearch = document.getElementById('drawer-search-input');
    if (drawerSearch) {
      drawerSearch.addEventListener('input', (e) => {
        window.dispatchEvent(new CustomEvent('globalSearch', { detail: { query: e.target.value } }));
      });
    }

    // Dynamic favorites updates
    window.addEventListener('favoritesChanged', () => {
      this.updateFavorites(tools, rootPath);
    });
  },

  updateFavorites(tools, rootPath) {
    const listEl = document.getElementById('header-fav-list');
    const mobileFavEl = document.getElementById('mobile-drawer-fav-list');
    
    const favIds = window.StorageEngine ? window.StorageEngine.getFavorites() : [];
    const favTools = tools.filter(t => favIds.includes(t.id));
    
    const html = favTools.length > 0
      ? favTools.map(t => `<li><a href="${rootPath}${t.path}">★ ${t.name}</a></li>`).join('')
      : '<li style="padding: 12px; font-size: 0.8rem; color: var(--text-muted); text-align: center;">No favorites added yet.</li>';
      
    if (listEl) listEl.innerHTML = html;
    if (mobileFavEl) mobileFavEl.innerHTML = html;
  }
};

window.HeaderComponent = HeaderComponent;
export default HeaderComponent;

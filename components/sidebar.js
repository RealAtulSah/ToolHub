/**
 * ToolHub Pro - Global Sidebar Component
 * Renders categories with tool counts, dynamic favorites, and recently used tools list.
 */
function getRootPath() {
  const loc = window.location.pathname;
  if (loc.includes('/tools/')) {
    return '../../';
  }
  return './';
}

const SidebarComponent = {
  tools: [],

  async render(toolsData = []) {
    const sidebarEl = document.getElementById('global-sidebar');
    if (!sidebarEl) return;

    this.tools = toolsData.length ? toolsData : (window.allTools || []);
    const rootPath = getRootPath();

    // Calculate counts
    const imageCount = this.tools.filter(t => t.category === 'image').length;
    const pdfCount = this.tools.filter(t => t.category === 'pdf').length;
    const converterCount = this.tools.filter(t => t.category === 'converter').length;

    // Get current category active state
    const currentLoc = window.location.pathname;
    const isImageActive = currentLoc.includes('/tools/image/') ? 'active' : '';
    const isPdfActive = currentLoc.includes('/tools/pdf/') ? 'active' : '';
    const isConverterActive = currentLoc.includes('/tools/converter/') ? 'active' : '';
    const isHomeActive = (!isImageActive && !isPdfActive && !isConverterActive) ? 'active' : '';

    sidebarEl.innerHTML = `
      <div class="sidebar-logo">
        <div class="logo-icon">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11 4a2 2 0 114 0v1a2 2 0 01-2 2H3a2 2 0 01-2-2V4a2 2 0 012-2h8zM19 10a2 2 0 114 0v1a2 2 0 01-2 2h-8a2 2 0 01-2-2v-1a2 2 0 012-2h6zM7 16a2 2 0 114 0v1a2 2 0 01-2 2H3a2 2 0 01-2-2v-1a2 2 0 012-2h4z"></path>
          </svg>
        </div>
        <span class="logo-text">ToolHub Pro</span>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section-title">Navigation</div>
        <ul class="nav-list">
          <li class="nav-item ${isHomeActive}">
            <a href="${rootPath}index.html">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
              </svg>
              Home
            </a>
          </li>
        </ul>

        <div class="nav-section-title">Categories</div>
        <ul class="nav-list">
          <li class="nav-item ${isImageActive}">
            <a href="${rootPath}index.html#image-tools">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              Image Tools
              <span class="count-badge">${imageCount || 40}</span>
            </a>
          </li>
          <li class="nav-item ${isPdfActive}">
            <a href="${rootPath}index.html#pdf-tools">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              PDF Tools
              <span class="count-badge">${pdfCount || 40}</span>
            </a>
          </li>
          <li class="nav-item ${isConverterActive}">
            <a href="${rootPath}index.html#converter-tools">
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
              </svg>
              Converter Tools
              <span class="count-badge">${converterCount || 40}</span>
            </a>
          </li>
        </ul>

        <div class="nav-section-title">Recently Used</div>
        <ul class="nav-list" id="sidebar-recent-list">
          <li class="empty-state" style="font-size: 0.8rem; padding: 10px 0;">No tools recently used</li>
        </ul>

        <div class="nav-section-title">Favorites</div>
        <ul class="nav-list" id="sidebar-fav-list">
          <li class="empty-state" style="font-size: 0.8rem; padding: 10px 0;">No favorites added</li>
        </ul>
      </nav>
    `;

    this.updateFavoritesList();
    this.updateRecentlyUsedList();
    this.bindEvents();
  },

  updateFavoritesList() {
    const favListEl = document.getElementById('sidebar-fav-list');
    if (!favListEl || !window.StorageEngine) return;

    const rootPath = getRootPath();
    const favIds = window.StorageEngine.getFavorites();
    const favTools = this.tools.filter(t => favIds.includes(t.id));

    if (favTools.length === 0) {
      favListEl.innerHTML = '<li class="empty-state" style="font-size: 0.75rem; padding: 10px 8px;">No favorites added</li>';
      return;
    }

    const esc = window.Security ? window.Security.escapeHtml.bind(window.Security) : (s) => s;
    favListEl.innerHTML = favTools.map(t => `
      <li class="nav-item">
        <a href="${rootPath}${esc(t.path)}" style="padding: 6px 12px; font-size: 0.85rem;">
          <span style="color: hsl(350, 89%, 60%); font-size: 1rem;">★</span>
          ${esc(t.name)}
        </a>
      </li>
    `).join('');
  },

  updateRecentlyUsedList() {
    const recentListEl = document.getElementById('sidebar-recent-list');
    if (!recentListEl || !window.StorageEngine) return;

    const rootPath = getRootPath();
    const recentIds = window.StorageEngine.getRecentlyUsed();
    const recentTools = recentIds
      .map(id => this.tools.find(t => t.id === id))
      .filter(Boolean);

    if (recentTools.length === 0) {
      recentListEl.innerHTML = '<li class="empty-state" style="font-size: 0.75rem; padding: 10px 8px;">No tools recently used</li>';
      return;
    }

    const esc = window.Security ? window.Security.escapeHtml.bind(window.Security) : (s) => s;
    recentListEl.innerHTML = recentTools.map(t => `
      <li class="nav-item">
        <a href="${rootPath}${esc(t.path)}" style="padding: 6px 12px; font-size: 0.85rem;">
          <span style="color: var(--accent); font-size: 1rem;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; display: inline-block; vertical-align: middle;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></span>
          ${esc(t.name)}
        </a>
      </li>
    `).join('');
  },

  bindEvents() {
    // Listen for storage events
    window.addEventListener('favoritesChanged', () => this.updateFavoritesList());
    window.addEventListener('recentlyUsedChanged', () => this.updateRecentlyUsedList());
    
    // Support close on click for mobile devices
    const sidebarEl = document.getElementById('global-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebarEl && overlay) {
      overlay.addEventListener('click', () => {
        sidebarEl.classList.remove('active');
        overlay.classList.remove('active');
      });
    }
  }
};

window.SidebarComponent = SidebarComponent;
export default SidebarComponent;

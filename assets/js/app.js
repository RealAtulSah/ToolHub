/**
 * ToolHub Pro - Main Application Controller
 * Bootstraps the platform, loads tools database, and connects UI components.
 */
import ThemeEngine from './theme.js';
import StorageEngine from './storage.js';
import SearchEngine from './search.js';
import HeaderComponent from '../../components/header.js';
import SidebarComponent from '../../components/sidebar.js';
import FooterComponent from '../../components/footer.js';

// Global references
window.allTools = [];
window.showToast = showToast;

function getRootPath() {
  const loc = window.location.pathname;
  if (loc.includes('/tools/')) {
    return '../../';
  }
  return './';
}

document.addEventListener('DOMContentLoaded', async () => {
  // PWA setup
  injectPwaLinks();
  registerServiceWorker();

  // 1. Initialize core engines
  ThemeEngine.init();
  
  // 2. Fetch and load tools database
  try {
    const rootPath = getRootPath();
    const response = await fetch(`${rootPath}data/tools.json`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    window.allTools = await response.json();
    
    // Initialize Search engine
    SearchEngine.init(window.allTools);

    // 3. Render layout components
    HeaderComponent.render(window.allTools);
    SidebarComponent.render(window.allTools);
    FooterComponent.render();

    // 4. Render index lists (if on the home page)
    if (document.getElementById('image-tools-grid')) {
      renderHomepage();
    }

  } catch (error) {
    console.error('Failed to load tools database:', error);
    showToast('Failed to load tools configuration. Please refresh.', 'danger');
  }

  // 5. Connect Global Events
  bindGlobalEvents();
});

/**
 * Render all grids on the homepage
 */
function renderHomepage() {
  const rootPath = getRootPath();
  const imageGrid = document.getElementById('image-tools-grid');
  const pdfGrid = document.getElementById('pdf-tools-grid');
  const converterGrid = document.getElementById('converter-tools-grid');

  if (imageGrid) {
    const imageTools = window.allTools.filter(t => t.category === 'image');
    imageGrid.innerHTML = imageTools.map(t => createToolCardHtml(t, rootPath)).join('');
  }
  if (pdfGrid) {
    const pdfTools = window.allTools.filter(t => t.category === 'pdf');
    pdfGrid.innerHTML = pdfTools.map(t => createToolCardHtml(t, rootPath)).join('');
  }
  if (converterGrid) {
    const converterTools = window.allTools.filter(t => t.category === 'converter');
    converterGrid.innerHTML = converterTools.map(t => createToolCardHtml(t, rootPath)).join('');
  }

  // Render favorites and recently used
  renderFavoritesGrid();
  renderRecentGrid();

  // Attach card click handlers for favorites & recent list updates
  attachCardListeners();
}

/**
 * Creates HTML string for a tool card
 */
function createToolCardHtml(tool, rootPath) {
  const isFav = StorageEngine.isFavorite(tool.id);
  const badgeClass = tool.popular ? 'popular' : tool.trending ? 'trending' : '';
  const badgeText = tool.popular ? 'Popular' : tool.trending ? 'Trending' : '';
  const badgeHtml = badgeText ? `<span class="tool-badge ${badgeClass}">${badgeText}</span>` : '';

  return `
    <div class="tool-card glass-panel" data-id="${tool.id}">
      <button class="favorite-btn ${isFav ? 'active' : ''}" aria-label="Toggle Favorite">
        ${isFav ? '★' : '☆'}
      </button>
      <h3 class="tool-card-title">${tool.name}</h3>
      <p class="tool-card-desc">${tool.description}</p>
      <div class="tool-card-footer">
        ${badgeHtml}
        <a href="${rootPath}${tool.path}" class="tool-card-link">Open Tool &rarr;</a>
      </div>
    </div>
  `;
}

/**
 * Attaches real-time click and interactions to grids
 */
function attachCardListeners() {
  const rootPath = getRootPath();
  document.querySelectorAll('.tool-card').forEach(card => {
    const toolId = card.getAttribute('data-id');
    
    // Favorite button click
    const favBtn = card.querySelector('.favorite-btn');
    if (favBtn) {
      favBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const added = StorageEngine.toggleFavorite(toolId);
        favBtn.classList.toggle('active', added);
        favBtn.innerHTML = added ? '★' : '☆';
        showToast(
          added ? `Added "${card.querySelector('.tool-card-title').innerText}" to favorites.` : `Removed from favorites.`,
          added ? 'success' : 'info'
        );
      });
    }

    // Whole card click (excluding favorite button clicks)
    card.addEventListener('click', (e) => {
      if (e.target.closest('.favorite-btn')) return;
      
      const tool = window.allTools.find(t => t.id === toolId);
      if (tool) {
        StorageEngine.addRecentlyUsed(toolId);
        window.location.href = `${rootPath}${tool.path}`;
      }
    });
  });
}

/**
 * Renders Favorites Section Grid
 */
function renderFavoritesGrid() {
  const container = document.getElementById('favorites-section');
  const grid = document.getElementById('favorites-grid');
  if (!container || !grid) return;

  const rootPath = getRootPath();
  const favIds = StorageEngine.getFavorites();
  const favTools = window.allTools.filter(t => favIds.includes(t.id));

  if (favTools.length === 0) {
    container.style.display = 'none';
  } else {
    container.style.display = 'block';
    grid.innerHTML = favTools.map(t => createToolCardHtml(t, rootPath)).join('');
    attachCardListeners();
  }
}

/**
 * Renders Recently Used Section Grid
 */
function renderRecentGrid() {
  const container = document.getElementById('recent-section');
  const grid = document.getElementById('recent-grid');
  if (!container || !grid) return;

  const rootPath = getRootPath();
  const recentIds = StorageEngine.getRecentlyUsed();
  const recentTools = recentIds
    .map(id => window.allTools.find(t => t.id === id))
    .filter(Boolean);

  if (recentTools.length === 0) {
    container.style.display = 'none';
  } else {
    container.style.display = 'block';
    grid.innerHTML = recentTools.map(t => createToolCardHtml(t, rootPath)).join('');
    attachCardListeners();
  }
}

/**
 * Binds search bar typing and other global triggers
 */
function bindGlobalEvents() {
  const rootPath = getRootPath();
  const mainSearchInput = document.getElementById('main-search-input');
  
  // Real-time search handler (Homepage main search bar)
  if (mainSearchInput) {
    const performSearch = SearchEngine.debounce((query) => {
      const resultsSection = document.getElementById('search-results-section');
      const resultsGrid = document.getElementById('search-results-grid');
      const categoriesSection = document.getElementById('categories-section');
      const imageSection = document.getElementById('image-tools');
      const pdfSection = document.getElementById('pdf-tools');
      const converterSection = document.getElementById('converter-tools');

      if (!query || query.trim() === '') {
        // Hide search view, restore normal categories
        if (resultsSection) resultsSection.classList.remove('active');
        if (categoriesSection) categoriesSection.style.display = 'block';
        if (imageSection) imageSection.style.display = 'block';
        if (pdfSection) pdfSection.style.display = 'block';
        if (converterSection) converterSection.style.display = 'block';
        return;
      }

      // Hide core grids, show search results
      if (categoriesSection) categoriesSection.style.display = 'none';
      if (imageSection) imageSection.style.display = 'none';
      if (pdfSection) pdfSection.style.display = 'none';
      if (converterSection) converterSection.style.display = 'none';
      
      const results = SearchEngine.search(query);
      if (resultsSection && resultsGrid) {
        resultsSection.classList.add('active');
        if (results.length === 0) {
          resultsGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
              <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <h3>No matching tools found</h3>
              <p style="margin-top: 8px;">Try searching for other keywords, or browse categories below.</p>
            </div>
          `;
        } else {
          resultsGrid.innerHTML = results.map(t => createToolCardHtml(t, rootPath)).join('');
          attachCardListeners();
        }
      }
    }, 200);

    mainSearchInput.addEventListener('input', (e) => {
      performSearch(e.target.value);
    });

    mainSearchInput.addEventListener('keydown', (e) => {
      const resultsGrid = document.getElementById('search-results-grid');
      if (resultsGrid && document.getElementById('search-results-section').classList.contains('active')) {
        SearchEngine.handleKeyboardNavigation(e, resultsGrid);
      }
    });
  }

  // Event to link header search bar changes to home page search
  window.addEventListener('globalSearch', (e) => {
    const { query } = e.detail;
    if (mainSearchInput) {
      mainSearchInput.value = query;
      mainSearchInput.dispatchEvent(new Event('input'));
    }
  });

  // Re-render favorite grid on changes
  window.addEventListener('favoritesChanged', () => {
    renderFavoritesGrid();
    if (window.SidebarComponent) {
      window.SidebarComponent.updateFavoritesList();
    }
  });
}

/**
 * Displays premium Toast alerts
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = '';
  if (type === 'success') icon = '';
  if (type === 'warning') icon = '';
  if (type === 'danger') icon = '';

  toast.innerHTML = `
    <span>${icon}</span>
    <div>${message}</div>
  `;

  container.appendChild(toast);

  // Auto remove after 3.5s
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}

window.showPreviewModal = function(blob, filename) {
  // Remove existing modal if any
  const existing = document.getElementById('preview-modal-container');
  if (existing) existing.remove();

  // Create elements
  const overlay = document.createElement('div');
  overlay.id = 'preview-modal-container';
  overlay.className = 'preview-modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'preview-modal';

  // Header
  const header = document.createElement('div');
  header.className = 'preview-modal-header';
  header.innerHTML = `
    <h3 class="preview-modal-title">Preview: ${filename}</h3>
    <button class="preview-modal-close" id="pm-close-btn">&times;</button>
  `;
  modal.appendChild(header);

  // Body
  const body = document.createElement('div');
  body.className = 'preview-modal-body';
  modal.appendChild(body);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'preview-modal-footer';
  footer.innerHTML = `
    <button class="btn btn-secondary" id="pm-cancel-btn">Close</button>
    <button class="btn btn-primary" id="pm-download-btn">Download File</button>
  `;
  modal.appendChild(footer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const url = URL.createObjectURL(blob);

  // Handle render based on type
  const type = blob.type;
  if (type === 'application/pdf') {
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.borderRadius = 'var(--radius-md)';
    body.appendChild(iframe);
  } else if (type.startsWith('image/')) {
    const img = document.createElement('img');
    img.src = url;
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    img.style.objectFit = 'contain';
    img.style.borderRadius = 'var(--radius-md)';
    body.appendChild(img);
  } else if (type === 'text/plain' || type === 'application/json' || type === 'text/csv' || type === 'text/xml' || type.startsWith('text/') || type.startsWith('application/javascript') || type.startsWith('application/xml')) {
    const pre = document.createElement('pre');
    pre.style.width = '100%';
    pre.style.height = '100%';
    pre.style.margin = '0';
    pre.style.padding = '16px';
    pre.style.background = 'var(--bg-secondary)';
    pre.style.border = '1px solid var(--border-color)';
    pre.style.borderRadius = 'var(--radius-md)';
    pre.style.overflow = 'auto';
    pre.style.fontFamily = 'var(--font-mono)';
    pre.style.fontSize = '0.9rem';
    pre.style.color = 'var(--text-primary)';
    pre.style.whiteSpace = 'pre-wrap';
    pre.style.wordBreak = 'break-all';
    pre.style.textAlign = 'left';

    blob.text().then(text => {
      pre.textContent = text;
    });
    body.appendChild(pre);
  } else {
    // Unsupported or general binary (like ZIP, Excel, Word)
    const info = document.createElement('div');
    info.className = 'preview-modal-info';
    info.innerHTML = `
      <p style="font-size: 1.1rem; margin-bottom: 8px;">Preview is not supported for this file format.</p>
      <p style="font-size: 0.9rem; color: var(--text-muted);">Please click Download below to save your file.</p>
    `;
    body.appendChild(info);
  }

  // Show transition
  setTimeout(() => {
    overlay.classList.add('active');
  }, 10);

  // Event handlers
  const cleanup = () => {
    overlay.classList.remove('active');
    setTimeout(() => {
      overlay.remove();
      URL.revokeObjectURL(url);
    }, 200);
  };

  overlay.querySelector('#pm-close-btn').onclick = cleanup;
  overlay.querySelector('#pm-cancel-btn').onclick = cleanup;
  overlay.querySelector('#pm-download-btn').onclick = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    cleanup();
  };

  // Close on Escape or clicking outside
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cleanup();
  });
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      cleanup();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
};

function injectPwaLinks() {
  const rootPath = getRootPath();
  
  // 1. Favicon (standard)
  let faviconLink = document.querySelector('link[rel="icon"]');
  if (!faviconLink) {
    faviconLink = document.createElement('link');
    faviconLink.rel = 'icon';
    document.head.appendChild(faviconLink);
  }
  faviconLink.href = `${rootPath}assets/images/favicon.ico`;
  faviconLink.type = 'image/x-icon';

  // 2. Apple touch icon
  let appleTouchLink = document.querySelector('link[rel="apple-touch-icon"]');
  if (!appleTouchLink) {
    appleTouchLink = document.createElement('link');
    appleTouchLink.rel = 'apple-touch-icon';
    document.head.appendChild(appleTouchLink);
  }
  appleTouchLink.href = `${rootPath}assets/images/icon-192.png`;

  // 3. Web manifest
  let manifestLink = document.querySelector('link[rel="manifest"]');
  if (!manifestLink) {
    manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    document.head.appendChild(manifestLink);
  }
  manifestLink.href = `${rootPath}manifest.json`;
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const rootPath = getRootPath();
      navigator.serviceWorker.register(`${rootPath}sw.js`)
        .then(reg => console.log('ServiceWorker registered:', reg.scope))
        .catch(err => console.error('ServiceWorker registration failed:', err));
    });
  }
}


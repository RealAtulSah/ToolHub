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
    HeaderComponent.render();
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
      <div class="tool-card-header">
        <div class="tool-card-icon">
          <!-- Stand-in icon text (SVG mapping will follow in tools phase) -->
          <span style="font-size: 1.15rem; font-weight: bold;">
            ${tool.name.charAt(0)}
          </span>
        </div>
        <button class="favorite-btn ${isFav ? 'active' : ''}" aria-label="Toggle Favorite">
          ${isFav ? '★' : '☆'}
        </button>
      </div>
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

    // Card click (excluding favorite button clicks) to add to recently used
    const link = card.querySelector('.tool-card-link');
    if (link) {
      link.addEventListener('click', () => {
        StorageEngine.addRecentlyUsed(toolId);
      });
    }
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

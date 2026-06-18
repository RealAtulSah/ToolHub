/**
 * ToolHub Pro - Search Engine
 * Implements real-time filtering, debouncing, keyword matching, and keyboard navigation.
 */
const SearchEngine = {
  tools: [],
  debounceTimeout: null,

  init(toolsData) {
    this.tools = toolsData;
    this.setupGlobalShortcuts();
  },

  // Debouncing wrapper
  debounce(func, delay = 200) {
    return (...args) => {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = setTimeout(() => func.apply(this, args), delay);
    };
  },

  // Search logic
  search(query) {
    if (!query || query.trim() === '') {
      return [];
    }

    const cleanQuery = query.toLowerCase().trim();
    
    return this.tools.filter(tool => {
      const matchName = tool.name.toLowerCase().includes(cleanQuery);
      const matchCategory = tool.category.toLowerCase().includes(cleanQuery);
      const matchDesc = tool.description.toLowerCase().includes(cleanQuery);
      const matchKeywords = tool.keywords && tool.keywords.some(kw => kw.toLowerCase().includes(cleanQuery));

      return matchName || matchCategory || matchDesc || matchKeywords;
    });
  },

  // Setup '/' key to focus search
  setupGlobalShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Focus on '/' key, but not when user is typing in form inputs
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const searchInput = document.querySelector('.hero-search-input') || document.querySelector('.header-search input');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    });
  },

  // Keyboard navigation for search list results
  handleKeyboardNavigation(event, resultsContainer, onSelect) {
    const items = resultsContainer.querySelectorAll('.tool-card');
    if (items.length === 0) return;

    let activeIndex = Array.from(items).findIndex(item => item.classList.contains('focused'));

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (activeIndex !== -1) items[activeIndex].classList.remove('focused');
      activeIndex = (activeIndex + 1) % items.length;
      items[activeIndex].classList.add('focused');
      items[activeIndex].scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (activeIndex !== -1) items[activeIndex].classList.remove('focused');
      activeIndex = (activeIndex - 1 + items.length) % items.length;
      items[activeIndex].classList.add('focused');
      items[activeIndex].scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter') {
      if (activeIndex !== -1) {
        event.preventDefault();
        const link = items[activeIndex].querySelector('.tool-card-link') || items[activeIndex];
        if (link) {
          if (typeof onSelect === 'function') {
            onSelect(items[activeIndex]);
          } else {
            link.click();
          }
        }
      }
    }
  }
};

window.SearchEngine = SearchEngine;
export default SearchEngine;

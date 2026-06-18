/**
 * ToolHub Pro - Theme Engine
 * Handles Light/Dark mode state management and persistence.
 */
const ThemeEngine = {
  storageKey: 'toolhub-theme',

  init() {
    // Determine the theme: cached preference -> system setting -> default to dark
    const savedTheme = localStorage.getItem(this.storageKey);
    if (savedTheme) {
      this.setTheme(savedTheme);
    } else {
      const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
      this.setTheme(prefersLight ? 'light' : 'dark');
    }

    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
      if (!localStorage.getItem(this.storageKey)) {
        this.setTheme(e.matches ? 'light' : 'dark');
      }
    });
  },

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(this.storageKey, theme);
    
    // Update theme toggle icons if they exist in DOM
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.innerHTML = theme === 'dark' 
        ? '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"></path></svg>'
        : '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>';
      themeBtn.setAttribute('title', `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`);
    }

    // Dispatch a global event for theme changes (useful for canvas or chart tools)
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
  },

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    this.setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  },

  getTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }
};

// Initialize theme on script load to avoid flash of unstyled content (FOUC)
ThemeEngine.init();
window.ThemeEngine = ThemeEngine;
export default ThemeEngine;

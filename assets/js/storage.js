/**
 * ToolHub Pro - LocalStorage Engine
 * Handles user preferences, favorites, and recently used tools.
 */
const StorageEngine = {
  keys: {
    favorites: 'toolhub-favorites',
    recentlyUsed: 'toolhub-recently-used',
    preferences: 'toolhub-preferences'
  },

  // --- GENERAL STORAGE WRAPPERS ---
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error(`Error reading key ${key} from LocalStorage:`, e);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error writing key ${key} to LocalStorage:`, e);
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`Error removing key ${key} from LocalStorage:`, e);
    }
  },

  // --- FAVORITES ENGINE ---
  getFavorites() {
    const data = this.get(this.keys.favorites, []);
    // Validate: must be an array of safe string IDs
    if (!Array.isArray(data)) return [];
    return data.filter(id => typeof id === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(id));
  },

  isFavorite(toolId) {
    const favorites = this.getFavorites();
    return favorites.includes(toolId);
  },

  toggleFavorite(toolId) {
    // Validate toolId format before storing
    if (typeof toolId !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(toolId)) return false;

    let favorites = this.getFavorites();
    const index = favorites.indexOf(toolId);
    let added = false;
    
    if (index === -1) {
      favorites.push(toolId);
      added = true;
    } else {
      favorites.splice(index, 1);
    }

    this.set(this.keys.favorites, favorites);
    
    // Dispatch global event so sidebar and homepage update in real-time
    window.dispatchEvent(new CustomEvent('favoritesChanged', { 
      detail: { toolId, isFavorite: added, favorites } 
    }));

    return added;
  },

  // --- RECENTLY USED ENGINE ---
  getRecentlyUsed() {
    const data = this.get(this.keys.recentlyUsed, []);
    // Validate: must be an array of safe string IDs
    if (!Array.isArray(data)) return [];
    return data.filter(id => typeof id === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(id));
  },

  addRecentlyUsed(toolId) {
    // Validate toolId format before storing
    if (typeof toolId !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(toolId)) return;

    let recentlyUsed = this.getRecentlyUsed();
    
    // Remove if already exists so we can move it to the top
    recentlyUsed = recentlyUsed.filter(id => id !== toolId);
    
    // Insert at the front (most recent)
    recentlyUsed.unshift(toolId);
    
    // Limit to top 5 tools
    if (recentlyUsed.length > 5) {
      recentlyUsed = recentlyUsed.slice(0, 5);
    }
    
    this.set(this.keys.recentlyUsed, recentlyUsed);

    // Dispatch global event
    window.dispatchEvent(new CustomEvent('recentlyUsedChanged', { 
      detail: { recentlyUsed } 
    }));
  }
};

window.StorageEngine = StorageEngine;
export default StorageEngine;

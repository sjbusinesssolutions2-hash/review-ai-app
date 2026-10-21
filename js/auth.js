// js/auth.js
const Auth = {
  init() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');

    // 1. If userId is passed via URL query, store it permanently in localStorage
    if (userId) {
      localStorage.setItem(CONFIG.STORAGE_KEYS.USER_ID, userId);
      
      // Clean up URL parameters so userId isn't exposed in address bar
      const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
    }

    // 2. Protect authenticated pages
    const currentUser = this.getUserId();
    const isLoginPage = window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('index.html');

    if (!currentUser && !isLoginPage) {
      // Redirect unauthenticated visitors to login page
      window.location.href = 'login.html';
    }
  },

  getUserId() {
    return localStorage.getItem(CONFIG.STORAGE_KEYS.USER_ID);
  },

  logout() {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_ID);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.ACTIVE_BUSINESS_ID);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_DATA);
    window.location.href = 'login.html';
  }
};

// Run auth check immediately on script load
Auth.init();

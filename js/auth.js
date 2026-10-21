// js/auth.js
const Auth = {
  init() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    const userName = urlParams.get('userName');
    const userEmail = urlParams.get('userEmail');

    if (userId) localStorage.setItem(CONFIG.STORAGE_KEYS.USER_ID, userId);
    
    // Clean and validate user name - strictly discard any business name
    if (userName) {
      const decodedName = decodeURIComponent(userName).trim();
      if (!decodedName.toLowerCase().includes('sj business') && !decodedName.toLowerCase().includes('india bat')) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER_NAME, decodedName);
      }
    }
    if (userEmail) localStorage.setItem(CONFIG.STORAGE_KEYS.USER_EMAIL, decodeURIComponent(userEmail));

    // Clean address bar parameters
    if (userId || userName) {
      const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
    }

    this.renderUserProfile();
  },

  getUserId() {
    return localStorage.getItem(CONFIG.STORAGE_KEYS.USER_ID);
  },

  renderUserProfile() {
    const avatarElem = document.getElementById('user-avatar');
    if (!avatarElem) return;

    let storedName = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_NAME) || '';
    let storedEmail = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_EMAIL) || '';

    // Hard purge: If storedName contains business name or "SJ", reject it
    if (storedName.toLowerCase().includes('sj business') || storedName.toLowerCase().includes('india bat')) {
      storedName = '';
      localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_NAME);
    }

    let initials = '';

    if (storedName) {
      const nameParts = storedName.trim().split(' ').filter(Boolean);
      if (nameParts.length >= 2) {
        initials = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
      } else if (nameParts.length === 1 && nameParts[0].length > 0) {
        initials = nameParts[0].substring(0, 2).toUpperCase();
      }
    }

    // Fallback to first letter of email if name isn't personal
    if (!initials && storedEmail) {
      initials = storedEmail[0].toUpperCase();
    }

    // Final fallback
    if (!initials) {
      initials = 'U';
    }

    avatarElem.textContent = initials;
  },

  logout() {
    localStorage.clear();
    window.location.href = 'login.html';
  }
};

document.addEventListener('DOMContentLoaded', () => Auth.init());

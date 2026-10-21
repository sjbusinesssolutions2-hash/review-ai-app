// js/auth.js
const Auth = {
  init() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    const userName = urlParams.get('userName');

    if (userId) localStorage.setItem(CONFIG.STORAGE_KEYS.USER_ID, userId);
    
    if (userName) {
      const decodedName = decodeURIComponent(userName).trim();
      const lower = decodedName.toLowerCase();
      // Block business titles from being saved as user name
      if (!lower.includes('sj business') && !lower.includes('india bat') && !lower.includes('solutions')) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER_NAME, decodedName);
      }
    }

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

    // Purge if business name leaked
    const lower = storedName.toLowerCase();
    if (lower.includes('sj business') || lower.includes('india bat') || lower.includes('solutions')) {
      storedName = '';
      localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_NAME);
    }

    let initials = '';

    if (storedName) {
      const parts = storedName.trim().split(' ').filter(Boolean);
      if (parts.length >= 2) {
        // First letter of first name + First letter of last name
        initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      } else if (parts.length === 1 && parts[0].length > 0) {
        // First two letters if only one name part exists
        initials = parts[0].substring(0, 2).toUpperCase();
      }
    }

    avatarElem.textContent = initials;
  },

  logout() {
    localStorage.clear();
    window.location.href = 'login.html';
  }
};

document.addEventListener('DOMContentLoaded', () => Auth.init());

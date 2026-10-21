// js/auth.js
const Auth = {
  init() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    const userName = urlParams.get('userName');
    const userEmail = urlParams.get('userEmail');

    if (userId) localStorage.setItem(CONFIG.STORAGE_KEYS.USER_ID, userId);
    
    if (userName) {
      const decoded = decodeURIComponent(userName).trim();
      // Only keep if it is not a business entity name
      if (!decoded.toLowerCase().includes('sj business') && !decoded.toLowerCase().includes('india bat')) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER_NAME, decoded);
      }
    }
    if (userEmail) localStorage.setItem(CONFIG.STORAGE_KEYS.USER_EMAIL, decodeURIComponent(userEmail));

    if (userId || userName) {
      const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
    }

    this.renderUserProfile();
  },

  renderUserProfile() {
    const avatarElem = document.getElementById('user-avatar');
    if (!avatarElem) return;

    let storedName = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_NAME) || '';
    let storedEmail = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_EMAIL) || '';

    let initials = '';

    if (storedName && !storedName.toLowerCase().includes('sj business')) {
      const parts = storedName.trim().split(' ').filter(Boolean);
      if (parts.length >= 2) {
        initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      } else if (parts.length === 1) {
        initials = parts[0].substring(0, 2).toUpperCase();
      }
    }

    if (!initials && storedEmail) {
      initials = storedEmail[0].toUpperCase();
    }

    if (!initials) initials = 'U';

    avatarElem.textContent = initials;
  }
};

document.addEventListener('DOMContentLoaded', () => Auth.init());

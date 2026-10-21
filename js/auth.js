// js/auth.js
const Auth = {
  async init() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    const userName = urlParams.get('userName');
    const userEmail = urlParams.get('userEmail');

    if (userId) localStorage.setItem(CONFIG.STORAGE_KEYS.USER_ID, userId);
    
    // Clear out old cached SJ names if present
    if (userName) {
      const decodedName = decodeURIComponent(userName);
      if (!decodedName.includes('SJ Business Solutions')) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER_NAME, decodedName);
      }
    }
    if (userEmail) localStorage.setItem(CONFIG.STORAGE_KEYS.USER_EMAIL, userEmail);

    if (userId || userName) {
      const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
    }

    // If name is missing from storage, fetch real profile from backend
    if (!localStorage.getItem(CONFIG.STORAGE_KEYS.USER_NAME) && this.getUserId()) {
      try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/api/user?userId=${this.getUserId()}`);
        if (res.ok) {
          const userData = await res.json();
          if (userData.displayName) {
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER_NAME, userData.displayName);
          }
        }
      } catch (e) {
        console.warn('Could not fetch user profile:', e);
      }
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
    
    // Force fallback if old SJ name is stuck
    if (!storedName || storedName.includes('SJ Business Solutions')) {
      storedName = 'User Account';
    }

    const nameParts = storedName.trim().split(' ').filter(Boolean);
    let initials = '';

    if (nameParts.length >= 2) {
      initials = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
    } else if (nameParts.length === 1 && nameParts[0].length > 0) {
      initials = nameParts[0].substring(0, 2).toUpperCase();
    } else {
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

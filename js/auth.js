// js/auth.js
const Auth = {
  async init() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    const userName = urlParams.get('userName');

    if (userId) {
      localStorage.setItem(CONFIG.STORAGE_KEYS.USER_ID, userId);
    }
    
    if (userName) {
      const decodedName = decodeURIComponent(userName).trim();
      if (decodedName) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER_NAME, decodedName);
      }
    }

    if (userId || userName) {
      const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
    }

    // Fetch fresh user and plan status from MongoDB on load
    await this.fetchCurrentUser();

    this.renderUserProfile();
  },

  getUserId() {
    return localStorage.getItem(CONFIG.STORAGE_KEYS.USER_ID);
  },

  async fetchCurrentUser() {
    const userId = this.getUserId();
    if (!userId) return;

    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/user/me?userId=${encodeURIComponent(userId)}&t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          localStorage.setItem(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(data.user));
        }
      }
    } catch (err) {
      console.warn('Could not refresh user status:', err);
    }
  },

  renderUserProfile() {
    const avatarElem = document.getElementById('user-avatar');
    if (!avatarElem) return;

    const storedName = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_NAME) || 'User';
    let initials = '';

    const parts = storedName.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    } else if (parts.length === 1 && parts[0].length > 0) {
      initials = parts[0].substring(0, 2).toUpperCase();
    }

    avatarElem.textContent = initials || 'U';
  },

  logout() {
    localStorage.clear();
    window.location.href = 'login.html';
  }
};

document.addEventListener('DOMContentLoaded', () => Auth.init());

// js/auth.js
const Auth = {
  init() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    const userName = urlParams.get('userName');
    const userEmail = urlParams.get('userEmail');

    if (userId) localStorage.setItem(CONFIG.STORAGE_KEYS.USER_ID, userId);
    if (userName) localStorage.setItem(CONFIG.STORAGE_KEYS.USER_NAME, decodeURIComponent(userName));
    if (userEmail) localStorage.setItem(CONFIG.STORAGE_KEYS.USER_EMAIL, decodeURIComponent(userEmail));

    this.renderUserProfile();
  },

  getUserId() {
    return localStorage.getItem(CONFIG.STORAGE_KEYS.USER_ID);
  },

  renderUserProfile() {
    const avatarElem = document.getElementById('user-avatar');
    if (!avatarElem) return;

    const storedName = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_NAME);

    if (!storedName) {
      avatarElem.textContent = '--';
      return;
    }

    const nameParts = storedName.trim().split(' ').filter(Boolean);
    let initials = '';

    if (nameParts.length >= 2) {
      initials = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
    } else if (nameParts.length === 1 && nameParts[0].length > 0) {
      initials = nameParts[0].substring(0, 2).toUpperCase();
    } else {
      initials = 'G';
    }

    avatarElem.textContent = initials;
  },

  logout() {
    localStorage.clear();
    window.location.href = 'login.html';
  }
};

document.addEventListener('DOMContentLoaded', () => Auth.init());

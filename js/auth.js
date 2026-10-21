// js/auth.js
const Auth = {
  init() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    const userName = urlParams.get('userName');
    const userEmail = urlParams.get('userEmail');

    // 1. Save credentials if passed via URL query after Google OAuth login
    if (userId) {
      localStorage.setItem(CONFIG.STORAGE_KEYS.USER_ID, userId);
    }
    if (userName) {
      localStorage.setItem('sjbs_user_name', decodeURIComponent(userName));
    }
    if (userEmail) {
      localStorage.setItem('sjbs_user_email', userEmail);
    }

    // Clean URL parameters if present
    if (userId || userName) {
      const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
    }

    // 2. Route protection check
    const currentUser = this.getUserId();
    const isPublicPage = window.location.pathname.endsWith('login.html') || 
                         window.location.pathname.endsWith('index.html') ||
                         window.location.pathname.endsWith('for-businesses.html') ||
                         window.location.pathname.endsWith('case-studies.html') ||
                         window.location.pathname.endsWith('blog.html') ||
                         window.location.pathname.endsWith('community.html') ||
                         window.location.pathname.endsWith('terms.html') ||
                         window.location.pathname.endsWith('policy.html');

    if (!currentUser && !isPublicPage) {
      window.location.href = 'login.html';
    }

    this.renderUserProfile();
  },

  getUserId() {
    return localStorage.getItem(CONFIG.STORAGE_KEYS.USER_ID);
  },

  renderUserProfile() {
    const avatarElem = document.getElementById('user-avatar');
    if (!avatarElem) return;

    const storedName = localStorage.getItem('sjbs_user_name') || 'User Name';
    
    // Generate initials (e.g., "Jafar Diwan" -> "JD")
    const nameParts = storedName.trim().split(' ');
    let initials = '';
    if (nameParts.length >= 2) {
      initials = (nameParts[0][0] + nameParts[1][0]).toUpperCase();
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

Auth.init();

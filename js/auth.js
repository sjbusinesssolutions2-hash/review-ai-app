/**
 * SJbs.AI - Authentication & Session Manager
 */

// Verify user session on page load
function verifyUserAuth() {
  const userId = localStorage.getItem('userId');
  const userEmail = localStorage.getItem('userEmail') || 'user@sjbs.ai';

  // If no user session exists, redirect to login/home page
  if (!userId) {
    window.location.href = 'index.html';
    return null;
  }

  // Populate user profile initials across the header if elements exist
  const initials = userEmail.substring(0, 2).toUpperCase();
  const mobileAvatar = document.getElementById('mobileAvatarInitials');
  const desktopAvatar = document.getElementById('desktopAvatar');

  if (mobileAvatar) mobileAvatar.innerText = initials;
  if (desktopAvatar) desktopAvatar.innerText = initials;

  return { userId, userEmail };
}

// Log out user and clear local storage session
function logoutUser() {
  localStorage.clear();
  window.location.href = 'index.html';
}

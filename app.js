const BACKEND_URL = 'https://review-ai-backend-03sb.onrender.com';
const GOOGLE_CLIENT_ID = '247056519129-c9ja3k137duacc4akkej5fe9856crgr3.apps.googleusercontent.com'; // Replace with your Client ID
const REDIRECT_URI = window.location.origin + window.location.pathname;

let cachedReviews = [];

function loginWithGoogle() {
  localStorage.clear();
  const scopes = ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/business.manage'].join(' ');
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: scopes,
    access_type: 'offline',
    prompt: 'select_account consent'
  }).toString();
  window.location.href = authUrl;
}

function logout() {
  localStorage.clear();
  window.location.reload();
}

function toggleProfileDropdown() {
  const menu = document.getElementById('profileDropdown');
  menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

window.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const authCode = urlParams.get('code');

  if (authCode) {
    window.history.replaceState({}, document.title, window.location.pathname);
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: authCode, redirectUri: REDIRECT_URI })
      });
      const data = await res.json();

      if (data.success && data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('userEmail', data.email);
        setupUserUI(data.email);
        loadBusinessLocations();
      } else {
        alert('Login failed: ' + (data.error || 'Unknown error'));
        logout();
      }
    } catch (err) {
      logout();
    }
    return;
  }

  if (localStorage.getItem('accessToken')) {
    setupUserUI(localStorage.getItem('userEmail'));
    loadBusinessLocations();
  }
});

function setupUserUI(email) {
  document.getElementById('navLoginBtn').style.display = 'none';
  document.getElementById('userMenu').style.display = 'block';
  document.getElementById('dropdownEmail').innerText = email || 'Google Account';
  document.getElementById('userAvatar').innerText = (email || 'U').charAt(0).toUpperCase();
}

async function loadBusinessLocations() {
  const token = localStorage.getItem('accessToken');
  const select = document.getElementById('locationSelect');

  try {
    const res = await fetch(`${BACKEND_URL}/api/locations/all`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (res.status === 401) { logout(); return; }

    const data = await res.json();
    select.innerHTML = '';

    if (data.locations && data.locations.length > 0) {
      data.locations.forEach(loc => {
        const opt = document.createElement('option');
        opt.value = loc.name;
        opt.textContent = loc.title || loc.name;
        select.appendChild(opt);
      });
      fetchRealReviews(data.locations[0].name);
    } else {
      select.innerHTML = '<option value="">No Google Business locations found</option>';
    }
  } catch (err) {
    select.innerHTML = '<option value="">Error loading locations</option>';
  }
}

function onLocationChange() {
  const loc = document.getElementById('locationSelect').value;
  if (loc) fetchRealReviews(loc);
}

// Convert numeric star strings like "FIVE" into ★★★★★ icons
function renderStarIcons(ratingStr) {
  const map = { 'ONE': 1, 'TWO': 2, 'THREE': 3, 'FOUR': 4, 'FIVE': 5 };
  const count = map[ratingStr] || parseInt(ratingStr) || 5;
  return '★'.repeat(count) + '☆'.repeat(5 - count);
}

async function fetchRealReviews(locationName) {
  const token = localStorage.getItem('accessToken');
  const reviewContainer = document.getElementById('reviewList');
  reviewContainer.innerHTML = '<p style="color:#94a3b8; text-align:center;">Loading live Google Reviews...</p>';

  try {
    const res = await fetch(`${BACKEND_URL}/api/reviews/fetch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ locationName })
    });
    const data = await res.json();
    cachedReviews = data.reviews || [];

    // Update Analytics Stats
    document.getElementById('statTotal').innerText = cachedReviews.length;

    renderReviewsList(cachedReviews);
  } catch (err) {
    reviewContainer.innerHTML = '<p style="color:#ef4444; text-align:center;">Failed to fetch reviews.</p>';
  }
}

function renderReviewsList(reviews) {
  const reviewContainer = document.getElementById('reviewList');
  if (!reviews || reviews.length === 0) {
    reviewContainer.innerHTML = '<p style="color:#94a3b8; text-align:center;">No reviews found for this filter.</p>';
    return;
  }

  reviewContainer.innerHTML = reviews.map(r => {
    const name = r.reviewer?.displayName || 'Google Customer';
    const initial = name.charAt(0).toUpperCase();
    const stars = renderStarIcons(r.starRating);
    const comment = r.comment || '<i>No text comment provided.</i>';

    return `
      <div class="google-review-card">
        <div class="reviewer-profile">
          <div class="avatar-circle">${initial}</div>
          <div class="reviewer-info">
            <span class="reviewer-name">${name}</span>
            <div class="review-stars-row">${stars}</div>
          </div>
        </div>
        <div class="review-comment">"${comment}"</div>
        ${r.reviewReply ? `
          <div class="google-owner-reply">
            <div class="reply-header">
              <span class="material-symbols-outlined" style="font-size:16px;">reply</span> Response from owner
            </div>
            <p class="reply-text">${r.reviewReply.comment}</p>
          </div>
        ` : `<div class="status-pending"><span class="material-symbols-outlined" style="font-size:16px;">bolt</span> Pending AI Autopilot Reply</div>`}
      </div>
    `;
  }).join('');
}

function filterReviews(filterType) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');

  if (filterType === 'replied') {
    renderReviewsList(cachedReviews.filter(r => r.reviewReply));
  } else if (filterType === 'pending') {
    renderReviewsList(cachedReviews.filter(r => !r.reviewReply));
  } else {
    renderReviewsList(cachedReviews);
  }
}

async function runAutopilot() {
  const token = localStorage.getItem('accessToken');
  const locationName = document.getElementById('locationSelect').value;
  const statusMsg = document.getElementById('statusMsg');

  statusMsg.style.color = '#3b82f6';
  statusMsg.innerText = '⚡ Processing unreplied reviews with Gemini AI...';

  try {
    const res = await fetch(`${BACKEND_URL}/api/reviews/autopilot`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ locationName })
    });
    const data = await res.json();

    if (data.success) {
      statusMsg.style.color = '#10b981';
      statusMsg.innerText = data.message;
      fetchRealReviews(locationName);
    } else {
      statusMsg.style.color = '#ef4444';
      statusMsg.innerText = 'Error: ' + data.error;
    }
  } catch (err) {
    statusMsg.style.color = '#ef4444';
    statusMsg.innerText = 'Autopilot request failed.';
  }
}

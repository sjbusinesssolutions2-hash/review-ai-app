const BACKEND_URL = 'https://review-ai-backend-03sb.onrender.com';
const GOOGLE_CLIENT_ID = '247056519129-c9ja3k137duacc4akkej5fe9856crgr3.apps.googleusercontent.com'; // Your Client ID
const REDIRECT_URI = window.location.origin + window.location.pathname;

// ==========================================
// 1. Navigation & UI Modal Helpers
// ==========================================
function showTab(tabName) {
  if (tabName === 'dashboard') {
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('dashboardPage').style.display = 'block';
  } else {
    document.getElementById('landingPage').style.display = 'block';
    document.getElementById('dashboardPage').style.display = 'none';
  }
}

function openModal(id) {
  document.getElementById(id).style.display = 'flex';
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

// ==========================================
// 2. Google OAuth Direct Page Redirect
// ==========================================
function loginWithGoogle() {
  localStorage.clear();

  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/business.manage'
  ].join(' ');

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

// ==========================================
// 3. Initialize Session & OAuth Callbacks
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const authCode = urlParams.get('code');

  // Handle returning OAuth code from Google
  if (authCode) {
    window.history.replaceState({}, document.title, window.location.pathname);
    showTab('dashboard');
    document.getElementById('statusMsg').innerHTML = '<p style="color:#3b82f6;">Authenticating with Google...</p>';
    
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
        updateNavState();
        showDashboard();
      } else {
        alert('Authentication failed: ' + (data.error || 'Unknown error'));
        logout();
      }
    } catch (err) {
      alert('Error connecting to backend: ' + err.message);
      logout();
    }
    return;
  }

  // Existing session check
  if (localStorage.getItem('accessToken')) {
    updateNavState();
    showTab('dashboard');
    showDashboard();
  } else {
    showTab('landing');
  }
});

function updateNavState() {
  const navLoginBtn = document.getElementById('navLoginBtn');
  const navDashboardBtn = document.getElementById('navDashboardBtn');
  if (navLoginBtn) navLoginBtn.style.display = 'none';
  if (navDashboardBtn) navDashboardBtn.style.display = 'inline-block';
}

// ==========================================
// 4. Render Dashboard & Locations
// ==========================================
async function showDashboard() {
  document.getElementById('userEmail').innerText = `Logged in as: ${localStorage.getItem('userEmail')}`;
  await loadBusinessLocations();
}

async function loadBusinessLocations() {
  const token = localStorage.getItem('accessToken');
  const select = document.getElementById('locationSelect');

  try {
    const res = await fetch(`${BACKEND_URL}/api/locations/all`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (res.status === 401) {
      logout();
      return;
    }

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
      select.innerHTML = '<option value="">No managed business profiles found</option>';
    }
  } catch (err) {
    select.innerHTML = '<option value="">Error loading locations</option>';
  }
}

function onLocationChange() {
  const selectedLocation = document.getElementById('locationSelect').value;
  if (selectedLocation) {
    fetchRealReviews(selectedLocation);
  }
}

// ==========================================
// 5. Fetch Real Google Reviews
// ==========================================
async function fetchRealReviews(locationName) {
  const token = localStorage.getItem('accessToken');
  const reviewContainer = document.getElementById('reviewList');
  reviewContainer.innerHTML = '<p style="color:#cbd5e1;">Fetching live reviews...</p>';

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

    if (data.reviews && data.reviews.length > 0) {
      reviewContainer.innerHTML = data.reviews.map(r => `
        <div class="review-card" style="background: #0f172a; padding: 15px; margin-top: 12px; border-radius: 8px; text-align: left; border: 1px solid #334155;">
          <strong>${r.reviewer?.displayName || 'Anonymous'}</strong> (${r.starRating} Stars)
          <p style="margin: 8px 0; color: #cbd5e1;">"${r.comment || 'No text comment provided.'}"</p>
          ${r.reviewReply ? `<div style="background: #1e1b4b; color: #a5b4fc; padding: 10px; border-radius: 6px; font-size: 14px;"><strong>Reply:</strong> ${r.reviewReply.comment}</div>` : '<p style="color: #f59e0b; font-size: 13px;">⚡ Pending AI Reply</p>'}
        </div>
      `).join('');
    } else {
      reviewContainer.innerHTML = '<p style="color: #94a3b8;">No reviews found for this location.</p>';
    }
  } catch (err) {
    reviewContainer.innerHTML = '<p style="color: #ef4444;">Failed to fetch reviews.</p>';
  }
}

// ==========================================
// 6. Run AI Autopilot Manual Sync
// ==========================================
async function runAutopilot() {
  const token = localStorage.getItem('accessToken');
  const locationName = document.getElementById('locationSelect').value;
  const statusMsg = document.getElementById('statusMsg');

  statusMsg.style.color = '#3b82f6';
  statusMsg.innerText = '⚡ Processing Gemini AI replies in background...';

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

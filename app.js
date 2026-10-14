const BACKEND_URL = 'https://review-ai-backend-03sb.onrender.com';
const GOOGLE_CLIENT_ID = '247056519129-c9ja3k137duacc4akkej5fe9856crgr3.apps.googleusercontent.com'; // Replace with your actual Client ID from Google Cloud Console
const REDIRECT_URI = window.location.origin + window.location.pathname;

// 1. Direct Page Redirect Google OAuth Handler (Mobile Popup Protection)
function loginWithGoogle() {
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
    prompt: 'consent'
  }).toString();

  // Redirect current window (bypasses browser popup blocker)
  window.location.href = authUrl;
}

// 2. Initialize App and Handle Redirect Callbacks
window.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const authCode = urlParams.get('code');

  // If returning from Google OAuth redirect with a authorization code
  if (authCode) {
    document.getElementById('loginSection').innerHTML = '<p>Authenticating with Google...</p>';
    window.history.replaceState({}, document.title, window.location.pathname); // Clean URL query
    
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
        showDashboard();
      } else {
        alert('Authentication failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error connecting to backend: ' + err.message);
    }
    return;
  }

  // Check existing session
  if (localStorage.getItem('accessToken')) {
    showDashboard();
  }
});

// 3. Render Dashboard & Fetch Associated Google Business Accounts
async function showDashboard() {
  document.getElementById('loginSection').style.display = 'none';
  document.getElementById('dashboardSection').style.display = 'block';
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

// 4. Fetch Real Google Reviews
async function fetchRealReviews(locationName) {
  const token = localStorage.getItem('accessToken');
  const reviewContainer = document.getElementById('reviewList');
  reviewContainer.innerHTML = '<p>Fetching live reviews...</p>';

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
        <div class="review-card">
          <strong>${r.reviewer?.displayName || 'Anonymous'}</strong> (${r.starRating} Stars)
          <p>"${r.comment || 'No text comment provided.'}"</p>
          ${r.reviewReply ? `<div class="reply-box"><strong>Reply:</strong> ${r.reviewReply.comment}</div>` : '<p style="color: #f59e0b; font-size: 13px;">⚡ Pending AI Reply</p>'}
        </div>
      `).join('');
    } else {
      reviewContainer.innerHTML = '<p style="color: #94a3b8;">No reviews found for this location.</p>';
    }
  } catch (err) {
    reviewContainer.innerHTML = '<p style="color: #ef4444;">Failed to fetch reviews.</p>';
  }
}

// 5. Run Autopilot
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
      fetchRealReviews(locationName); // Refresh list
    } else {
      statusMsg.style.color = '#ef4444';
      statusMsg.innerText = 'Error: ' + data.error;
    }
  } catch (err) {
    statusMsg.style.color = '#ef4444';
    statusMsg.innerText = 'Autopilot request failed.';
  }
}

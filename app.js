const BACKEND_URL = 'https://review-ai-backend-03sb.onrender.com';
const GOOGLE_CLIENT_ID = '247056519129-c9ja3k137duacc4akkej5fe9856crgr3.apps.googleusercontent.com'; // Replace with your OAuth Client ID
const REDIRECT_URI = window.location.origin + window.location.pathname;

// 1. Direct Page Redirect Google OAuth Handler
function loginWithGoogle() {
  // Clear any existing stored sessions before requesting a new login
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
    prompt: 'select_account consent' // Forces account picker so you can explicitly select your Manager account
  }).toString();

  window.location.href = authUrl;
}

// 2. Clear Session / Logout Function
function logout() {
  localStorage.clear();
  document.getElementById('dashboardSection').style.display = 'none';
  document.getElementById('loginSection').style.display = 'block';
  window.location.reload();
}

// 3. Initialize App and Handle Redirect Callbacks
window.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const authCode = urlParams.get('code');

  if (authCode) {
    document.getElementById('loginSection').innerHTML = '<p>Authenticating with Google...</p>';
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

  // Check existing session
  if (localStorage.getItem('accessToken')) {
    showDashboard();
  } else {
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('dashboardSection').style.display = 'none';
  }
});

// 4. Render Dashboard & Fetch Locations
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
    
    // If token is expired or unauthorized, reset session so user can re-login
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
      // Show explicit re-login button when locations list is empty
      document.getElementById('statusMsg').innerHTML = `
        <p style="color: #f59e0b; font-size: 14px;">Session expired or no locations linked.</p>
        <button onclick="logout()" style="background: #dc2626; margin-top: 5px; padding: 8px;">Switch Account / Re-login</button>
      `;
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

// 5. Fetch Real Google Reviews
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

// 6. Run Autopilot
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

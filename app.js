const BACKEND_URL = 'https://review-ai-backend-03sb.onrender.com';
const CLIENT_ID = '247056519129-c9ja3k137duacc4akkej5fe9856crgr3.apps.googleusercontent.com'; // Replace with your GCP Client ID if different

document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('googleLoginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      const redirectUri = window.location.origin + window.location.pathname;
      const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=https://www.googleapis.com/auth/business.manage&access_type=offline&prompt=consent`;
      window.location.href = oauthUrl;
    });
  }

  // Check for returning OAuth code
  const urlParams = new URLSearchParams(window.location.search);
  const authCode = urlParams.get('code');
  if (authCode) {
    window.history.replaceState({}, document.title, window.location.pathname);
    exchangeCodeForToken(authCode);
  } else {
    // Check for existing session token
    const savedToken = sessionStorage.getItem('google_access_token');
    if (savedToken) {
      document.getElementById('authCard').style.display = 'none';
      runAutopilotEngine(savedToken);
    }
  }
});

async function exchangeCodeForToken(code) {
  const statusMessage = document.getElementById('statusMessage');
  statusMessage.innerText = 'Authenticating with Google & MongoDB...';

  try {
    const redirectUri = window.location.origin + window.location.pathname;
    const res = await fetch(`${BACKEND_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri })
    });
    const data = await res.json();

    if (!data.success) throw new Error(data.error);

    sessionStorage.setItem('google_access_token', data.accessToken);
    document.getElementById('authCard').style.display = 'none';
    statusMessage.innerText = `Welcome, ${data.email}! Starting AI Auto-Pilot...`;
    runAutopilotEngine(data.accessToken);
  } catch (err) {
    statusMessage.innerText = 'Authentication Error: ' + err.message;
  }
}

function renderStars(starRating) {
  let count = 5;
  if (starRating === 'ONE') count = 1;
  else if (starRating === 'TWO') count = 2;
  else if (starRating === 'THREE') count = 3;
  else if (starRating === 'FOUR') count = 4;
  else if (starRating === 'FIVE') count = 5;
  
  let starsHtml = '';
  for (let i = 0; i < count; i++) starsHtml += '⭐';
  return starsHtml;
}

async function runAutopilotEngine(accessToken) {
  const reviewsContainer = document.getElementById('reviewsContainer');
  const statusMessage = document.getElementById('statusMessage');
  reviewsContainer.innerHTML = '';

  try {
    // 1. Get Location
    const locRes = await fetch(`${BACKEND_URL}/api/locations`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const locData = await locRes.json();
    const locationName = locData.locationName || 'locations/default';

    statusMessage.innerText = '🤖 AI Auto-Pilot active: Scanning reviews & generating responses...';

    // 2. Trigger Backend Autopilot Loop
    const autoRes = await fetch(`${BACKEND_URL}/api/reviews/autopilot`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ locationName })
    });

    const autoData = await autoRes.json();
    if (!autoData.success) throw new Error(autoData.error);

    statusMessage.innerHTML = `<span style="color: #10b981; font-weight: bold;">⚡ ${autoData.message}</span>`;

    const logs = autoData.activityLog || [];
    if (logs.length === 0) {
      reviewsContainer.innerHTML = '<p style="color: #94a3b8; text-align: center;">All reviews are fully answered! Auto-Pilot is standby for new reviews.</p>';
      return;
    }

    // 3. Render Automation Log Cards
    logs.forEach(log => {
      const card = document.createElement('div');
      card.className = 'review-card';
      card.style.cssText = 'background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 16px; margin-bottom: 16px;';
      
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="color: #f8fafc; font-size: 15px;">${log.reviewer}</strong>
          <span>${renderStars(log.rating)}</span>
        </div>
        <p style="color: #cbd5e1; font-size: 13px; margin-bottom: 12px; line-height: 1.4;"><strong>Customer:</strong> "${log.comment}"</p>
        <div style="background: #0f172a; padding: 12px; border-radius: 8px; border: 1px solid #1e293b;">
          <div style="font-size: 11px; color: #a855f7; font-weight: bold; margin-bottom: 4px;">✨ Auto-Posted AI Reply:</div>
          <p style="color: #38bdf8; font-size: 13px; margin: 0; line-height: 1.4;">${log.reply}</p>
        </div>
      `;
      reviewsContainer.appendChild(card);
    });

  } catch (error) {
    statusMessage.innerText = 'Auto-Pilot Error: ' + error.message;
  }
}

const BACKEND_URL = 'https://review-ai-backend-03sb.onrender.com';
const CLIENT_ID = '331899144458-7o5l3l1q3s6v78d2b9l7n2m0p4q8v1r5.apps.googleusercontent.com'; // Replace with your GCP Client ID if different

document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('googleLoginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      const redirectUri = window.location.origin + window.location.pathname;
      const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=https://www.googleapis.com/auth/business.manage&access_type=offline&prompt=consent`;
      window.location.href = oauthUrl;
    });
  }

  // Check for returning OAuth authorization code
  const urlParams = new URLSearchParams(window.location.search);
  const authCode = urlParams.get('code');
  if (authCode) {
    window.history.replaceState({}, document.title, window.location.pathname);
    exchangeCodeForToken(authCode);
  } else {
    // Check if session token already exists
    const savedToken = sessionStorage.getItem('google_access_token');
    if (savedToken) {
      document.getElementById('authCard').style.display = 'none';
      loadReviews(savedToken);
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
    statusMessage.innerText = `Welcome, ${data.email}! Loading reviews...`;
    loadReviews(data.accessToken);
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

async function loadReviews(accessToken) {
  const reviewsContainer = document.getElementById('reviewsContainer');
  const statusMessage = document.getElementById('statusMessage');
  reviewsContainer.innerHTML = '';

  try {
    const locRes = await fetch(`${BACKEND_URL}/api/locations`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const locData = await locRes.json();
    if (!locData.success) throw new Error(locData.error);

    const locationName = locData.locationName;
    statusMessage.innerText = `Connected! Loading reviews...`;

    const revRes = await fetch(`${BACKEND_URL}/api/reviews?locationName=${encodeURIComponent(locationName)}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const revData = await revRes.json();
    if (!revData.success) throw new Error(revData.error);

    const reviews = revData.reviews || [];
    statusMessage.innerText = `Loaded ${reviews.length} review(s).`;

    if (reviews.length === 0) {
      reviewsContainer.innerHTML = '<p style="color: #94a3b8; text-align: center;">No reviews found.</p>';
      return;
    }

    reviews.forEach(review => {
      const sanitizedId = review.name.replace(/[\/\.]/g, '_');
      const reviewerName = review.reviewer?.displayName || 'Anonymous Customer';
      const commentText = review.comment || 'No comment provided.';
      const starRating = review.starRating || 'FIVE';

      const card = document.createElement('div');
      card.className = 'review-card';
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="color: #f8fafc; font-size: 15px;">${reviewerName}</strong>
          <span>${renderStars(starRating)}</span>
        </div>
        <p style="color: #cbd5e1; font-size: 14px; margin-bottom: 12px; line-height: 1.4;">${commentText}</p>
        <div style="background: #0f172a; padding: 12px; border-radius: 8px; border: 1px solid #334155;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label style="font-size: 12px; color: #94a3b8; font-weight: 600;">AI Response Studio:</label>
            <button onclick="generateAiReply('${review.name}', '${encodeURIComponent(commentText)}', '${starRating}', this)" style="background: linear-gradient(135deg, #6366f1, #a855f7); color: white; border: none; padding: 5px 12px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer;">✨ AI Reply</button>
          </div>
          <textarea id="reply-${sanitizedId}" placeholder="Write or edit reply..." style="width: 100%; min-height: 70px; background: #1e293b; color: white; border: 1px solid #475569; border-radius: 6px; padding: 8px; font-size: 13px; box-sizing: border-box; resize: vertical;"></textarea>
          <button onclick="submitReply('${review.name}', '${accessToken}')" style="margin-top: 8px; width: 100%; background: #2563eb; color: white; border: none; padding: 9px; border-radius: 6px; font-weight: bold; font-size: 13px; cursor: pointer;">Send Reply</button>
        </div>
      `;
      reviewsContainer.appendChild(card);
    });
  } catch (error) {
    statusMessage.innerText = 'Error: ' + error.message;
  }
}

async function generateAiReply(reviewName, encodedComment, starRating, buttonElement) {
  const comment = decodeURIComponent(encodedComment);
  const sanitizedId = reviewName.replace(/[\/\.]/g, '_');
  const textarea = document.getElementById(`reply-${sanitizedId}`);

  const originalText = buttonElement.innerText;
  buttonElement.innerText = "Thinking...";
  buttonElement.disabled = true;

  try {
    const response = await fetch(`${BACKEND_URL}/api/ai/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewText: comment, starRating: starRating })
    });
    const data = await response.json();
    if (data.success) {
      textarea.value = data.reply;
    } else {
      alert('AI Error: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Network error connecting to AI endpoint.');
  } finally {
    buttonElement.innerText = originalText;
    buttonElement.disabled = false;
  }
}

async function submitReply(reviewName, accessToken) {
  const sanitizedId = reviewName.replace(/[\/\.]/g, '_');
  const textarea = document.getElementById(`reply-${sanitizedId}`);
  const replyText = textarea.value.trim();

  if (!replyText) {
    alert('Please enter or generate a reply.');
    return;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/reviews/reply`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reviewName, replyText })
    });
    const data = await response.json();
    if (data.success) {
      alert('Reply successfully posted to Google & saved to MongoDB!');
    } else {
      alert('Error: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Network error posting reply.');
  }
}

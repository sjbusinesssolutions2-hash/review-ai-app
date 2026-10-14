// Live backend URL hosted on Render
const BACKEND_URL = 'https://review-ai-backend-03sb.onrender.com';

let userAccessToken = '';
let locationName = '';

// Initialize connection and fetch business location
async function initDashboard() {
  const tokenInput = document.getElementById('accessToken').value.trim();
  const statusDiv = document.getElementById('statusMessage');

  if (!tokenInput) {
    alert('Please enter a valid Google Access Token.');
    return;
  }

  userAccessToken = tokenInput;
  statusDiv.innerText = 'Finding business location...';

  try {
    const res = await fetch(`${BACKEND_URL}/api/locations`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${userAccessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json();

    if (!data.success) {
      statusDiv.innerText = `Error finding location: ${data.error || 'Unauthorized or invalid token'}`;
      return;
    }

    locationName = data.locationName;
    statusDiv.innerText = `Location connected! Fetching reviews...`;

    // Fetch and display reviews
    await fetchAndRenderReviews();
  } catch (err) {
    console.error(err);
    statusDiv.innerText = 'Failed to connect to backend server or invalid response format.';
  }
}

// Fetch live Google reviews
async function fetchAndRenderReviews() {
  const statusDiv = document.getElementById('statusMessage');
  const container = document.getElementById('reviewsContainer');
  container.innerHTML = '';

  try {
    const res = await fetch(`${BACKEND_URL}/api/reviews?locationName=${encodeURIComponent(locationName)}`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${userAccessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json();

    if (!data.success) {
      statusDiv.innerText = `Error fetching reviews: ${data.error}`;
      return;
    }

    const reviews = data.reviews || [];

    if (reviews.length === 0) {
      statusDiv.innerText = 'No reviews found for this location.';
      return;
    }

    statusDiv.innerText = `Loaded ${reviews.length} review(s).`;

    reviews.forEach(review => {
      const card = document.createElement('div');
      card.className = 'card';

      const stars = '⭐'.repeat(convertStarRating(review.starRating));
      const author = review.reviewer ? review.reviewer.displayName : 'Anonymous';
      const comment = review.comment || '<i>No text comment provided.</i>';
      const reviewName = review.name; // Unique review resource name

      card.innerHTML = `
        <h3>${author} <span class="star-rating">${stars}</span></h3>
        <p>${comment}</p>
        <textarea id="reply-${reviewName}" rows="3" placeholder="Write or edit reply..."></textarea>
        <button class="btn" onclick="submitReply('${reviewName}')">Send Reply</button>
      `;

      container.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    statusDiv.innerText = 'Failed to load reviews.';
  }
}

// Submit reply to Google Business Profile
async function submitReply(reviewName) {
  const replyInput = document.getElementById(`reply-${reviewName}`);
  const replyText = replyInput.value.trim();

  if (!replyText) {
    alert('Please write a reply before sending.');
    return;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/reviews/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAccessToken}`
      },
      body: JSON.stringify({ reviewName, replyText })
    });

    const data = await res.json();

    if (data.success) {
      alert('Reply successfully posted to Google!');
    } else {
      alert(`Error posting reply: ${data.error || 'Unknown error'}`);
    }
  } catch (err) {
    console.error(err);
    alert('Failed to send reply to backend.');
  }
}

// Helper to convert Google star rating string format (e.g. "FIVE") to integer
function convertStarRating(ratingStr) {
  switch (ratingStr) {
    case 'FIVE': return 5;
    case 'FOUR': return 4;
    case 'THREE': return 3;
    case 'TWO': return 2;
    case 'ONE': return 1;
    default: return 5;
  }
}

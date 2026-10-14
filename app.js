const BACKEND_URL = 'https://review-ai-backend-03sb.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
  const loadBtn = document.getElementById('loadReviewsBtn');
  if (loadBtn) {
    loadBtn.addEventListener('click', () => {
      try {
        loadReviews();
      } catch (err) {
        document.getElementById('statusMessage').innerText = 'Trigger Error: ' + err.message;
      }
    });
  } else {
    alert('Error: loadReviewsBtn ID not found in HTML!');
  }
});

function renderStars(starRating) {
  let count = 5;
  if (starRating === 'ONE') count = 1;
  else if (starRating === 'TWO') count = 2;
  else if (starRating === 'THREE') count = 3;
  else if (starRating === 'FOUR') count = 4;
  else if (starRating === 'FIVE') count = 5;
  
  let starsHtml = '';
  for (let i = 0; i < count; i++) {
    starsHtml += '⭐';
  }
  return starsHtml;
}

async function loadReviews() {
  const tokenInput = document.getElementById('accessTokenInput');
  const reviewsContainer = document.getElementById('reviewsContainer');
  const statusMessage = document.getElementById('statusMessage');

  if (!tokenInput || !tokenInput.value.trim()) {
    alert('Please enter a valid Google Access Token.');
    return;
  }

  const accessToken = tokenInput.value.trim();
  statusMessage.innerText = 'Connecting to backend...';
  reviewsContainer.innerHTML = '';

  try {
    // 1. Fetch Location Name
    const locRes = await fetch(`${BACKEND_URL}/api/locations`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const locData = await locRes.json();

    if (!locData.success) {
      throw new Error(locData.error || 'Failed to fetch location.');
    }

    const locationName = locData.locationName;
    statusMessage.innerText = `Connected! Fetching reviews...`;

    // 2. Fetch Reviews
    const revRes = await fetch(`${BACKEND_URL}/api/reviews?locationName=${encodeURIComponent(locationName)}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const revData = await revRes.json();

    if (!revData.success) {
      throw new Error(revData.error || 'Failed to fetch reviews.');
    }

    const reviews = revData.reviews || [];
    statusMessage.innerText = `Loaded ${reviews.length} review(s).`;

    if (reviews.length === 0) {
      reviewsContainer.innerHTML = '<p style="color: #a0aec0; text-align: center;">No reviews found.</p>';
      return;
    }

    // 3. Render Cards
    reviews.forEach(review => {
      const sanitizedId = review.name.replace(/[\/\.]/g, '_');
      const reviewerName = review.reviewer && review.reviewer.displayName ? review.reviewer.displayName : 'Anonymous Customer';
      const commentText = review.comment || 'No comment provided.';
      const starRating = review.starRating || 'FIVE';

      const card = document.createElement('div');
      card.className = 'review-card';
      card.style.cssText = 'background: #111827; border: 1px solid #374151; border-radius: 10px; padding: 16px; margin-bottom: 16px;';

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="color: #f3f4f6; font-size: 16px;">${reviewerName}</strong>
          <span>${renderStars(starRating)}</span>
        </div>
        <p style="color: #d1d5db; font-size: 14px; margin-bottom: 12px;">${commentText}</p>
        <div style="background: #1f2937; padding: 12px; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label style="font-size: 12px; color: #9ca3af;">Response:</label>
            <button onclick="generateAiReply('${review.name}', '${encodeURIComponent(commentText)}', '${starRating}', this)" style="background: linear-gradient(135deg, #6366f1, #a855f7); color: white; border: none; padding: 5px 12px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer;">✨ AI Reply</button>
          </div>
          <textarea id="reply-${sanitizedId}" placeholder="Write or edit reply..." style="width: 100%; min-height: 70px; background: #111827; color: white; border: 1px solid #4b5563; border-radius: 6px; padding: 8px; font-size: 13px; box-sizing: border-box;"></textarea>
          <button onclick="submitReply('${review.name}')" style="margin-top: 8px; width: 100%; background: #2563eb; color: white; border: none; padding: 9px; border-radius: 6px; font-weight: bold; font-size: 13px; cursor: pointer;">Send Reply</button>
        </div>
      `;
      reviewsContainer.appendChild(card);
    });

  } catch (error) {
    console.error('Error loading reviews:', error);
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

async function submitReply(reviewName) {
  const sanitizedId = reviewName.replace(/[\/\.]/g, '_');
  const textarea = document.getElementById(`reply-${sanitizedId}`);
  const replyText = textarea.value.trim();
  const tokenInput = document.getElementById('accessTokenInput');

  if (!replyText) {
    alert('Please enter or generate a reply.');
    return;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/reviews/reply`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenInput.value.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reviewName, replyText })
    });

    const data = await response.json();
    if (data.success) {
      alert('Reply successfully posted!');
    } else {
      alert('Error: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Network error posting reply.');
  }
}

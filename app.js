const BACKEND_URL = 'https://review-ai-backend-03sb.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
  const loadBtn = document.getElementById('loadReviewsBtn');
  if (loadBtn) {
    loadBtn.addEventListener('click', loadReviews);
  }
});

// Helper function to render star ratings visually
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

// Main function to fetch location and reviews
async function loadReviews() {
  const tokenInput = document.getElementById('accessTokenInput');
  const reviewsContainer = document.getElementById('reviewsContainer');
  const statusMessage = document.getElementById('statusMessage');

  if (!tokenInput || !tokenInput.value.trim()) {
    alert('Please enter a valid Google Access Token.');
    return;
  }

  const accessToken = tokenInput.value.trim();
  statusMessage.innerText = 'Connecting to Google & loading reviews...';
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
    statusMessage.innerText = `Connected! Location: ${locationName}. Fetching reviews...`;

    // 2. Fetch Reviews for this Location
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
      reviewsContainer.innerHTML = '<p style="color: #a0aec0; text-align: center;">No reviews found for this location.</p>';
      return;
    }

    // 3. Render Review Cards
    reviews.forEach(review => {
      const sanitizedId = review.name.replace(/[\/\.]/g, '_');
      const reviewerName = review.reviewer && review.reviewer.displayName ? review.reviewer.displayName : 'Anonymous Customer';
      const commentText = review.comment || 'No comment provided.';
      const starRating = review.starRating || 'FIVE';

      const card = document.createElement('div');
      card.className = 'review-card';
      card.style.cssText = 'background: #111827; border: 1px solid #374151; border-radius: 10px; padding: 16px; margin-bottom: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);';

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="color: #f3f4f6; font-size: 16px;">${reviewerName}</strong>
          <span style="font-size: 14px;">${renderStars(starRating)}</span>
        </div>
        <p style="color: #d1d5db; font-size: 14px; margin-bottom: 12px; line-height: 1.4;">${commentText}</p>
        
        <div style="background: #1f2937; padding: 12px; border-radius: 8px; border: 1px solid #374151;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label style="font-size: 12px; color: #9ca3af; font-weight: 600;">Response Management:</label>
            <button onclick="generateAiReply('${review.name}', '${encodeURIComponent(commentText)}', '${starRating}', this)" style="background: linear-gradient(135deg, #6366f1, #a855f7); color: white; border: none; padding: 5px 12px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer;">✨ AI Reply</button>
          </div>
          <textarea id="reply-${sanitizedId}" placeholder="Write or edit reply..." style="width: 100%; min-height: 70px; background: #111827; color: white; border: 1px solid #4b5563; border-radius: 6px; padding: 8px; font-size: 13px; box-sizing: border-box; resize: vertical;"></textarea>
          <button onclick="submitReply('${review.name}')" style="margin-top: 8px; width: 100%; background: #2563eb; color: white; border: none; padding: 9px; border-radius: 6px; font-weight: bold; font-size: 13px; cursor: pointer;">Send Reply</button>
        </div>
      `;
      reviewsContainer.appendChild(card);
    });

  } catch (error) {
    console.error('Error loading reviews:', error);
    statusMessage.innerHTML = `<span style="color: #ef4444;">Error: ${error.message}</span>`;
  }
}

// 4. Handle Gemini AI Generation Trigger
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
      alert('AI Generation error: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    console.error('Network error generating AI reply:', err);
    alert('Failed to connect to backend server for AI generation.');
  } finally {
    buttonElement.innerText = originalText;
    buttonElement.disabled = false;
  }
}

// 5. Submit Manual or AI-Edited Reply to Google & MongoDB
async function submitReply(reviewName) {
  const sanitizedId = reviewName.replace(/[\/\.]/g, '_');
  const textarea = document.getElementById(`reply-${sanitizedId}`);
  const replyText = textarea.value.trim();
  const tokenInput = document.getElementById('accessTokenInput');

  if (!replyText) {
    alert('Please enter or generate a reply before sending.');
    return;
  }

  if (!tokenInput || !tokenInput.value.trim()) {
    alert('Access token is missing.');
    return;
  }

  const accessToken = tokenInput.value.trim();

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
      alert('Reply successfully posted to Google & saved to database!');
    } else {
      alert('Error posting reply: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    console.error('Error submitting reply:', err);
    alert('Network error while posting reply.');
  }
}

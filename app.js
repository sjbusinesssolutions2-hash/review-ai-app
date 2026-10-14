const BACKEND_URL = 'https://review-ai-backend-03sb.onrender.com';

// 1. Load Locations when user logs in
async function loadBusinessLocations() {
  const token = localStorage.getItem('accessToken');
  if (!token) return;

  try {
    const res = await fetch(`${BACKEND_URL}/api/locations/all`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    const select = document.getElementById('locationSelect');
    select.innerHTML = '';

    if (data.locations && data.locations.length > 0) {
      data.locations.forEach(loc => {
        const option = document.createElement('option');
        option.value = loc.name;
        option.textContent = loc.title || loc.name;
        select.appendChild(option);
      });
      // Automatically fetch reviews for the first selected location
      fetchRealReviews(data.locations[0].name);
    } else {
      select.innerHTML = '<option value="">No Google Business locations found</option>';
    }
  } catch (err) {
    console.error('Failed to load locations:', err);
  }
}

// 2. Fetch Real Reviews for Selected Business Location
async function fetchRealReviews(locationName) {
  const token = localStorage.getItem('accessToken');
  const reviewContainer = document.getElementById('reviewList');
  reviewContainer.innerHTML = '<p>Loading live reviews from Google...</p>';

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
          <h4>${r.reviewer?.displayName || 'Anonymous'} - ${r.starRating} Stars</h4>
          <p>"${r.comment || 'No comment provided.'}"</p>
          ${r.reviewReply ? `<div class="reply-box"><strong>Existing Reply:</strong> ${r.reviewReply.comment}</div>` : '<p class="status-pending">⚡ Pending AI Reply</p>'}
        </div>
      `).join('');
    } else {
      reviewContainer.innerHTML = '<p>No reviews found for this business location yet.</p>';
    }
  } catch (err) {
    reviewContainer.innerHTML = '<p>Error loading reviews. Make sure your Google account manages a Google Business Profile.</p>';
  }
}

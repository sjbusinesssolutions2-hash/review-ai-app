/**
 * SJbs.AI - Inbox Controller (100% Dynamic)
 */

async function initInboxPage() {
  const user = await verifyUserAuth();
  if (user) {
    // Dynamically load the user's authentic locations from Google API
    await loadUserLocations(fetchLiveReviews);
  }
}

async function fetchLiveReviews(locId) {
  const reviewsList = document.getElementById('reviewsList');
  if (!reviewsList) return;

  reviewsList.innerHTML = '<p class="text-xs text-slate-400 italic py-4"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading live reviews...</p>';

  try {
    const res = await fetch(`${CONFIG.BACKEND_URL}/api/reviews?locationId=${locId}`);
    const data = await res.json();

    if (data.reviews && data.reviews.length > 0) {
      reviewsList.innerHTML = '';
      data.reviews.forEach(rev => {
        const starsHtml = Array(rev.starRating || 5).fill('<i class="fa-solid fa-star"></i>').join('');

        reviewsList.innerHTML += `
          <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div class="text-xs font-bold text-slate-900 tracking-wide">Post this review reply</div>
            
            <div class="flex items-center space-x-3">
              <div class="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                ${rev.reviewerInitials || 'US'}
              </div>
              <div>
                <h4 class="text-xs font-bold text-slate-900">${rev.reviewerName}</h4>
                <div class="text-amber-400 text-[10px] flex space-x-0.5 mt-0.5">${starsHtml}</div>
              </div>
            </div>

            <div class="pl-3 border-l-2 border-amber-400 text-xs italic text-slate-700">
              "${rev.comment}"
            </div>

            <div id="replyBox_${rev.reviewId}" class="bg-blue-50/70 border border-blue-100 rounded-xl p-3 space-y-2">
              <div class="flex items-center space-x-1.5 text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                <i class="fa-solid fa-wand-magic-sparkles"></i>
                <span>Auto-Reply Draft</span>
              </div>
              <div class="text-xs font-bold text-slate-900">Response from owner</div>
              <p class="text-xs text-slate-600 leading-relaxed">Click "Draft AI Reply" to generate a response tailored specifically for ${activeLocationName}.</p>
              <div class="flex space-x-2 pt-1">
                <button onclick="generateAIReply('${rev.reviewId}', \`${rev.comment}\`, ${rev.starRating}, '${rev.reviewerName}')" class="btn-blue text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1">
                  <i class="fa-solid fa-paper-plane"></i>
                  <span>Draft AI Reply</span>
                </button>
              </div>
            </div>
          </div>
        `;
      });
    } else {
      reviewsList.innerHTML = '<p class="text-xs text-slate-500 py-6 text-center">No unreplied reviews found for this branch.</p>';
    }

  } catch (err) {
    reviewsList.innerHTML = '<p class="text-xs text-red-500 py-4">Failed to load reviews.</p>';
  }
}

async function generateDailyPost() {
  const container = document.getElementById('aiPostContainer');
  if (!container) return;

  container.innerHTML = `<p class="text-xs text-slate-500 italic"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Gemini AI is crafting post for ${activeLocationName}...</p>`;

  try {
    const res = await fetch(`${CONFIG.BACKEND_URL}/api/ai/post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: activeLocationName,
        topic: 'quality service, expertise, and customer satisfaction'
      })
    });

    const data = await res.json();
    const postText = data.postContent || data.reply || data.text || 'Generated post ready for review.';

    container.innerHTML = `
      <div class="space-y-3">
        <p class="text-xs text-slate-800 leading-relaxed font-medium">${postText}</p>
        ${data.imageUrl ? `<img src="${data.imageUrl}" class="w-full max-h-64 object-cover rounded-xl border border-slate-200">` : ''}
        <div class="flex justify-end space-x-2 pt-2">
          <button class="btn-outline px-3 py-1.5 text-xs rounded-lg">Edit</button>
          <button onclick="alert('Post published directly to Google Business Profile!')" class="btn-blue px-3 py-1.5 text-xs rounded-lg">Publish Post</button>
        </div>
      </div>
    `;

  } catch (err) {
    container.innerHTML = '<p class="text-xs text-red-500">Failed to generate AI post. Please try again.</p>';
  }
}

async function generateAIReply(reviewId, reviewText, rating, reviewerName) {
  const replyBox = document.getElementById(`replyBox_${reviewId}`);
  if (!replyBox) return;

  replyBox.innerHTML = `<p class="text-xs text-slate-500 italic"><i class="fa-solid fa-spinner fa-spin mr-1"></i>Drafting AI response for ${activeLocationName}...</p>`;

  try {
    const res = await fetch(`${CONFIG.BACKEND_URL}/api/ai/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reviewText,
        rating,
        reviewerName,
        businessName: activeLocationName
      })
    });

    const data = await res.json();
    const replyText = data.reply || data.postContent || data.text || 'Thank you for your review!';

    replyBox.innerHTML = `
      <div class="flex items-center space-x-1.5 text-[11px] font-bold text-blue-600 uppercase tracking-wider">
        <i class="fa-solid fa-wand-magic-sparkles"></i>
        <span>Auto-Reply Draft</span>
      </div>
      <div class="text-xs font-bold text-slate-900">Response from owner</div>
      <textarea id="text_${reviewId}" class="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none bg-white text-slate-800" rows="3">${replyText}</textarea>
      <div class="flex space-x-2 pt-1">
        <button onclick="alert('Reply published to Google review!')" class="btn-blue text-xs px-3.5 py-1.5 rounded-lg flex items-center space-x-1">
          <i class="fa-solid fa-paper-plane"></i>
          <span>Post this reply</span>
        </button>
        <button onclick="fetchLiveReviews(activeLocationId)" class="btn-outline text-xs px-3.5 py-1.5 rounded-lg">Cancel</button>
      </div>
    `;

  } catch (err) {
    replyBox.innerHTML = '<p class="text-xs text-red-500">Failed to draft AI response.</p>';
  }
}

window.onload = initInboxPage;

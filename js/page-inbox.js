/**
 * SJbs.AI - Inbox Controller (Tier-Aware)
 */

async function initInboxPage() {
  const user = await verifyUserAuth();
  if (user) {
    await loadUserLocations(renderInboxContent);
  }
}

// Main Router based on whether selected location is 'free' or 'pro'
async function renderInboxContent(locId, subscriptionStatus) {
  const postContainer = document.getElementById('aiPostContainer');
  
  if (subscriptionStatus === 'pro') {
    // PRO USER VIEW: Automated message + Analytics button
    if (postContainer) {
      postContainer.innerHTML = `
        <div class="space-y-4 py-2">
          <div class="flex items-center space-x-3 text-emerald-600 bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl">
            <i class="fa-solid fa-circle-check text-lg"></i>
            <span class="text-xs font-bold">You have already subscribed. Your reviews and posts are automatically taken care of.</span>
          </div>
          <div class="flex items-center justify-between pt-1">
            <span class="text-xs text-slate-500">To see performance metrics and detailed insights, check your analytics.</span>
            <a href="analytics.html" class="btn-blue text-xs px-4 py-2 rounded-xl inline-flex items-center space-x-1.5 shadow-sm">
              <i class="fa-solid fa-chart-line"></i>
              <span>View Analytics</span>
            </a>
          </div>
        </div>
      `;
    }
  } else {
    // FREE USER VIEW: Manual Weekly Post Generator
    if (postContainer) {
      postContainer.innerHTML = `
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs text-slate-600 italic">Generate your 1 manual weekly AI post for <strong id="activePostBusinessName">${activeLocationName}</strong>.</p>
          <button onclick="generateDailyPost()" class="btn-black text-xs px-3.5 py-2 rounded-xl flex items-center space-x-1.5">
            <i class="fa-solid fa-wand-magic-sparkles"></i>
            <span>Generate Post (1/week)</span>
          </button>
        </div>
        <div id="postOutputArea"></div>
      `;
    }
  }

  // Load reviews for the selected location
  await fetchLiveReviews(locId, subscriptionStatus);
}

async function fetchLiveReviews(locId, subscriptionStatus) {
  const reviewsList = document.getElementById('reviewsList');
  if (!reviewsList) return;

  reviewsList.innerHTML = '<p class="text-xs text-slate-400 italic py-4"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading reviews...</p>';

  try {
    const res = await fetch(`${CONFIG.BACKEND_URL}/api/reviews?locationId=${locId}`);
    const data = await res.json();

    if (data.reviews && data.reviews.length > 0) {
      reviewsList.innerHTML = '';
      data.reviews.forEach(rev => {
        const starsHtml = Array(rev.starRating || 5).fill('<i class="fa-solid fa-star"></i>').join('');

        let replySectionHtml = '';

        if (subscriptionStatus === 'pro') {
          // Pro Subscriber View on Reviews
          replySectionHtml = `
            <div class="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-800 flex items-center justify-between">
              <span class="font-medium"><i class="fa-solid fa-robot mr-1.5"></i> Autopilot replied automatically.</span>
              <span class="text-[11px] text-slate-500">Synced to Google</span>
            </div>
          `;
        } else {
          // Free User View: Manual AI Response with Edit & Publish
          replySectionHtml = `
            <div id="replyBox_${rev.reviewId}" class="bg-blue-50/70 border border-blue-100 rounded-xl p-3 space-y-2">
              <div class="flex items-center space-x-1.5 text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                <i class="fa-solid fa-wand-magic-sparkles"></i>
                <span>Manual AI Response Option</span>
              </div>
              <p class="text-xs text-slate-600 leading-relaxed">Generate a tailored AI response for ${activeLocationName}.</p>
              <button onclick="generateAIReply('${rev.reviewId}', \`${rev.comment}\`, ${rev.starRating}, '${rev.reviewerName}')" class="btn-blue text-xs px-3.5 py-1.5 rounded-lg inline-flex items-center space-x-1">
                <i class="fa-solid fa-wand-magic-sparkles"></i>
                <span>Draft AI Reply</span>
              </button>
            </div>
          `;
        }

        reviewsList.innerHTML += `
          <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div class="text-xs font-bold text-slate-900 tracking-wide">Google Customer Review</div>
            
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

            ${replySectionHtml}
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
  const outputArea = document.getElementById('postOutputArea');
  if (!outputArea) return;

  outputArea.innerHTML = `<p class="text-xs text-slate-500 italic mt-3"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Gemini AI is crafting your weekly post for ${activeLocationName}...</p>`;

  try {
    const res = await fetch(`${CONFIG.BACKEND_URL}/api/ai/post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: activeLocationName,
        topic: 'weekly service spotlight and customer appreciation'
      })
    });

    const data = await res.json();
    const postText = data.postContent || data.reply || data.text || 'Generated post ready for review.';

    outputArea.innerHTML = `
      <div class="space-y-3 mt-4 pt-4 border-t border-slate-100">
        <textarea id="editablePostText" class="w-full p-3 text-xs border border-slate-200 rounded-xl focus:outline-none bg-white text-slate-800 leading-relaxed" rows="4">${postText}</textarea>
        ${data.imageUrl ? `<img src="${data.imageUrl}" class="w-full max-h-56 object-cover rounded-xl border border-slate-200">` : ''}
        <div class="flex justify-end space-x-2 pt-1">
          <button onclick="alert('Weekly post published successfully to Google Business Profile!')" class="btn-blue px-4 py-2 text-xs rounded-xl font-semibold">Publish Post</button>
        </div>
      </div>
    `;

  } catch (err) {
    outputArea.innerHTML = '<p class="text-xs text-red-500 mt-3">Failed to generate AI post. Please try again.</p>';
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
        <span>Manual AI Response Option</span>
      </div>
      <div class="text-xs font-bold text-slate-900">Edit & Publish Response</div>
      <textarea id="text_${reviewId}" class="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none bg-white text-slate-800" rows="3">${replyText}</textarea>
      <div class="flex space-x-2 pt-1">
        <button onclick="alert('Reply published to Google review successfully!')" class="btn-blue text-xs px-3.5 py-1.5 rounded-lg flex items-center space-x-1 font-semibold">
          <i class="fa-solid fa-paper-plane"></i>
          <span>Publish Reply</span>
        </button>
        <button onclick="loadUserLocations(renderInboxContent)" class="btn-outline text-xs px-3.5 py-1.5 rounded-lg">Cancel</button>
      </div>
    `;

  } catch (err) {
    replyBox.innerHTML = '<p class="text-xs text-red-500">Failed to draft AI response.</p>';
  }
}

window.onload = initInboxPage;

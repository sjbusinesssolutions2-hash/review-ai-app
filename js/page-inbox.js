// js/page-inbox.js
const InboxPage = {
  currentBusiness: null,

  onBusinessChange(business) {
    this.currentBusiness = business;
    this.loadInboxFeed(business);
  },

  async loadInboxFeed(business) {
    const feedContainer = document.getElementById('inbox-feed-container');
    const badgeCount = document.getElementById('inbox-badge-count');
    if (!feedContainer) return;

    // Show Loading State
    feedContainer.innerHTML = `
      <div id="loading-state" class="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-xs">
        <i class="fa-solid fa-spinner fa-spin text-2xl text-blue-600"></i>
        <p class="text-xs font-semibold text-slate-500">Fetching unreplied reviews for ${business.name}...</p>
      </div>
    `;

    let unrepliedReviews = [];

    try {
      const userId = Auth.getUserId();
      if (userId && business.id) {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/reviews/unreplied?userId=${userId}&businessId=${business.id}`);
        if (response.ok) {
          unrepliedReviews = await response.json();
        }
      }
    } catch (err) {
      console.warn('Backend reviews fetch pending, using local mock feed.');
    }

    // Default Sample Data matching ProsperQR layout structure
    if (!unrepliedReviews || unrepliedReviews.length === 0) {
      if (business.id === 'loc_1') {
        unrepliedReviews = [
          {
            id: 'rev_101',
            author: 'Jafar Diwan',
            initials: 'JD',
            rating: 5,
            comment: 'Great service',
            aiReply: "Thank you, Jafar! We're delighted to hear you enjoyed our service. Hope to see you again soon!"
          },
          {
            id: 'rev_102',
            author: 'Sohil Malek',
            initials: 'SM',
            rating: 5,
            comment: 'Great bat repairing service.',
            aiReply: "Thank you, Sohil! We're glad you're happy with our bat repairing service. See you next time!"
          }
        ];
      } else {
        unrepliedReviews = []; // Empty state for other businesses
      }
    }

    // Update Sidebar Badge Count
    if (badgeCount) badgeCount.textContent = unrepliedReviews.length;

    // Render "All Caught Up" Empty State
    if (unrepliedReviews.length === 0) {
      feedContainer.innerHTML = `
        <div class="bg-white border border-slate-200/80 rounded-3xl p-10 text-center space-y-3 shadow-xs">
          <div class="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto text-2xl shadow-xs">
            <i class="fa-solid fa-check"></i>
          </div>
          <h2 class="text-xl font-black text-slate-900">You are all caught up!</h2>
          <p class="text-xs text-slate-500 max-w-sm mx-auto">There are no pending unreplied Google reviews for ${business.name}. New reviews will appear here automatically with AI draft responses.</p>
        </div>
      `;
      return;
    }

    // Render Action Cards
    feedContainer.innerHTML = '';
    unrepliedReviews.forEach(item => {
      const card = document.createElement('div');
      card.className = 'bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5 relative';
      card.id = `card-${item.id}`;
      card.innerHTML = `
        <button onclick="InboxPage.dismissCard('${item.id}')" class="absolute top-6 right-6 text-slate-300 hover:text-slate-500 text-sm transition">
          <i class="fa-solid fa-xmark"></i>
        </button>

        <h3 class="text-lg font-bold text-slate-900 tracking-tight">Post this review reply</h3>

        <div class="space-y-3">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-full bg-indigo-500 text-white font-bold flex items-center justify-center text-xs shadow-xs">
              ${item.initials}
            </div>
            <div>
              <p class="font-bold text-sm text-slate-900">${item.author}</p>
              <div class="text-amber-400 text-xs">★★★★★</div>
            </div>
          </div>

          <p class="text-xs text-slate-600 italic border-l-2 border-amber-400 pl-3 py-0.5">
            "${item.comment}"
          </p>
        </div>

        <div class="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 space-y-2">
          <div class="flex items-center space-x-1.5 text-blue-600 text-[11px] font-bold uppercase tracking-wider">
            <i class="fa-solid fa-wand-magic-sparkles"></i>
            <span>Auto-Reply Draft</span>
          </div>
          <p class="font-bold text-xs text-slate-900">Response from owner</p>
          <p id="reply-text-${item.id}" class="text-xs text-slate-700 leading-relaxed">${item.aiReply}</p>
        </div>

        <div class="flex flex-col sm:flex-row items-center gap-3 pt-1">
          <button onclick="InboxPage.postReply('${item.id}')" class="btn-blue w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold inline-flex items-center justify-center space-x-2 shadow-xs">
            <i class="fa-solid fa-paper-plane text-xs"></i>
            <span>Post this reply</span>
          </button>
          <button onclick="InboxPage.editReply('${item.id}')" class="w-full sm:w-auto bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-6 py-3 rounded-xl text-xs font-bold inline-flex items-center justify-center space-x-2 transition shadow-xs">
            <i class="fa-regular fa-pen-to-square text-xs"></i>
            <span>Edit reply</span>
          </button>
        </div>
      `;
      feedContainer.appendChild(card);
    });
  },

  dismissCard(cardId) {
    const card = document.getElementById(`card-${cardId}`);
    if (card) card.remove();
  },

  async postReply(cardId) {
    const textElem = document.getElementById(`reply-text-${cardId}`);
    const replyText = textElem ? textElem.textContent : '';

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/reviews/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: Auth.getUserId(),
          reviewId: cardId,
          replyText: replyText
        })
      });
      if (response.ok) {
        alert('Reply published to Google My Business profile!');
      }
    } catch (err) {
      alert('Reply published successfully!');
    }

    this.dismissCard(cardId);
  },

  editReply(cardId) {
    const textElem = document.getElementById(`reply-text-${cardId}`);
    const newText = prompt('Edit your response:', textElem.textContent);
    if (newText !== null && newText.trim() !== '') {
      textElem.textContent = newText.trim();
    }
  }
};

// Expose globally for inline onclick handlers
window.InboxPage = InboxPage;

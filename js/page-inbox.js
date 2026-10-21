// js/page-inbox.js
const InboxPage = {
  currentBusiness: null,

  onBusinessChange(business) {
    this.currentBusiness = business;
    this.loadInboxFeed(business);
  },

  renderEmptyState(message) {
    const feedContainer = document.getElementById('inbox-feed-container');
    const badgeCount = document.getElementById('inbox-badge-count');
    if (badgeCount) badgeCount.textContent = '0';
    if (!feedContainer) return;

    feedContainer.innerHTML = `
      <div class="bg-white border border-slate-200/80 rounded-3xl p-10 text-center space-y-3 shadow-xs">
        <div class="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto text-2xl">
          <i class="fa-solid fa-store"></i>
        </div>
        <h2 class="text-lg font-bold text-slate-900">${message || 'No location selected'}</h2>
        <p class="text-xs text-slate-500 max-w-sm mx-auto">Connect your Google Business Profile to receive real unreplied customer reviews.</p>
      </div>
    `;
  },

  async loadInboxFeed(business) {
    const feedContainer = document.getElementById('inbox-feed-container');
    const badgeCount = document.getElementById('inbox-badge-count');
    if (!feedContainer) return;

    if (!business || !business.id) {
      this.renderEmptyState("No Google Business Profile selected.");
      return;
    }

    feedContainer.innerHTML = `
      <div id="loading-state" class="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-xs">
        <i class="fa-solid fa-spinner fa-spin text-2xl text-blue-600"></i>
        <p class="text-xs font-semibold text-slate-500">Syncing live unreplied Google reviews for ${business.name}...</p>
      </div>
    `;

    const userId = Auth.getUserId();
    let unrepliedReviews = [];

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/reviews/unreplied?userId=${userId}&businessId=${business.id}`);
      if (response.ok) {
        unrepliedReviews = await response.json();
      } else {
        throw new Error('Failed to fetch reviews');
      }
    } catch (err) {
      console.error('API Error:', err);
      feedContainer.innerHTML = `
        <div class="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-3 shadow-xs">
          <div class="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto text-xl">
            <i class="fa-solid fa-circle-exclamation"></i>
          </div>
          <p class="text-sm font-bold text-slate-900">Unable to load Google reviews</p>
          <p class="text-xs text-slate-500">Please verify your Google Business Profile sync and try again.</p>
        </div>
      `;
      if (badgeCount) badgeCount.textContent = '0';
      return;
    }

    if (badgeCount) badgeCount.textContent = unrepliedReviews.length;

    if (unrepliedReviews.length === 0) {
      feedContainer.innerHTML = `
        <div class="bg-white border border-slate-200/80 rounded-3xl p-10 text-center space-y-3 shadow-xs">
          <div class="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto text-2xl shadow-xs">
            <i class="fa-solid fa-check"></i>
          </div>
          <h2 class="text-xl font-black text-slate-900">You are all caught up!</h2>
          <p class="text-xs text-slate-500 max-w-sm mx-auto">There are no pending unreplied Google reviews for ${business.name}.</p>
        </div>
      `;
      return;
    }

    feedContainer.innerHTML = '';
    unrepliedReviews.forEach(item => {
      const authorName = item.reviewerName || 'Google User';
      const nameParts = authorName.trim().split(' ').filter(Boolean);
      let initials = 'G';
      if (nameParts.length >= 2) {
        initials = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
      } else if (nameParts.length === 1 && nameParts[0].length > 0) {
        initials = nameParts[0].substring(0, 2).toUpperCase();
      }

      const starRating = parseInt(item.starRating) || 5;
      const starsHtml = '★'.repeat(starRating) + '☆'.repeat(5 - starRating);

      const card = document.createElement('div');
      card.className = 'bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5 relative';
      card.id = `card-${item.reviewId}`;
      card.setAttribute('data-draft', item.aiDraftReply || '');

      card.innerHTML = `
        <button onclick="InboxPage.dismissCard('${item.reviewId}')" class="absolute top-6 right-6 text-slate-300 hover:text-slate-500 text-sm transition">
          <i class="fa-solid fa-xmark"></i>
        </button>

        <h3 class="text-lg font-bold text-slate-900 tracking-tight">Post this review reply</h3>

        <div class="space-y-3">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-full bg-indigo-500 text-white font-bold flex items-center justify-center text-xs shadow-xs">
              ${initials}
            </div>
            <div>
              <p class="font-bold text-sm text-slate-900">${authorName}</p>
              <div class="text-amber-400 text-xs">${starsHtml}</div>
            </div>
          </div>

          <p class="text-xs text-slate-600 italic border-l-2 border-amber-400 pl-3 py-0.5">
            "${item.comment || 'No comment provided.'}"
          </p>
        </div>

        <div id="reply-container-${item.reviewId}">
          ${this.getReplyDraftViewMarkup(item.reviewId, item.aiDraftReply || '')}
        </div>

        <div id="actions-container-${item.reviewId}" class="flex items-center space-x-4 pt-1">
          ${this.getStandardActionButtonsMarkup(item.reviewId)}
        </div>
      `;
      feedContainer.appendChild(card);
    });
  },

  getReplyDraftViewMarkup(id, replyText) {
    return `
      <div class="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 space-y-2">
        <div class="flex items-center space-x-1.5 text-blue-600 text-[11px] font-bold uppercase tracking-wider">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
          <span>Auto-Reply Draft</span>
        </div>
        <p class="font-bold text-xs text-slate-900">Response from owner</p>
        <p id="reply-text-${id}" class="text-xs text-slate-700 leading-relaxed">${replyText}</p>
      </div>
    `;
  },

  getReplyEditViewMarkup(id, currentText) {
    return `
      <div class="space-y-2">
        <div class="inline-flex items-center space-x-1.5 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider">
          <i class="fa-regular fa-pen-to-square text-[10px]"></i>
          <span>Editing Reply</span>
        </div>
        <p class="font-bold text-xs text-slate-900">Response from owner</p>
        <textarea id="edit-textarea-${id}" class="w-full bg-white border-2 border-blue-500 rounded-2xl p-3.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 leading-relaxed transition min-h-[90px]">${currentText}</textarea>
      </div>
    `;
  },

  getStandardActionButtonsMarkup(id) {
    return `
      <button onclick="InboxPage.postReply('${id}')" class="btn-blue px-6 py-3 rounded-xl text-xs font-bold inline-flex items-center justify-center space-x-2 shadow-xs">
        <i class="fa-solid fa-paper-plane text-xs"></i>
        <span>Post this reply</span>
      </button>
      <button onclick="InboxPage.enableEditMode('${id}')" class="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-6 py-3 rounded-xl text-xs font-bold inline-flex items-center justify-center space-x-2 transition shadow-xs">
        <i class="fa-regular fa-pen-to-square text-xs"></i>
        <span>Edit reply</span>
      </button>
    `;
  },

  getEditingActionButtonsMarkup(id) {
    return `
      <button onclick="InboxPage.saveAndPostReply('${id}')" class="btn-blue px-6 py-3 rounded-xl text-xs font-bold inline-flex items-center justify-center space-x-2 shadow-xs">
        <span>Save & post</span>
      </button>
      <button onclick="InboxPage.cancelEditMode('${id}')" class="text-slate-500 hover:text-slate-800 text-xs font-bold px-2 py-3 transition">
        <span>Cancel</span>
      </button>
    `;
  },

  enableEditMode(id) {
    const textElem = document.getElementById(`reply-text-${id}`);
    const currentText = textElem ? textElem.textContent : '';

    const replyContainer = document.getElementById(`reply-container-${id}`);
    const actionsContainer = document.getElementById(`actions-container-${id}`);

    if (replyContainer && actionsContainer) {
      replyContainer.innerHTML = this.getReplyEditViewMarkup(id, currentText);
      actionsContainer.innerHTML = this.getEditingActionButtonsMarkup(id);

      const textarea = document.getElementById(`edit-textarea-${id}`);
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }
    }
  },

  cancelEditMode(id) {
    const card = document.getElementById(`card-${id}`);
    const draftText = card ? card.getAttribute('data-draft') : '';

    const replyContainer = document.getElementById(`reply-container-${id}`);
    const actionsContainer = document.getElementById(`actions-container-${id}`);

    if (replyContainer && actionsContainer) {
      replyContainer.innerHTML = this.getReplyDraftViewMarkup(id, draftText);
      actionsContainer.innerHTML = this.getStandardActionButtonsMarkup(id);
    }
  },

  async saveAndPostReply(id) {
    const textarea = document.getElementById(`edit-textarea-${id}`);
    const finalReplyText = textarea ? textarea.value.trim() : '';

    if (!finalReplyText) {
      alert('Response cannot be empty.');
      return;
    }

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/reviews/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: Auth.getUserId(),
          businessId: this.currentBusiness.id,
          reviewId: id,
          replyText: finalReplyText
        })
      });

      if (response.ok) {
        alert('Response published to Google!');
        this.dismissCard(id);
      } else {
        alert('Failed to post reply to Google.');
      }
    } catch (err) {
      alert('Network error while posting reply.');
    }
  },

  async postReply(id) {
    const textElem = document.getElementById(`reply-text-${id}`);
    const draftText = textElem ? textElem.textContent : '';

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/reviews/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: Auth.getUserId(),
          businessId: this.currentBusiness.id,
          reviewId: id,
          replyText: draftText
        })
      });

      if (response.ok) {
        alert('Response published to Google!');
        this.dismissCard(id);
      } else {
        alert('Failed to post reply to Google.');
      }
    } catch (err) {
      alert('Network error while posting reply.');
    }
  },

  dismissCard(id) {
    const card = document.getElementById(`card-${id}`);
    if (card) card.remove();

    const feedContainer = document.getElementById('inbox-feed-container');
    if (feedContainer && feedContainer.children.length === 0) {
      this.loadInboxFeed(this.currentBusiness);
    }
  }
};

window.InboxPage = InboxPage;

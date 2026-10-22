// js/page-reviews.js
const ReviewsPage = {
  allReviews: [],
  activeFilter: 'needsYou',
  currentEditingReviewId: null,

  async init() {
    const userId = Auth.getUserId();
    if (!userId) {
      window.location.href = 'login.html';
      return;
    }

    this.bindEvents();

    setTimeout(async () => {
      await this.loadReviews();
    }, 300);
  },

  bindEvents() {
    const tabContainer = document.getElementById('filter-tabs');
    if (tabContainer) {
      tabContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-filter]');
        if (!btn) return;
        this.activeFilter = btn.dataset.filter;
        this.updateTabStyles();
        this.renderReviews();
      });
    }

    window.addEventListener('businessChanged', () => {
      this.loadReviews();
    });

    const overlay = document.getElementById('drawer-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => this.closeDrawer());
    }
  },

  async loadReviews() {
    const userId = Auth.getUserId();
    const businessId = localStorage.getItem('sjbs_selected_business_id') || localStorage.getItem('active_business_id');
    const container = document.getElementById('reviews-feed-container');

    if (!container) return;

    if (!businessId) {
      container.innerHTML = `
        <div class="bg-white border border-slate-200/80 rounded-3xl p-10 text-center space-y-3 shadow-xs">
          <div class="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-lg">
            <i class="fa-solid fa-store"></i>
          </div>
          <p class="text-sm font-bold text-slate-900">No Business Location Selected</p>
          <p class="text-xs text-slate-500">Please choose a business from the top sidebar dropdown.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="bg-white border border-slate-200/80 rounded-3xl p-10 text-center space-y-3 shadow-xs">
        <i class="fa-solid fa-spinner fa-spin text-2xl text-blue-600"></i>
        <p class="text-xs font-semibold text-slate-500">Syncing live reviews from Google Business Profile...</p>
      </div>
    `;

    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/reviews/all?userId=${userId}&businessId=${businessId}`);
      if (!res.ok) throw new Error('Failed to fetch reviews');

      const data = await res.json();
      this.allReviews = data.reviews || [];

      document.getElementById('count-needsyou').textContent = data.counts.needsYou;
      document.getElementById('count-all').textContent = data.counts.all;
      document.getElementById('count-replied').textContent = data.counts.replied;

      const subheader = document.getElementById('reviews-subheader-count');
      if (subheader) subheader.textContent = `${data.counts.needsYou} need reply`;

      this.updateTabStyles();
      this.renderReviews();
    } catch (err) {
      console.error('Error loading reviews:', err);
      container.innerHTML = `
        <div class="bg-white border border-slate-200/80 rounded-3xl p-10 text-center space-y-3 shadow-xs">
          <div class="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto text-lg">
            <i class="fa-solid fa-triangle-exclamation"></i>
          </div>
          <p class="text-base font-bold text-slate-900">Unable to load Google reviews</p>
          <p class="text-xs text-slate-500">Please verify your Google profile connection or try refreshing.</p>
        </div>
      `;
    }
  },

  updateTabStyles() {
    const tabs = document.querySelectorAll('[data-filter]');
    tabs.forEach(tab => {
      const filter = tab.dataset.filter;
      if (filter === this.activeFilter) {
        tab.className = 'py-2.5 rounded-xl text-xs font-bold bg-white text-slate-900 shadow-xs border border-slate-200/80 transition';
      } else {
        tab.className = 'py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 transition';
      }
    });
  },

  getAvatarColor(name) {
    const colors = ['bg-emerald-500', 'bg-purple-500', 'bg-blue-500', 'bg-amber-500', 'bg-rose-500', 'bg-teal-500'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return colors[hash % colors.length];
  },

  getInitials(name) {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return 'G';
  },

  formatTimestamp(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const diffDays = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Today';
    return `${diffDays}d`;
  },

  renderReviews() {
    const container = document.getElementById('reviews-feed-container');
    if (!container) return;

    let filtered = [];
    if (this.activeFilter === 'needsYou') {
      filtered = this.allReviews.filter(r => !r.reply);
    } else if (this.activeFilter === 'replied') {
      filtered = this.allReviews.filter(r => r.reply);
    } else {
      filtered = this.allReviews;
    }

    if (filtered.length === 0) {
      if (this.activeFilter === 'needsYou') {
        container.innerHTML = `
          <div class="bg-white border border-slate-200/80 rounded-3xl p-10 text-center space-y-3 shadow-xs">
            <div class="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-lg">
              <i class="fa-solid fa-circle-check"></i>
            </div>
            <p class="text-base font-bold text-slate-900">You're all caught up!</p>
            <p class="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">Every review for this location has been responded to.</p>
          </div>
        `;
      } else if (this.activeFilter === 'replied') {
        container.innerHTML = `
          <div class="bg-white border border-slate-200/80 rounded-3xl p-10 text-center space-y-3 shadow-xs">
            <div class="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-lg">
              <i class="fa-solid fa-reply"></i>
            </div>
            <p class="text-base font-bold text-slate-900">No replied reviews yet</p>
            <p class="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">Select "Needs you" to write and post your first reply.</p>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="bg-white border border-slate-200/80 rounded-3xl p-10 text-center space-y-3 shadow-xs">
            <p class="text-base font-bold text-slate-900">No Google reviews found</p>
          </div>
        `;
      }
      return;
    }

    container.innerHTML = `
      <div class="bg-white border border-slate-200/80 rounded-3xl divide-y divide-slate-100 shadow-xs overflow-hidden">
        ${filtered.map(r => `
          <div onclick="ReviewsPage.openDrawer('${r.reviewId}')" class="p-4 sm:p-5 hover:bg-slate-50/60 cursor-pointer transition space-y-2">
            <div class="flex items-start justify-between">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 rounded-full ${this.getAvatarColor(r.reviewerName)} text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  ${this.getInitials(r.reviewerName)}
                </div>
                <div>
                  <p class="font-bold text-slate-900 text-sm">${r.reviewerName}</p>
                  <div class="flex items-center space-x-2 mt-0.5">
                    <div class="flex items-center space-x-0.5 text-amber-400 text-xs">
                      ${Array.from({length: 5}, (_, i) => `<i class="fa-${i < r.starRating ? 'solid' : 'regular'} fa-star"></i>`).join('')}
                    </div>
                    ${r.reply ? `<span class="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">Replied</span>` : ''}
                  </div>
                </div>
              </div>
              <span class="text-xs text-slate-400 font-medium">${this.formatTimestamp(r.updateTime)}</span>
            </div>
            <p class="text-xs sm:text-sm text-slate-700 leading-relaxed pl-13 line-clamp-2">${r.comment || 'No comment provided.'}</p>
          </div>
        `).join('')}
      </div>
    `;
  },

  openDrawer(reviewId) {
    const review = this.allReviews.find(r => r.reviewId === reviewId);
    if (!review) return;

    this.currentEditingReviewId = reviewId;
    const content = document.getElementById('drawer-content');
    const drawer = document.getElementById('review-drawer');
    const overlay = document.getElementById('drawer-overlay');

    if (!content || !drawer || !overlay) return;

    const isReplied = Boolean(review.reply);

    content.innerHTML = `
      <div class="flex items-start justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-12 h-12 rounded-full ${this.getAvatarColor(review.reviewerName)} text-white flex items-center justify-center font-bold text-sm shadow-xs">
            ${this.getInitials(review.reviewerName)}
          </div>
          <div>
            <h3 class="font-bold text-slate-900 text-base">${review.reviewerName}</h3>
            <div class="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
              <div class="flex items-center space-x-0.5 text-amber-400">
                ${Array.from({length: 5}, (_, i) => `<i class="fa-${i < review.starRating ? 'solid' : 'regular'} fa-star"></i>`).join('')}
              </div>
              <span>• ${this.formatTimestamp(review.updateTime)} ago</span>
            </div>
          </div>
        </div>

        <div class="flex items-center space-x-3">
          ${isReplied ? 
            `<span class="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-100">Replied</span>` : 
            `<span class="bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1 rounded-full border border-amber-100">Needs reply</span>`
          }
          <button onclick="ReviewsPage.closeDrawer()" class="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      <div class="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-sm text-slate-800 leading-relaxed">
        ${review.comment || 'No comment provided.'}
      </div>

      <div id="drawer-reply-area">
        ${isReplied ? this.renderRepliedState(review) : this.renderUnrepliedState(review)}
      </div>
    `;

    drawer.classList.remove('drawer-closed');
    drawer.classList.add('drawer-open');
    overlay.classList.remove('drawer-hidden');
    overlay.classList.add('drawer-visible');
  },

  renderUnrepliedState(review) {
    return `
      <div class="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 shadow-xs">
        <textarea id="drawer-reply-input" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed" rows="5" placeholder="Write a reply...">${review.aiDraftReply || ''}</textarea>
        <div class="flex justify-end">
          <button id="send-reply-btn" onclick="ReviewsPage.submitReply('${review.reviewId}')" class="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center space-x-2 transition shadow-xs">
            <span>Send reply</span>
          </button>
        </div>
      </div>
    `;
  },

  renderRepliedState(review) {
    return `
      <div class="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-blue-600">Your reply</span>
          <button onclick="ReviewsPage.enableEditMode('${review.reviewId}')" class="text-xs font-bold text-slate-500 hover:text-slate-800 transition">Edit</button>
        </div>
        <p class="text-xs sm:text-sm text-slate-700 leading-relaxed">${review.reply}</p>
      </div>
    `;
  },

  enableEditMode(reviewId) {
    const review = this.allReviews.find(r => r.reviewId === reviewId);
    if (!review) return;

    const area = document.getElementById('drawer-reply-area');
    if (!area) return;

    area.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 shadow-xs">
        <textarea id="drawer-reply-input" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed" rows="5">${review.reply || ''}</textarea>
        <div class="flex items-center justify-end space-x-3">
          <button onclick="ReviewsPage.cancelEdit('${reviewId}')" class="text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 transition">Cancel</button>
          <button id="send-reply-btn" onclick="ReviewsPage.submitReply('${reviewId}')" class="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition shadow-xs inline-flex items-center space-x-2">
            <span>Send reply</span>
          </button>
        </div>
      </div>
    `;
  },

  cancelEdit(reviewId) {
    const review = this.allReviews.find(r => r.reviewId === reviewId);
    if (!review) return;

    const area = document.getElementById('drawer-reply-area');
    if (area) {
      area.innerHTML = this.renderRepliedState(review);
    }
  },

  closeDrawer() {
    const drawer = document.getElementById('review-drawer');
    const overlay = document.getElementById('drawer-overlay');
    if (drawer && overlay) {
      drawer.classList.remove('drawer-open');
      drawer.classList.add('drawer-closed');
      overlay.classList.remove('drawer-visible');
      overlay.classList.add('drawer-hidden');
    }
  },

  async submitReply(reviewId) {
    const userId = Auth.getUserId();
    const businessId = localStorage.getItem('sjbs_selected_business_id') || localStorage.getItem('active_business_id');
    const textarea = document.getElementById('drawer-reply-input');
    const sendBtn = document.getElementById('send-reply-btn');

    if (!textarea) return;

    const replyText = textarea.value.trim();
    if (!replyText) {
      alert('Reply text cannot be empty');
      return;
    }

    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-xs"></i> <span>Posting to Google...</span>`;
    }

    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/reviews/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, businessId, reviewId, replyText })
      });

      if (res.ok) {
        this.closeDrawer();
        await this.loadReviews();
      } else {
        const errorData = await res.json();
        alert(`Failed to post reply: ${errorData.error || 'Please try again.'}`);
        if (sendBtn) {
          sendBtn.disabled = false;
          sendBtn.innerHTML = `<span>Send reply</span>`;
        }
      }
    } catch (e) {
      alert('Network error posting reply.');
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.innerHTML = `<span>Send reply</span>`;
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', () => ReviewsPage.init());

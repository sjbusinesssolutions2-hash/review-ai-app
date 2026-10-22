// js/page-reviews.js
const ReviewsPage = {
  allReviews: [],
  activeFilter: 'needsYou',

    async init() {
    const userId = Auth.getUserId();
    if (!userId) {
      window.location.href = 'login.html';
      return;
    }

    this.bindEvents();

    // Give the navigation.js script a moment to load locations, 
    // or select the first one if localStorage is empty.
    setTimeout(async () => {
      let businessId = localStorage.getItem('sjbs_selected_business_id');
      if (!businessId && window.Navigation && Navigation.locations && Navigation.locations.length > 0) {
        businessId = Navigation.locations[0].locationId;
        localStorage.setItem('sjbs_selected_business_id', businessId);
      }
      await this.loadReviews();
    }, 400);
  },

  bindEvents() {
    // Listen for tab switching
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

    // Listen for global business dropdown selection change
    window.addEventListener('businessChanged', () => {
      this.loadReviews();
    });
  },

  async loadReviews() {
    const userId = Auth.getUserId();
    const businessId = localStorage.getItem('sjbs_selected_business_id');
    const container = document.getElementById('reviews-feed-container');

    if (!container) return;

    if (!businessId) {
      container.innerHTML = `
        <div class="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-xs">
          <i class="fa-solid fa-store text-3xl text-slate-400"></i>
          <p class="text-sm font-bold text-slate-800">No Business Location Selected</p>
          <p class="text-xs text-slate-500">Please choose a business from the top sidebar dropdown.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-xs">
        <i class="fa-solid fa-spinner fa-spin text-2xl text-blue-600"></i>
        <p class="text-xs font-semibold text-slate-500">Loading reviews from Google Business Profile...</p>
      </div>
    `;

    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/reviews/all?userId=${userId}&businessId=${businessId}`);
      if (!res.ok) throw new Error('Failed to fetch reviews');

      const data = await res.json();
      this.allReviews = data.reviews || [];

      // Update badge counts in tab bar
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
        <div class="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-xs">
          <div class="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto text-lg">
            <i class="fa-solid fa-triangle-exclamation"></i>
          </div>
          <p class="text-base font-bold text-slate-900">Unable to load Google reviews</p>
          <p class="text-xs text-slate-500">Please verify your Google Business Profile connection and try again.</p>
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
    if (!dateStr) return '6d';
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
      container.innerHTML = `
        <div class="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-2 shadow-xs">
          <p class="text-base font-bold text-slate-900">No reviews found in this tab</p>
          <p class="text-xs text-slate-500">Select another tab or switch location to view reviews.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 shadow-xs overflow-hidden">
        ${filtered.map(r => `
          <div class="p-4 sm:p-5 hover:bg-slate-50/50 transition space-y-3">
            <div class="flex items-start justify-between">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 rounded-full ${this.getAvatarColor(r.reviewerName)} text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  ${this.getInitials(r.reviewerName)}
                </div>
                <div>
                  <p class="font-bold text-slate-900 text-sm">${r.reviewerName}</p>
                  <div class="flex items-center space-x-1 text-amber-400 text-xs">
                    ${Array.from({length: 5}, (_, i) => `<i class="fa-${i < r.starRating ? 'solid' : 'regular'} fa-star"></i>`).join('')}
                  </div>
                </div>
              </div>
              <span class="text-xs text-slate-400 font-medium">${this.formatTimestamp(r.updateTime)}</span>
            </div>

            <p class="text-xs sm:text-sm text-slate-700 leading-relaxed pl-13">${r.comment || 'No comment provided.'}</p>

            ${r.reply ? `
              <div class="ml-13 bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-xs text-slate-600 space-y-1">
                <p class="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Your Reply</p>
                <p>${r.reply}</p>
              </div>
            ` : `
              <div class="ml-13 bg-blue-50/60 border border-blue-100 rounded-xl p-3 space-y-2">
                <div class="flex items-center justify-between text-[11px] font-bold text-blue-600">
                  <span class="uppercase tracking-wider flex items-center space-x-1">
                    <i class="fa-solid fa-wand-magic-sparkles"></i>
                    <span>Gemini AI Draft Reply</span>
                  </span>
                </div>
                <textarea id="reply-input-${r.reviewId}" class="w-full bg-white border border-blue-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed" rows="2">${r.aiDraftReply || ''}</textarea>
                <div class="flex justify-end">
                  <button onclick="ReviewsPage.postReply('${r.reviewId}')" class="btn-blue px-3.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center space-x-1.5 shadow-xs">
                    <span>Post Reply Live</span>
                    <i class="fa-solid fa-paper-plane text-[10px]"></i>
                  </button>
                </div>
              </div>
            `}
          </div>
        `).join('')}
      </div>
    `;
  },

  async postReply(reviewId) {
    const userId = Auth.getUserId();
    const businessId = localStorage.getItem('sjbs_selected_business_id');
    const textarea = document.getElementById(`reply-input-${reviewId}`);
    if (!textarea) return;

    const replyText = textarea.value.trim();
    if (!replyText) {
      alert('Reply text cannot be empty');
      return;
    }

    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/reviews/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, businessId, reviewId, replyText })
      });

      if (res.ok) {
        alert('Reply posted successfully!');
        this.loadReviews();
      } else {
        alert('Failed to post reply.');
      }
    } catch (e) {
      alert('Network error.');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => ReviewsPage.init());
                                                                        

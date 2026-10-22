// js/page-inbox.js
const InboxPage = {
  unrepliedReviews: [],

  async init() {
    const userId = Auth.getUserId();
    if (!userId) {
      window.location.href = 'login.html';
      return;
    }

    this.bindEvents();

    setTimeout(async () => {
      await this.loadInboxTasks();
    }, 300);
  },

  bindEvents() {
    window.addEventListener('businessChanged', () => {
      this.loadInboxTasks();
    });
  },

  async loadInboxTasks() {
    const userId = Auth.getUserId();
    const businessId = localStorage.getItem('sjbs_selected_business_id') || localStorage.getItem('active_business_id');
    const container = document.getElementById('inbox-tasks-container');

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
        <p class="text-xs font-semibold text-slate-500">Syncing live review tasks...</p>
      </div>
    `;

    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/reviews/all?userId=${userId}&businessId=${businessId}`);
      if (!res.ok) throw new Error('Failed to fetch tasks');

      const data = await res.json();
      const all = data.reviews || [];

      // Filter unreplied reviews that have an AI draft ready
      this.unrepliedReviews = all.filter(r => !r.reply && r.aiDraftReply && r.aiDraftReply.length > 0);

      this.renderTasks();
    } catch (err) {
      console.error('Error loading inbox tasks:', err);
      container.innerHTML = `
        <div class="bg-white border border-slate-200/80 rounded-3xl p-10 text-center space-y-3 shadow-xs">
          <div class="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto text-lg">
            <i class="fa-solid fa-triangle-exclamation"></i>
          </div>
          <p class="text-base font-bold text-slate-900">Unable to load tasks</p>
          <p class="text-xs text-slate-500">Please verify your connection and try refreshing.</p>
        </div>
      `;
    }
  },

  getAvatarColor(name) {
    const colors = ['bg-indigo-500', 'bg-purple-500', 'bg-blue-500', 'bg-amber-500', 'bg-rose-500', 'bg-teal-500'];
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

  formatCurrentDate() {
    const now = new Date();
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    return now.toLocaleDateString('en-US', options);
  },

  renderTasks() {
    const container = document.getElementById('inbox-tasks-container');
    if (!container) return;

    if (this.unrepliedReviews.length === 0) {
      container.innerHTML = `
        <div class="bg-gradient-to-b from-blue-500 to-indigo-600 rounded-3xl p-10 text-center text-white space-y-4 shadow-xl">
          <div class="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center mx-auto text-xl border border-white/30 shadow-inner">
            <i class="fa-solid fa-check text-2xl"></i>
          </div>
          <div class="space-y-1">
            <p class="text-xs font-semibold text-blue-100 uppercase tracking-widest">${this.formatCurrentDate()}</p>
            <h2 class="text-2xl sm:text-3xl font-black tracking-tight">You're done for today.</h2>
            <p class="text-xs sm:text-sm text-blue-100 font-medium">Check back tomorrow for more tasks</p>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = this.unrepliedReviews.map(r => `
      <div id="task-card-${r.reviewId}" class="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xs">
        
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-black text-slate-900 tracking-tight">Post this review reply</h2>
            <button onclick="InboxPage.dismissTask('${r.reviewId}')" class="text-slate-400 hover:text-slate-600 p-1 transition">
              <i class="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>

          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-full ${this.getAvatarColor(r.reviewerName)} text-white flex items-center justify-center font-bold text-xs shadow-xs">
              ${this.getInitials(r.reviewerName)}
            </div>
            <div>
              <p class="font-bold text-slate-900 text-sm">${r.reviewerName}</p>
              <div class="flex items-center space-x-0.5 text-amber-400 text-xs mt-0.5">
                ${Array.from({length: 5}, (_, i) => `<i class="fa-${i < r.starRating ? 'solid' : 'regular'} fa-star"></i>`).join('')}
              </div>
            </div>
          </div>

          <div class="border-l-2 border-amber-400 pl-3 py-0.5">
            <p class="text-xs sm:text-sm italic text-slate-700 leading-relaxed">${r.comment || 'No comment provided.'}</p>
          </div>
        </div>

        <div id="ai-reply-area-${r.reviewId}" class="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 space-y-2">
          <div class="flex items-center space-x-1.5 text-blue-600 font-bold text-[11px] uppercase tracking-wider">
            <i class="fa-solid fa-wand-magic-sparkles"></i>
            <span>Auto-Reply Draft</span>
          </div>
          <p class="text-xs font-bold text-slate-900">Response from owner</p>
          <p id="draft-text-${r.reviewId}" class="text-xs sm:text-sm text-slate-700 leading-relaxed">${r.aiDraftReply}</p>
        </div>

        <div id="action-buttons-${r.reviewId}" class="flex items-center space-x-3 pt-1">
          <button id="post-btn-${r.reviewId}" onclick="InboxPage.postReply('${r.reviewId}')" class="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl inline-flex items-center space-x-2 transition shadow-xs">
            <i class="fa-solid fa-paper-plane text-xs"></i>
            <span>Post this reply</span>
          </button>
          
          <button onclick="InboxPage.enableEdit('${r.reviewId}')" class="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl inline-flex items-center space-x-2 transition shadow-xs">
            <i class="fa-regular fa-pen-to-square text-xs text-slate-400"></i>
            <span>Edit reply</span>
          </button>
        </div>

      </div>
    `).join('');
  },

  enableEdit(reviewId) {
    const review = this.unrepliedReviews.find(r => r.reviewId === reviewId);
    if (!review) return;

    const currentText = document.getElementById(`draft-text-${reviewId}`)?.textContent || review.aiDraftReply;
    const area = document.getElementById(`ai-reply-area-${reviewId}`);
    const actions = document.getElementById(`action-buttons-${reviewId}`);

    if (area && actions) {
      area.className = "bg-white border border-slate-200 rounded-2xl p-3 shadow-xs";
      area.innerHTML = `
        <textarea id="edit-input-${reviewId}" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed" rows="4">${currentText}</textarea>
      `;

      actions.innerHTML = `
        <div class="flex items-center justify-end space-x-3 w-full">
          <button onclick="InboxPage.cancelEdit('${reviewId}')" class="text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 transition">Cancel</button>
          <button id="post-btn-${reviewId}" onclick="InboxPage.postCustomReply('${reviewId}')" class="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition shadow-xs inline-flex items-center space-x-2">
            <span>Send reply</span>
          </button>
        </div>
      `;
    }
  },

  cancelEdit(reviewId) {
    this.renderTasks();
  },

  async dismissTask(reviewId) {
    const userId = Auth.getUserId();
    const card = document.getElementById(`task-card-${reviewId}`);

    if (card) {
      card.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      card.style.opacity = '0';
      card.style.transform = 'scale(0.95)';
    }

    try {
      await fetch(`${CONFIG.API_BASE_URL}/api/reviews/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reviewId })
      });
    } catch (e) {
      console.warn('Dismiss notice:', e);
    }

    setTimeout(() => {
      this.unrepliedReviews = this.unrepliedReviews.filter(r => r.reviewId !== reviewId);
      this.renderTasks();
    }, 250);
  },

  async postReply(reviewId) {
    const review = this.unrepliedReviews.find(r => r.reviewId === reviewId);
    if (!review) return;

    const replyText = review.aiDraftReply;
    await this.sendToGoogle(reviewId, replyText);
  },

  async postCustomReply(reviewId) {
    const input = document.getElementById(`edit-input-${reviewId}`);
    if (!input) return;

    const replyText = input.value.trim();
    if (!replyText) {
      alert('Reply text cannot be empty');
      return;
    }

    await this.sendToGoogle(reviewId, replyText);
  },

  async sendToGoogle(reviewId, replyText) {
    const userId = Auth.getUserId();
    const businessId = localStorage.getItem('sjbs_selected_business_id') || localStorage.getItem('active_business_id');
    const postBtn = document.getElementById(`post-btn-${reviewId}`);

    if (postBtn) {
      postBtn.disabled = true;
      postBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-xs"></i> <span>Posting to Google...</span>`;
    }

    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/reviews/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, businessId, reviewId, replyText })
      });

      if (res.ok) {
        this.unrepliedReviews = this.unrepliedReviews.filter(r => r.reviewId !== reviewId);
        this.renderTasks();
      } else {
        const errorData = await res.json();
        alert(`Failed to post reply: ${errorData.error || 'Please try again.'}`);
        if (postBtn) {
          postBtn.disabled = false;
          postBtn.innerHTML = `<span>Post this reply</span>`;
        }
      }
    } catch (e) {
      alert('Network error posting reply.');
      if (postBtn) {
        postBtn.disabled = false;
        postBtn.innerHTML = `<span>Post this reply</span>`;
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', () => InboxPage.init());

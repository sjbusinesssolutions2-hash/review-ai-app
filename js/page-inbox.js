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
        <div class="p-8 text-center space-y-3">
          <p class="text-sm font-bold text-slate-800">No Business Location Selected</p>
          <p class="text-xs text-slate-500">Please choose a business from the dropdown above.</p>
        </div>
      `;
      return;
    }

    // Sleek matching dark/blue gradient loader to prevent white jarring flashes
    container.innerHTML = `
      <div class="fixed inset-0 z-10 flex flex-col items-center justify-center space-y-4" style="background: linear-gradient(180deg, #60a5fa 0%, #3b82f6 45%, #6366f1 80%, #4338ca 100%); min-height: 100vh;">
        <div class="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
        <p class="text-xs font-bold text-blue-100 tracking-widest uppercase animate-pulse">Checking AI tasks...</p>
      </div>
    `;

    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/reviews/all?userId=${userId}&businessId=${businessId}`);
      if (!res.ok) throw new Error('API response failed');

      const data = await res.json();
      const all = data.reviews || [];

      this.unrepliedReviews = all.filter(r => !r.reply && r.aiDraftReply && r.aiDraftReply.length > 0);

      this.renderTasks();
    } catch (err) {
      console.error('Error loading inbox tasks:', err);
      this.unrepliedReviews = [];
      this.renderTasks();
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

  getFormattedDateTime() {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = days[now.getDay()];
    const monthName = months[now.getMonth()];
    const dayNum = now.getDate();
    
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    return `${dayName}, ${monthName} ${dayNum} · ${hours}:${minutes} ${ampm}`;
  },

  renderTasks() {
    const container = document.getElementById('inbox-tasks-container');
    if (!container) return;

    if (this.unrepliedReviews.length === 0) {
      // Butter-smooth ProsperQR Entrance Transition
      container.innerHTML = `
        <style>
          @keyframes ufoFloat {
            0% { transform: translateX(-60px) translateY(0px); }
            50% { transform: translateX(60px) translateY(-10px); }
            100% { transform: translateX(-60px) translateY(0px); }
          }
          @keyframes smoothFadeIn {
            0% { opacity: 0; transform: translateY(12px) scale(0.98); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          .ufo-anim {
            animation: ufoFloat 8s ease-in-out infinite;
          }
          .smooth-fade {
            animation: smoothFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        </style>

        <div class="fixed inset-0 z-10 overflow-hidden flex flex-col justify-between select-none smooth-fade" style="background: linear-gradient(180deg, #60a5fa 0%, #3b82f6 45%, #6366f1 80%, #4338ca 100%); min-height: 100vh;">
          
          <!-- Animated UFO / Clouds in Sky -->
          <div class="absolute top-16 left-1/2 -translate-x-1/2 ufo-anim opacity-80 pointer-events-none">
            <svg width="64" height="28" viewBox="0 0 64 28" fill="none">
              <ellipse cx="32" cy="18" rx="28" ry="8" fill="#E0F2FE" fill-opacity="0.9"/>
              <path d="M20 16C20 10 25 6 32 6C39 6 44 10 44 16H20Z" fill="#BAE6FD"/>
              <circle cx="24" cy="18" r="2" fill="#38BDF8"/>
              <circle cx="32" cy="18" r="2" fill="#38BDF8"/>
              <circle cx="40" cy="18" r="2" fill="#38BDF8"/>
            </svg>
          </div>

          <div></div>

          <!-- Central Content Card -->
          <div class="text-center px-6 space-y-6">
            <div class="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-2xl border-4 border-white/20">
              <i class="fa-solid fa-check text-4xl"></i>
            </div>

            <div class="space-y-2">
              <p class="text-xs sm:text-sm font-semibold text-blue-100 tracking-wide uppercase opacity-90">
                ${this.getFormattedDateTime()}
              </p>
              <h1 class="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                You're done for today.
              </h1>
              <p class="text-sm sm:text-base font-medium text-blue-100/90">
                Check back tomorrow for more tasks
              </p>
            </div>
          </div>

          <!-- Bottom Mountain & Glowing Sun Illustration -->
          <div class="relative w-full h-40 overflow-hidden pointer-events-none">
            <div class="absolute -bottom-10 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-amber-200/90 blur-sm shadow-[0_0_80px_rgba(251,191,36,0.8)]"></div>
            <svg class="absolute bottom-0 w-full h-24" viewBox="0 0 1440 120" preserveAspectRatio="none">
              <path fill="#312e81" fill-opacity="0.6" d="M0,32L120,42.7C240,53,480,75,720,74.7C960,75,1200,53,1320,42.7L1440,32L1440,120L1320,120C1200,120,960,120,720,120C480,120,240,120,120,120L0,120Z"></path>
              <path fill="#1e1b4b" d="M0,64L120,69.3C240,75,480,85,720,80C960,75,1200,53,1320,42.7L1440,32L1440,120L1320,120C1200,120,960,120,720,120C480,120,240,120,120,120L0,120Z"></path>
            </svg>
          </div>

        </div>
      `;
      return;
    }

    // Active Task Cards Flow
    container.innerHTML = this.unrepliedReviews.map(r => `
      <div id="task-card-${r.reviewId}" class="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xs mb-6">
        
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
      card.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
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
    }, 200);
  },

  async postReply(reviewId) {
    const review = this.unrepliedReviews.find(r => r.reviewId === reviewId);
    if (!review) return;

    await this.sendToGoogle(reviewId, review.aiDraftReply);
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

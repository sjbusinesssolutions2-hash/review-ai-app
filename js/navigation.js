// js/navigation.js
const Navigation = {
  businesses: [],
  activeBusinessId: null,

  async init() {
    await fetchCurrentUser();
    await this.loadBusinesses();
  },

  async loadBusinesses() {
    const userId = Auth.getUserId();

    if (!userId) {
      this.renderNoBusinessState("Please sign in with Google to access your locations.");
      return;
    }

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/businesses?userId=${userId}&t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (response.ok) {
        this.businesses = await response.json();
      } else {
        this.businesses = [];
      }
    } catch (err) {
      console.warn('Network error loading locations:', err);
      this.businesses = [];
    }

    if (!this.businesses || this.businesses.length === 0) {
      this.renderNoBusinessState("No Google Business Profile locations connected.");
      return;
    }

    const savedKey = CONFIG.STORAGE_KEYS ? CONFIG.STORAGE_KEYS.ACTIVE_BUSINESS_ID : 'sjbs_selected_business_id';
    const savedBusinessId = localStorage.getItem(savedKey) || localStorage.getItem('sjbs_selected_business_id');
    const initialBusiness = this.businesses.find(b => b.id === savedBusinessId) || this.businesses[0];

    this.renderLocationsList();
    if (initialBusiness) {
      this.selectBusiness(initialBusiness.id);
    }
  },

  renderNoBusinessState(message) {
    const nameElem = document.getElementById('selected-business-name');
    const ratingElem = document.getElementById('selected-business-rating');
    const reviewsElem = document.getElementById('selected-business-reviews');
    const planElem = document.getElementById('selected-business-plan');
    const locationsList = document.getElementById('locations-list');

    if (nameElem) nameElem.textContent = "No Location Connected";
    if (ratingElem) ratingElem.textContent = "";
    if (reviewsElem) reviewsElem.textContent = "";
    if (planElem) {
      planElem.textContent = "Inactive";
      planElem.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500";
    }

    localStorage.setItem('sjbs_business_plan', 'free');
    localStorage.setItem('sjbs_selected_plan', 'free');

    if (locationsList) {
      locationsList.innerHTML = `<p class="text-xs text-slate-400 p-3 text-center">${message}</p>`;
    }

    if (window.InboxPage && typeof window.InboxPage.renderEmptyState === 'function') {
      window.InboxPage.renderEmptyState(message);
    }
  },

  renderLocationsList() {
    const locationsList = document.getElementById('locations-list');
    if (!locationsList) return;

    locationsList.innerHTML = this.businesses.map(loc => {
      const isPro = (loc.subscriptionStatus === 'pro') || loc.hasActivePlan || loc.plan === 'pro';
      return `
        <button onclick="Navigation.selectBusiness('${loc.id}')" class="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between transition">
          <div>
            <p class="text-xs font-bold text-slate-800">${loc.name}</p>
            <p class="text-[10px] text-slate-400">★ ${loc.rating || '0.0'} (${loc.reviewCount || 0}) ${isPro ? '• Active Plan' : '• Free'}</p>
          </div>
          ${loc.id === this.activeBusinessId ? '<i class="fa-solid fa-check text-blue-600 text-xs"></i>' : ''}
        </button>
      `;
    }).join('');
  },

  selectBusiness(businessId) {
    this.activeBusinessId = businessId;

    if (CONFIG.STORAGE_KEYS && CONFIG.STORAGE_KEYS.ACTIVE_BUSINESS_ID) {
      localStorage.setItem(CONFIG.STORAGE_KEYS.ACTIVE_BUSINESS_ID, businessId);
    }
    localStorage.setItem('sjbs_selected_business_id', businessId);

    const business = this.businesses.find(b => b.id === businessId);
    if (!business) return;

    // Direct plan determination
    const rawStatus = business.subscriptionStatus || business.plan || (business.hasActivePlan ? 'pro' : 'free');
    const planStatus = String(rawStatus).toLowerCase();

    localStorage.setItem('sjbs_business_plan', planStatus);
    localStorage.setItem('sjbs_selected_plan', planStatus);

    const nameElem = document.getElementById('selected-business-name');
    const ratingElem = document.getElementById('selected-business-rating');
    const reviewsElem = document.getElementById('selected-business-reviews');
    const planElem = document.getElementById('selected-business-plan');

    if (nameElem) nameElem.textContent = business.name;
    if (ratingElem) ratingElem.textContent = business.rating ? `★ ${business.rating}` : '';
    if (reviewsElem) reviewsElem.textContent = business.reviewCount !== undefined ? `(${business.reviewCount})` : '';

    const isPro = planStatus === 'pro' || planStatus === 'active';

    if (planElem) {
      planElem.textContent = isPro ? 'Active' : 'Free';
      planElem.className = isPro 
        ? 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700'
        : 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600';
    }

    // Direct update to header container or upgrade-plan link fallback
    const headerPlanContainer = document.getElementById('header-plan-action');
    const upgradeBtnElem = document.querySelector('a[href="upgrade-plan.html"], a[href="settings.html"]');

    const proHTML = `
      <a href="settings.html" class="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-full text-xs font-bold inline-flex items-center space-x-2 shadow-xs transition">
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>Active Plan</span>
      </a>
    `;

    const freeHTML = `
      <a href="upgrade-plan.html" class="btn-blue px-4 py-2 rounded-full text-xs font-bold inline-flex items-center space-x-1.5 shadow-xs">
        <span>Upgrade plan</span>
      </a>
    `;

    if (headerPlanContainer) {
      headerPlanContainer.innerHTML = isPro ? proHTML : freeHTML;
    } else if (upgradeBtnElem && upgradeBtnElem.parentElement) {
      upgradeBtnElem.parentElement.innerHTML = isPro ? proHTML : freeHTML;
    }

    const locationsMenu = document.getElementById('locations-menu');
    if (locationsMenu) locationsMenu.classList.add('hidden');

    this.renderLocationsList();

    window.dispatchEvent(new Event('businessChanged'));

    if (window.InboxPage && typeof window.InboxPage.onBusinessChange === 'function') {
      window.InboxPage.onBusinessChange(business);
    }
  }
};

async function fetchCurrentUser() {
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/user/me?t=${Date.now()}`, {
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    }
  } catch (err) {
    console.warn('Could not refresh user status:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => Navigation.init());

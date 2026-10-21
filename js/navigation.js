// js/navigation.js
const Navigation = {
  businesses: [],
  activeBusinessId: null,

  init() {
    this.loadBusinesses();
  },

  async loadBusinesses() {
    const userId = Auth.getUserId();
    const locationsList = document.getElementById('locations-list');

    if (!userId) {
      if (locationsList) locationsList.innerHTML = `<p class="text-xs text-slate-400 p-2 text-center">Please log in via Google</p>`;
      return;
    }

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/businesses?userId=${userId}`);
      if (response.ok) {
        this.businesses = await response.json();
      }
    } catch (err) {
      console.warn('Error connecting to backend:', err);
    }

    if (!this.businesses || this.businesses.length === 0) {
      if (locationsList) {
        locationsList.innerHTML = `<p class="text-xs text-slate-400 p-2 text-center">No connected Google Business locations found.</p>`;
      }
      return;
    }

    const savedBusinessId = localStorage.getItem(CONFIG.STORAGE_KEYS.ACTIVE_BUSINESS_ID);
    const initialBusiness = this.businesses.find(b => b.id === savedBusinessId) || this.businesses[0];

    this.renderLocationsList();
    if (initialBusiness) {
      this.selectBusiness(initialBusiness.id);
    }
  },

  renderLocationsList() {
    const locationsList = document.getElementById('locations-list');
    if (!locationsList) return;

    locationsList.innerHTML = this.businesses.map(loc => `
      <button onclick="Navigation.selectBusiness('${loc.id}')" class="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between transition">
        <div>
          <p class="text-xs font-bold text-slate-800">${loc.name}</p>
          <p class="text-[10px] text-slate-400">★ ${loc.rating || '5.0'} (${loc.reviewCount || 0}) ${loc.hasActivePlan ? '• Active Plan' : '• Free'}</p>
        </div>
        ${loc.id === this.activeBusinessId ? '<i class="fa-solid fa-check text-blue-600 text-xs"></i>' : ''}
      </button>
    `).join('');
  },

  selectBusiness(businessId) {
    this.activeBusinessId = businessId;
    localStorage.setItem(CONFIG.STORAGE_KEYS.ACTIVE_BUSINESS_ID, businessId);

    const business = this.businesses.find(b => b.id === businessId);
    if (!business) return;

    const nameElem = document.getElementById('selected-business-name');
    const ratingElem = document.getElementById('selected-business-rating');
    const reviewsElem = document.getElementById('selected-business-reviews');
    const planElem = document.getElementById('selected-business-plan');

    if (nameElem) nameElem.textContent = business.name;
    if (ratingElem) ratingElem.textContent = `★ ${business.rating || '5.0'}`;
    if (reviewsElem) reviewsElem.textContent = `(${business.reviewCount || 0})`;

    if (planElem) {
      planElem.textContent = business.hasActivePlan ? 'Active' : 'Free';
      planElem.className = business.hasActivePlan 
        ? 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700'
        : 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600';
    }

    this.renderLocationsList();

    if (window.InboxPage && typeof window.InboxPage.onBusinessChange === 'function') {
      window.InboxPage.onBusinessChange(business);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => Navigation.init());

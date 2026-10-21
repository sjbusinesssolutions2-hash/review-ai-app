// js/navigation.js
const Navigation = {
  businesses: [],
  activeBusinessId: null,

  init() {
    this.bindEvents();
    this.loadBusinesses();
  },

  bindEvents() {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const businessDropdownBtn = document.getElementById('business-dropdown-btn');
    const userMenuBtn = document.getElementById('user-menu-btn');
    const locationsMenu = document.getElementById('locations-menu');
    const userMenuPopup = document.getElementById('user-menu-popup');

    // Sidebar Toggles
    if (hamburgerBtn) hamburgerBtn.addEventListener('click', () => this.toggleSidebar());
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', () => this.toggleSidebar());

    // Dropdown Toggles
    if (businessDropdownBtn && locationsMenu) {
      businessDropdownBtn.addEventListener('click', () => locationsMenu.classList.toggle('hidden'));
    }
    if (userMenuBtn && userMenuPopup) {
      userMenuBtn.addEventListener('click', () => userMenuPopup.classList.toggle('hidden'));
    }

    // Close Dropdowns on Outside Click
    document.addEventListener('click', (e) => {
      if (businessDropdownBtn && locationsMenu && !businessDropdownBtn.contains(e.target) && !locationsMenu.contains(e.target)) {
        locationsMenu.classList.add('hidden');
      }
      if (userMenuBtn && userMenuPopup && !userMenuBtn.contains(e.target) && !userMenuPopup.contains(e.target)) {
        userMenuPopup.classList.add('hidden');
      }
    });
  },

  toggleSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar || !overlay) return;

    const isOpen = sidebar.classList.contains('sidebar-open');
    if (isOpen) {
      sidebar.classList.remove('sidebar-open');
      sidebar.classList.add('sidebar-closed');
      overlay.classList.remove('overlay-visible');
      overlay.classList.add('overlay-hidden');
    } else {
      sidebar.classList.remove('sidebar-closed');
      sidebar.classList.add('sidebar-open');
      overlay.classList.remove('overlay-hidden');
      overlay.classList.add('overlay-visible');
    }
  },

  async loadBusinesses() {
    const userId = Auth.getUserId();

    try {
      if (userId) {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/businesses?userId=${userId}`);
        if (response.ok) {
          this.businesses = await response.json();
        }
      }
    } catch (err) {
      console.warn('Backend business fetch pending, using stored or fallback locations.');
    }

    // Default Fallback Locations if none returned from API yet
    if (!this.businesses || this.businesses.length === 0) {
      this.businesses = [
        {
          id: 'loc_1',
          name: 'India Bat Service',
          rating: '5.0',
          reviewCount: 29,
          hasActivePlan: true,
          address: '36-Sargam society, near...'
        },
        {
          id: 'loc_2',
          name: 'SJ Business Solutions',
          rating: '0.0',
          reviewCount: 0,
          hasActivePlan: false,
          address: 'Main Office'
        }
      ];
    }

    // Restore selected business from localStorage or default to first
    const savedBusinessId = localStorage.getItem(CONFIG.STORAGE_KEYS.ACTIVE_BUSINESS_ID);
    const initialBusiness = this.businesses.find(b => b.id === savedBusinessId) || this.businesses[0];
    
    this.renderLocationsList();
    this.selectBusiness(initialBusiness.id);
  },

  renderLocationsList() {
    const locationsList = document.getElementById('locations-list');
    if (!locationsList) return;

    locationsList.innerHTML = this.businesses.map(loc => `
      <button onclick="Navigation.selectBusiness('${loc.id}')" class="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between transition">
        <div>
          <p class="text-xs font-bold text-slate-800">${loc.name}</p>
          <p class="text-[10px] text-slate-400">★ ${loc.rating} (${loc.reviewCount}) ${loc.hasActivePlan ? '• Active Plan' : '• Free'}</p>
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

    // Update Header/Sidebar Business Info Elements
    const nameElem = document.getElementById('selected-business-name');
    const ratingElem = document.getElementById('selected-business-rating');
    const reviewsElem = document.getElementById('selected-business-reviews');
    const planElem = document.getElementById('selected-business-plan');

    if (nameElem) nameElem.textContent = business.name;
    if (ratingElem) ratingElem.textContent = `★ ${business.rating}`;
    if (reviewsElem) reviewsElem.textContent = `(${business.reviewCount})`;
    
    if (planElem) {
      planElem.textContent = business.hasActivePlan ? 'Pro Plan' : 'Free';
      planElem.className = business.hasActivePlan 
        ? 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700'
        : 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600';
    }

    const locationsMenu = document.getElementById('locations-menu');
    if (locationsMenu) locationsMenu.classList.add('hidden');

    this.renderLocationsList();

    // Trigger page-specific data reload if current page listens for business changes
    if (window.InboxPage && typeof window.InboxPage.onBusinessChange === 'function') {
      window.InboxPage.onBusinessChange(business);
    }
  }
};

// Initialize Navigation on DOM Ready
document.addEventListener('DOMContentLoaded', () => Navigation.init());

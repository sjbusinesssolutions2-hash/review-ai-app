// js/components.js

async function loadComponent(targetId, filePath) {
  const container = document.getElementById(targetId);
  if (!container) return;
  try {
    const res = await fetch(`${filePath}?t=${Date.now()}`);
    if (res.ok) {
      container.innerHTML = await res.text();
    }
  } catch (err) {
    console.error(`Error loading ${filePath}:`, err);
  }
}

function initHeaderEvents() {
  const hBtn = document.getElementById('hamburger-btn');
  const sBar = document.getElementById('app-sidebar');
  const sOverlay = document.getElementById('sidebar-overlay');

  function toggleS() {
    if (!sBar || !sOverlay) return;
    const isOpen = sBar.classList.contains('sidebar-open');
    if (isOpen) {
      sBar.classList.remove('sidebar-open');
      sBar.classList.add('sidebar-closed');
      sOverlay.classList.remove('overlay-visible');
      sOverlay.classList.add('overlay-hidden');
    } else {
      sBar.classList.remove('sidebar-closed');
      sBar.classList.add('sidebar-open');
      sOverlay.classList.remove('overlay-hidden');
      sOverlay.classList.add('overlay-visible');
    }
  }

  if (hBtn) hBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleS(); });
  if (sOverlay) sOverlay.addEventListener('click', toggleS);

  const uBtn = document.getElementById('user-menu-btn');
  const uPop = document.getElementById('user-menu-popup');
  if (uBtn && uPop) {
    uBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      uPop.classList.toggle('hidden');
    });
  }

  const bBtn = document.getElementById('business-dropdown-btn');
  const bPop = document.getElementById('locations-menu');
  if (bBtn && bPop) {
    bBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      bPop.classList.toggle('hidden');
    });
  }

  document.addEventListener('click', () => {
    if (uPop) uPop.classList.add('hidden');
    if (bPop) bPop.classList.add('hidden');
  });

  const lBtn = document.getElementById('logout-btn');
  if (lBtn) {
    lBtn.addEventListener('click', () => {
      localStorage.clear();
      window.location.href = 'login.html';
    });
  }
}

function initProModalAndActiveLinks() {
  const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'inbox';

  // Highlight Active Nav Item properly without breaking pro-link restrictions
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('data-nav') === currentPage) {
      item.classList.add('bg-blue-50', 'text-blue-600', 'font-bold');
      item.classList.remove('text-slate-600', 'hover:bg-slate-50', 'hover:text-slate-900');
    }
  });

  // Pro Interceptor
  const proModal = document.getElementById('pro-lock-modal');
  const closeProModalBtn = document.getElementById('close-pro-modal');

  document.querySelectorAll('.pro-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const storedPlan = (localStorage.getItem(CONFIG.STORAGE_KEYS.BUSINESS_PLAN) || 'free').toLowerCase();
      const isPaidUser = storedPlan === 'pro' || storedPlan === 'active';

      if (!isPaidUser) {
        e.preventDefault();
        if (proModal) proModal.classList.remove('hidden');
      }
    });
  });

  if (closeProModalBtn && proModal) {
    closeProModalBtn.addEventListener('click', () => {
      proModal.classList.add('hidden');
    });
  }
}

// Dynamically populate business profile context and locations dropdown from MongoDB user record
function initBusinessContext() {
  try {
    const rawUser = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA);
    if (!rawUser) return;

    const user = JSON.parse(rawUser);
    const locations = user.locations || [];

    const nameElem = document.getElementById('selected-business-name');
    const ratingElem = document.getElementById('selected-business-rating');
    const reviewsElem = document.getElementById('selected-business-reviews');
    const planElem = document.getElementById('selected-business-plan');
    const listElem = document.getElementById('locations-list');

    if (!locations.length) {
      if (nameElem) nameElem.textContent = 'No Locations Connected';
      return;
    }

    // Get active business ID from storage or default to the first location
    let activeBizId = localStorage.getItem(CONFIG.STORAGE_KEYS.ACTIVE_BUSINESS_ID);
    let activeBiz = locations.find(l => (l.locationId || l._id) === activeBizId) || locations[0];

    const currentBizId = activeBiz.locationId || activeBiz._id;
    localStorage.setItem(CONFIG.STORAGE_KEYS.ACTIVE_BUSINESS_ID, currentBizId);
    localStorage.setItem(CONFIG.STORAGE_KEYS.BUSINESS_NAME, activeBiz.locationName || activeBiz.name || 'My Business');
    localStorage.setItem(CONFIG.STORAGE_KEYS.BUSINESS_PLAN, activeBiz.subscriptionStatus || user.subscriptionStatus || 'free');

    // Update UI Header Card
    if (nameElem) nameElem.textContent = activeBiz.locationName || activeBiz.name || 'My Business';
    if (ratingElem) ratingElem.textContent = activeBiz.rating ? `★ ${activeBiz.rating}` : '★ --';
    if (reviewsElem) reviewsElem.textContent = activeBiz.reviewCount ? `(${activeBiz.reviewCount} reviews)` : '';
    
    const plan = (activeBiz.subscriptionStatus || user.subscriptionStatus || 'free').toUpperCase();
    if (planElem) {
      planElem.textContent = plan;
      if (plan === 'PRO' || plan === 'ACTIVE') {
        planElem.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700';
      } else {
        planElem.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500';
      }
    }

    // Render Locations Dropdown List
    if (listElem) {
      listElem.innerHTML = locations.map(loc => {
        const locId = loc.locationId || loc._id;
        const locName = loc.locationName || loc.name || 'Business Location';
        const isSelected = locId === currentBizId;
        return `
          <button type="button" data-business-id="${locId}" data-business-name="${locName}" data-business-plan="${loc.subscriptionStatus || 'free'}" class="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${isSelected ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'}">
            <span class="truncate">${locName}</span>
            ${isSelected ? '<i class="fa-solid fa-check text-blue-600"></i>' : ''}
          </button>
        `;
      }).join('');

      // Add click listeners to switch active business
      listElem.querySelectorAll('button[data-business-id]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const bId = btn.getAttribute('data-business-id');
          const bName = btn.getAttribute('data-business-name');
          const bPlan = btn.getAttribute('data-business-plan');

          localStorage.setItem(CONFIG.STORAGE_KEYS.ACTIVE_BUSINESS_ID, bId);
          localStorage.setItem(CONFIG.STORAGE_KEYS.BUSINESS_NAME, bName);
          localStorage.setItem(CONFIG.STORAGE_KEYS.BUSINESS_PLAN, bPlan);

          // Close dropdown and dispatch event
          const bPop = document.getElementById('locations-menu');
          if (bPop) bPop.classList.add('hidden');

          window.dispatchEvent(new CustomEvent('sjbs_business_changed', { detail: { businessId: bId } }));
          window.location.reload();
        });
      });
    }
  } catch (err) {
    console.warn('Could not initialize business context:', err);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadComponent('header-container', 'components/header.html');
  await loadComponent('sidebar-container', 'components/sidebar.html');
  
  // Render user profile initials now that header markup is injected
  if (typeof Auth !== 'undefined' && Auth.renderUserProfile) {
    Auth.renderUserProfile();
  }
  
  initHeaderEvents();
  initProModalAndActiveLinks();
  initBusinessContext();

  // Notify system that HTML components are ready in the DOM
  window.dispatchEvent(new Event('componentsLoaded'));
});

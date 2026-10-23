// js/components.js

async function loadComponent(targetId, filePath) {
  const container = document.getElementById(targetId);
  if (!container) return;
  try {
    const res = await fetch(filePath);
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

  // Highlight Active Nav Item
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('data-nav') === currentPage) {
      item.className = 'flex items-center justify-between px-3 py-2.5 rounded-xl bg-blue-50 text-blue-600 font-bold text-sm';
    }
  });

  // Pro Interceptor
  const proModal = document.getElementById('pro-lock-modal');
  const closeProModalBtn = document.getElementById('close-pro-modal');

  document.querySelectorAll('.pro-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const storedPlan = (localStorage.getItem('sjbs_selected_plan') || 'free').toLowerCase();
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

document.addEventListener('DOMContentLoaded', async () => {
  await loadComponent('header-container', 'components/header.html');
  await loadComponent('sidebar-container', 'components/sidebar.html');
  
  // Render user profile initials now that header markup is injected
  if (typeof Auth !== 'undefined' && Auth.renderUserProfile) {
    Auth.renderUserProfile();
  }
  
  initHeaderEvents();
  initProModalAndActiveLinks();
});

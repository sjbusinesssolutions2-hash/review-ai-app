// js/page-auto-posts.js
document.addEventListener('DOMContentLoaded', () => {
  let BUSINESS_ID = '';
  let BUSINESS_NAME = '';

  // Function to capture active business details securely from standardized storage
  function refreshBusinessContext() {
    BUSINESS_ID = localStorage.getItem(CONFIG.STORAGE_KEYS.ACTIVE_BUSINESS_ID);
    BUSINESS_NAME = localStorage.getItem(CONFIG.STORAGE_KEYS.BUSINESS_NAME) || 'My Business';
  }

  // DOM Elements
  const autoPostToggle = document.getElementById('autoPostToggle');
  const frequencyInput = document.getElementById('frequency');
  const preferredTimeInput = document.getElementById('preferredTime');
  const topicsInput = document.getElementById('topics');
  const enableFestivalsToggle = document.getElementById('enableFestivals');
  const enableReviewSpotlightsToggle = document.getElementById('enableReviewSpotlights');
  
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const generatePreviewBtn = document.getElementById('generatePreviewBtn');
  
  const previewText = document.getElementById('previewPostText');
  const previewWrapper = document.getElementById('previewImageWrapper');
  const previewImg = document.getElementById('previewBanner');
  const historyTableBody = document.getElementById('historyTableBody');

  // Load saved config on initialization
  async function loadSettings() {
    refreshBusinessContext();
    if (!BUSINESS_ID) return;

    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/auto-posts/config/${encodeURIComponent(BUSINESS_ID)}`);
      const data = await res.json();
      if (data.success && data.config) {
        autoPostToggle.checked = data.config.enabled || false;
        frequencyInput.value = data.config.frequency || 'daily';
        preferredTimeInput.value = data.config.preferredTime || '10:00';
        topicsInput.value = (data.config.topics || []).join(', ');
        enableFestivalsToggle.checked = data.config.enableFestivals !== false;
        enableReviewSpotlightsToggle.checked = data.config.enableReviewSpotlights !== false;
      }
    } catch (err) {
      console.warn('Could not load settings:', err);
    }
    loadHistory();
  }

  // Save config
  async function saveSettings() {
    refreshBusinessContext();
    if (!BUSINESS_ID) {
      alert('Please select a valid business location first.');
      return;
    }

    const payload = {
      enabled: autoPostToggle.checked,
      frequency: frequencyInput.value,
      preferredTime: preferredTimeInput.value,
      topics: topicsInput.value.split(',').map(t => t.trim()).filter(Boolean),
      enableFestivals: enableFestivalsToggle.checked,
      enableReviewSpotlights: enableReviewSpotlightsToggle.checked
    };

    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/auto-posts/config/${encodeURIComponent(BUSINESS_ID)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) alert('Settings saved successfully!');
    } catch (err) {
      alert('Failed to save settings: ' + err.message);
    }
  }

  // Generate real-time preview dynamically with authentic Google Business reviews
  async function generatePreview() {
    refreshBusinessContext();
    previewText.innerText = "Syncing real reviews & generating custom AI vector banner...";
    previewWrapper.classList.add('hidden');

    const userId = Auth.getUserId();

    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/auto-posts/test-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          businessId: BUSINESS_ID,
          locationName: BUSINESS_NAME,
          category: localStorage.getItem('sjbs_business_category') || 'Local Enterprise',
          topics: topicsInput.value,
          enableFestivals: enableFestivalsToggle.checked,
          enableReviewSpotlights: enableReviewSpotlightsToggle.checked
        })
      });

      const data = await res.json();
      if (data.success) {
        previewText.innerText = data.postText;
        previewImg.src = data.imageUrl;
        previewWrapper.classList.remove('hidden');
      } else {
        previewText.innerText = "Error: " + (data.error || 'Failed to generate preview');
      }
    } catch (err) {
      previewText.innerText = "Generation failed: " + err.message;
    }
  }

  // Load post history
  async function loadHistory() {
    refreshBusinessContext();
    if (!BUSINESS_ID) return;

    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/auto-posts/history/${encodeURIComponent(BUSINESS_ID)}`);
      const data = await res.json();
      if (data.success && data.posts && data.posts.length > 0) {
        historyTableBody.innerHTML = data.posts.map(post => `
          <tr class="border-b border-slate-100">
            <td class="py-2.5 px-2 font-medium text-slate-800">${new Date(post.createdAt || post.scheduledFor).toLocaleString()}</td>
            <td class="py-2.5 px-2 text-slate-600">${post.postText.substring(0, 70)}...</td>
            <td class="py-2.5 px-2">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${post.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
                ${post.status || 'PUBLISHED'}
              </span>
            </td>
          </tr>
        `).join('');
      } else {
        historyTableBody.innerHTML = `<tr><td colspan="3" class="py-4 text-center text-slate-400">No scheduled posts yet.</td></tr>`;
      }
    } catch (err) {
      historyTableBody.innerHTML = `<tr><td colspan="3" class="py-4 text-center text-red-400">Failed to load post history.</td></tr>`;
    }
  }

  // Event Listeners with visual click loading state
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', async () => {
      const originalText = saveSettingsBtn.innerHTML;
      saveSettingsBtn.disabled = true;
      saveSettingsBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-xs"></i> <span>Saving...</span>`;
      
      await saveSettings();
      
      saveSettingsBtn.disabled = false;
      saveSettingsBtn.innerHTML = originalText;
    });
  }

  if (generatePreviewBtn) {
    generatePreviewBtn.addEventListener('click', generatePreview);
  }

  // Listen for real-time header business selector switches
  window.addEventListener('sjbs_business_changed', () => {
    loadSettings();
  });

  // Small delay on initialization to ensure components.js populates localStorage first
  setTimeout(() => {
    loadSettings();
  }, 100);
});

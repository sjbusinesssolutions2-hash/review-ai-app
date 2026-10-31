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
    
    if (!BUSINESS_ID) {
      setTimeout(loadSettings, 300);
      return;
    }

    // 1. Instant local display check from cache
    const cachedConfig = localStorage.getItem(`sjbs_autopost_config_${BUSINESS_ID}`);
    if (cachedConfig) {
      try {
        const parsed = JSON.parse(cachedConfig);
        autoPostToggle.checked = parsed.enabled || false;
        
        const cachedFreq = (parsed.frequency || 'daily').toLowerCase();
        if (window.setFrequencyUI) window.setFrequencyUI(cachedFreq);

        preferredTimeInput.value = parsed.preferredTime || '10:00';
        topicsInput.value = Array.isArray(parsed.topics) ? parsed.topics.join(', ') : (parsed.topics || '');
        enableFestivalsToggle.checked = parsed.enableFestivals !== false;
        enableReviewSpotlightsToggle.checked = parsed.enableReviewSpotlights !== false;
      } catch (e) { console.warn('Cache parse error:', e); }
    }

    // 2. Fetch fresh config from backend DB (passing userId query param)
    try {
      const userId = Auth.getUserId();
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/auto-posts/config/${encodeURIComponent(BUSINESS_ID)}?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (data.success && data.config) {
        autoPostToggle.checked = data.config.enabled || false;
        
        // Sync visual pills & hidden input with server state
        const targetFrequency = (data.config.frequency || 'daily').toLowerCase();
        if (window.setFrequencyUI) {
          window.setFrequencyUI(targetFrequency);
        } else {
          frequencyInput.value = targetFrequency;
        }

        preferredTimeInput.value = data.config.preferredTime || '10:00';
        topicsInput.value = Array.isArray(data.config.topics) ? data.config.topics.join(', ') : (data.config.topics || '');
        enableFestivalsToggle.checked = data.config.enableFestivals !== false;
        enableReviewSpotlightsToggle.checked = data.config.enableReviewSpotlights !== false;

        // Sync local cache
        const updatedCache = {
          ...data.config,
          frequency: targetFrequency
        };
        localStorage.setItem(`sjbs_autopost_config_${BUSINESS_ID}`, JSON.stringify(updatedCache));

        if (autoPostToggle.checked && preferredTimeInput.value) {
          armTimer(preferredTimeInput.value);
        }
      }
    } catch (err) {
      console.warn('Could not load settings from server:', err);
    }
    loadHistory();
  }

  // Trigger automated generation & publish action
  async function triggerAutomatedPublish() {
    refreshBusinessContext();
    if (!BUSINESS_ID) return;

    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/auto-posts/test-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: Auth.getUserId(),
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
        console.log('[Auto-Post] Preview triggered!');
        loadHistory();
      }
    } catch (err) {
      console.error('[Auto-Post] Error in automated publish:', err);
    }
  }

  // Arm client-side timer
  function armTimer(timeString) {
    if (!timeString) return;
    const [targetHours, targetMinutes] = timeString.split(':').map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(targetHours, targetMinutes, 0, 0);

    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }

    const delayMs = target - now;
    console.log(`[Auto-Post Scheduler] Next post scheduled in ${Math.round(delayMs / 1000 / 60)} minutes.`);

    if (window._autoPostTimer) clearTimeout(window._autoPostTimer);
    window._autoPostTimer = setTimeout(() => {
      triggerAutomatedPublish();
    }, delayMs);
  }

  // Save config & cache settings locally
  async function saveSettings() {
    refreshBusinessContext();
    if (!BUSINESS_ID) {
      alert('Please select a valid business location first.');
      return;
    }

    const selectedFrequency = (frequencyInput.value || 'daily').toLowerCase();

    const payload = {
      userId: Auth.getUserId(),
      enabled: autoPostToggle.checked,
      frequency: selectedFrequency,
      preferredTime: preferredTimeInput.value,
      topics: topicsInput.value,
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
      
      if (!res.ok || !data.success) {
        alert('Access Denied: ' + (data.error || 'Pro subscription required.'));
        return;
      }
      
      if (data.success) {
        localStorage.setItem(`sjbs_autopost_config_${BUSINESS_ID}`, JSON.stringify(payload));
        alert('Settings saved successfully!');

        if (autoPostToggle.checked) {
          armTimer(preferredTimeInput.value);
        } else if (window._autoPostTimer) {
          clearTimeout(window._autoPostTimer);
        }
      }
    } catch (err) {
      alert('Failed to save settings: ' + err.message);
    }
  }

  // Generate real-time preview dynamically with authentic Google Business reviews & Gemini SVG
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

  // Load post history and populate table with status tags
  async function loadHistory() {
    refreshBusinessContext();
    if (!BUSINESS_ID) return;

    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/auto-posts/history/${encodeURIComponent(BUSINESS_ID)}`);
      const data = await res.json();
      if (data.success && data.posts && data.posts.length > 0) {
        historyTableBody.innerHTML = data.posts.slice().reverse().map(post => {
          const postDate = new Date(post.publishedAt || post.createdAt || Date.now()).toLocaleString();
          const isLive = post.status === 'LIVE' || post.status === 'PUBLISHED';
          const badgeClass = isLive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700';

          return `
            <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <td class="py-3 px-2 font-medium text-slate-800 text-xs">${postDate}</td>
              <td class="py-3 px-2 text-slate-600 text-xs">
                ${(post.postText || '').substring(0, 80)}${(post.postText || '').length > 80 ? '...' : ''}
              </td>
              <td class="py-3 px-2">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}">
                  ${post.status || 'LIVE'}
                </span>
              </td>
            </tr>
          `;
        }).join('');
      } else {
        historyTableBody.innerHTML = `<tr><td colspan="3" class="py-6 text-center text-slate-400">No published posts yet. Saved auto-posts will appear here automatically.</td></tr>`;
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

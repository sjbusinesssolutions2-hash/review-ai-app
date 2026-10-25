document.addEventListener('DOMContentLoaded', () => {
  // Grab business ID and name dynamically from localStorage or URL
  const urlParams = new URLSearchParams(window.location.search);
  const BUSINESS_ID = urlParams.get('businessId') || localStorage.getItem('sjbs_selected_business_id') || 'default';
  const BUSINESS_NAME = localStorage.getItem('sjbs_business_name') || 'Our Business';

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
    try {
      const res = await fetch(`/api/auto-posts/config/${encodeURIComponent(BUSINESS_ID)}`);
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
    const payload = {
      enabled: autoPostToggle.checked,
      frequency: frequencyInput.value,
      preferredTime: preferredTimeInput.value,
      topics: topicsInput.value.split(',').map(t => t.trim()).filter(Boolean),
      enableFestivals: enableFestivalsToggle.checked,
      enableReviewSpotlights: enableReviewSpotlightsToggle.checked
    };

    try {
      const res = await fetch(`/api/auto-posts/config/${encodeURIComponent(BUSINESS_ID)}`, {
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

  // Generate real-time preview
  async function generatePreview() {
    previewText.innerText = "Generating AI copy and vector banner graphic...";
    previewWrapper.classList.add('hidden');

    try {
      const res = await fetch('/api/auto-posts/test-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationName: BUSINESS_NAME,
          category: "Local Business",
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
    try {
      const res = await fetch(`/api/auto-posts/history/${encodeURIComponent(BUSINESS_ID)}`);
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

  // Event Listeners
  if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', saveSettings);
  if (generatePreviewBtn) generatePreviewBtn.addEventListener('click', generatePreview);

  // Initialize
  loadSettings();
});

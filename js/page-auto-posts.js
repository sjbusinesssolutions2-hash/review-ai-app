document.addEventListener('DOMContentLoaded', async () => {
  // Check auth and setup UI shell
  if (typeof checkAuth === 'function') await checkAuth();
  if (typeof renderHeader === 'function') renderHeader();
  if (typeof renderSidebar === 'function') renderSidebar();

  loadAutoPostsPage();
});

let autoPostConfig = {
  frequency: 'thrice_weekly', // daily, thrice_weekly, weekly
  topics: '',
  enableFestivals: true,
  enableReviewSpotlights: true,
  imagePool: []
};

async function loadAutoPostsPage() {
  const container = document.getElementById('auto-posts-container');
  if (!container) return;

  // Show loading state
  container.innerHTML = `
    <div class="flex items-center justify-center py-12 text-slate-400">
      <i class="fa-solid fa-circle-notch fa-spin text-2xl mr-3"></i>
      <span class="text-sm">Loading post automation settings...</span>
    </div>
  `;

  try {
    const selectedLocation = localStorage.getItem('selectedLocationId') || '';
    
    // Fetch saved settings from backend if endpoint exists
    if (window.BACKEND_URL && selectedLocation) {
      const res = await fetch(`${BACKEND_URL}/api/auto-posts/config?locationId=${selectedLocation}`);
      if (res.ok) {
        const data = await res.json();
        if (data.config) autoPostConfig = { ...autoPostConfig, ...data.config };
      }
    }
  } catch (err) {
    console.warn('Could not load saved auto-post settings, using defaults:', err);
  }

  renderAutoPostsUI();
}

function renderAutoPostsUI() {
  const container = document.getElementById('auto-posts-container');
  if (!container) return;

  container.innerHTML = `
    <!-- Status Banner -->
    <div class="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
        </div>
        <div>
          <h2 class="text-sm font-bold text-slate-900">Autopilot Content Engine</h2>
          <p class="text-xs text-slate-500">AI automatically drafts and publishes posts based on your schedule.</p>
        </div>
      </div>
      <span class="text-[11px] bg-amber-100 text-amber-800 border border-amber-300 font-bold px-2.5 py-1 rounded-full flex items-center">
        <i class="fa-solid fa-crown text-amber-600 mr-1.5"></i> PRO
      </span>
    </div>

    <!-- Section 1: Frequency Selector -->
    <div class="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
      <div class="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center">
          <i class="fa-regular fa-clock text-blue-500 mr-2"></i> Posting Frequency
        </h3>
        <span class="text-[11px] text-slate-400">Maximum: Weekly</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label class="relative flex flex-col p-3.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-blue-500 transition has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50/40">
          <input type="radio" name="postFrequency" value="daily" class="sr-only" ${autoPostConfig.frequency === 'daily' ? 'checked' : ''} onchange="updateFrequency('daily')">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-bold text-slate-900">Daily</span>
            <i class="fa-solid fa-calendar-day text-blue-500 text-xs"></i>
          </div>
          <span class="text-[11px] text-slate-500">7 posts / week</span>
        </label>

        <label class="relative flex flex-col p-3.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-blue-500 transition has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50/40">
          <input type="radio" name="postFrequency" value="thrice_weekly" class="sr-only" ${autoPostConfig.frequency === 'thrice_weekly' ? 'checked' : ''} onchange="updateFrequency('thrice_weekly')">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-bold text-slate-900">3x per Week</span>
            <i class="fa-solid fa-calendar-week text-blue-500 text-xs"></i>
          </div>
          <span class="text-[11px] text-slate-500">Mon, Wed, Fri</span>
        </label>

        <label class="relative flex flex-col p-3.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-blue-500 transition has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50/40">
          <input type="radio" name="postFrequency" value="weekly" class="sr-only" ${autoPostConfig.frequency === 'weekly' ? 'checked' : ''} onchange="updateFrequency('weekly')">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-bold text-slate-900">Weekly</span>
            <i class="fa-solid fa-calendar text-blue-500 text-xs"></i>
          </div>
          <span class="text-[11px] text-slate-500">1 post / Monday</span>
        </label>
      </div>
    </div>

    <!-- Section 2: Topics & Content Rules -->
    <div class="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
      <div class="border-b border-slate-100 pb-3">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center">
          <i class="fa-solid fa-lightbulb text-amber-500 mr-2"></i> Content & Topics Rotation
        </h3>
        <p class="text-xs text-slate-500 mt-1">Add keywords or services you want AI to cycle through in posts.</p>
      </div>

      <div class="space-y-3">
        <div>
          <label class="text-xs font-semibold text-slate-700 mb-1.5 block">Target Topics / Keywords</label>
          <textarea id="topicsTextarea" rows="3" placeholder="e.g. Weekend Specials, Dental Checkups, Special Offers, New Services..." 
                    class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition">${autoPostConfig.topics || ''}</textarea>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <label class="flex items-center space-x-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
            <input type="checkbox" id="festivalCheck" ${autoPostConfig.enableFestivals ? 'checked' : ''} class="rounded text-blue-600 focus:ring-0">
            <div>
              <p class="text-xs font-bold text-slate-900">Festival & Holiday Posts</p>
              <p class="text-[10px] text-slate-500">Greetings on local/regional calendar events.</p>
            </div>
          </label>

          <label class="flex items-center space-x-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
            <input type="checkbox" id="reviewSpotlightCheck" ${autoPostConfig.enableReviewSpotlights ? 'checked' : ''} class="rounded text-blue-600 focus:ring-0">
            <div>
              <p class="text-xs font-bold text-slate-900">5-Star Review Spotlights</p>
              <p class="text-[10px] text-slate-500">Converts top reviews into customer highlights.</p>
            </div>
          </label>
        </div>
      </div>
    </div>

    <!-- Section 3: Photo Media Pool -->
    <div class="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
      <div class="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center">
          <i class="fa-solid fa-image text-emerald-500 mr-2"></i> Business Photo Pool
        </h3>
        <span class="text-[11px] text-slate-400">Optional</span>
      </div>

      <p class="text-xs text-slate-500">Add URLs of your business photos (storefront, dishes, staff) for AI to attach with posts.</p>

      <div class="flex gap-2">
        <input type="url" id="imagePoolInput" placeholder="Paste image URL (https://...)" class="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500">
        <button onclick="addPhotoToPool()" class="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-medium transition">Add</button>
      </div>

      <div id="photoPoolGallery" class="grid grid-cols-3 sm:grid-cols-4 gap-3 pt-2">
        ${renderPhotoPoolItems()}
      </div>
    </div>

    <!-- Save Controls Button -->
    <div class="pt-2">
      <button onclick="saveAutoPostSettings()" class="w-full btn-blue py-3.5 rounded-xl font-bold text-sm shadow-md shadow-blue-500/20 flex items-center justify-center">
        <i class="fa-solid fa-floppy-disk mr-2"></i> Save Automation Settings
      </button>
    </div>
  `;
}

function updateFrequency(val) {
  autoPostConfig.frequency = val;
}

function addPhotoToPool() {
  const input = document.getElementById('imagePoolInput');
  const url = input ? input.value.trim() : '';
  if (!url) return;

  autoPostConfig.imagePool.push(url);
  input.value = '';
  document.getElementById('photoPoolGallery').innerHTML = renderPhotoPoolItems();
}

function removePhotoFromPool(idx) {
  autoPostConfig.imagePool.splice(idx, 1);
  document.getElementById('photoPoolGallery').innerHTML = renderPhotoPoolItems();
}

function renderPhotoPoolItems() {
  if (!autoPostConfig.imagePool || autoPostConfig.imagePool.length === 0) {
    return `<p class="text-xs text-slate-400 italic col-span-full">No custom photos added. Unsplash fallback photos will be used.</p>`;
  }

  return autoPostConfig.imagePool.map((url, idx) => `
    <div class="relative group rounded-xl overflow-hidden border border-slate-200 aspect-[4/3] bg-slate-100">
      <img src="${url}" class="w-full h-full object-cover">
      <button onclick="removePhotoFromPool(${idx})" class="absolute top-1 right-1 bg-red-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center opacity-90 hover:opacity-100 transition">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  `).join('');
}

async function saveAutoPostSettings() {
  const topics = document.getElementById('topicsTextarea')?.value || '';
  const enableFestivals = document.getElementById('festivalCheck')?.checked || false;
  const enableReviewSpotlights = document.getElementById('reviewSpotlightCheck')?.checked || false;
  const selectedLocation = localStorage.getItem('selectedLocationId') || '';

  autoPostConfig.topics = topics;
  autoPostConfig.enableFestivals = enableFestivals;
  autoPostConfig.enableReviewSpotlights = enableReviewSpotlights;

  const payload = {
    locationId: selectedLocation,
    config: autoPostConfig
  };

  try {
    if (window.BACKEND_URL) {
      const res = await fetch(`${BACKEND_URL}/api/auto-posts/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        alert('Auto-Post settings updated successfully!');
        return;
      }
    }
  } catch (err) {
    console.error('Error saving settings:', err);
  }

  alert('Settings saved locally!');
}

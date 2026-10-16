// ==========================================
// CONFIGURATION & GLOBAL STATE
// ==========================================
const BACKEND_URL = "https://review-ai-backend-03sb.onrender.com"; // Your Render backend URL
let currentUser = null;
let userLocations = [];
let selectedLocation = null;
let loadedReviews = [];

// ==========================================
// INIT & OAUTH SESSION MANAGEMENT
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
  checkUserSession();
  
  // Page-specific initialization
  const path = window.location.pathname;
  if (path.includes("dashboard.html")) {
    await initDashboard();
  } else if (path.includes("admin.html")) {
    await initAdminConsole();
  }
});

function checkUserSession() {
  const userJson = localStorage.getItem("reviewai_user");
  if (userJson) {
    currentUser = JSON.parse(userJson);
    renderUserUI();
  } else {
    // Check if returning from Google OAuth redirect with user query params
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get("email");
    const name = urlParams.get("name");
    
    if (email) {
      currentUser = { email, name: name || email.split("@")[0] };
      localStorage.setItem("reviewai_user", JSON.stringify(currentUser));
      window.history.replaceState({}, document.title, window.location.pathname);
      renderUserUI();
    }
  }
}

function renderUserUI() {
  const loginBtn = document.getElementById("navLoginBtn");
  const userMenu = document.getElementById("userMenu");
  const userAvatar = document.getElementById("userAvatar");
  const dropdownEmail = document.getElementById("dropdownEmail");

  if (currentUser) {
    if (loginBtn) loginBtn.style.display = "none";
    if (userMenu) userMenu.style.display = "block";
    if (userAvatar) userAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
    if (dropdownEmail) dropdownEmail.textContent = currentUser.email;
  } else {
    if (loginBtn) loginBtn.style.display = "flex";
    if (userMenu) userMenu.style.display = "none";
  }
}

function loginWithGoogle() {
  window.location.href = `${BACKEND_URL}/auth/google`;
}

function logout() {
  localStorage.removeItem("reviewai_user");
  currentUser = null;
  window.location.href = "index.html";
}

function toggleProfileDropdown() {
  const dropdown = document.getElementById("profileDropdown");
  if (dropdown) {
    dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
  }
}

// Close dropdown when clicking outside
window.onclick = function(event) {
  if (!event.target.matches('.user-avatar')) {
    const dropdown = document.getElementById("profileDropdown");
    if (dropdown && dropdown.style.display === "block") {
      dropdown.style.display = "none";
    }
  }
}

// ==========================================
// CLIENT DASHBOARD & 450+ LOCATION ENGINE
// ==========================================
async function initDashboard() {
  if (!currentUser) {
    window.location.href = "index.html";
    return;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/locations?email=${encodeURIComponent(currentUser.email)}`);
    const data = await res.json();
    
    if (data.success && data.locations.length > 0) {
      userLocations = data.locations;
      renderLocationResults(userLocations.slice(0, 50)); // Render first 50 initially
      selectLocation(userLocations[0]);
    } else {
      document.getElementById("reviewsFeedContainer").innerHTML = `
        <div class="google-review-card" style="text-align:center; padding:40px;">
          No Google Business locations found for this account. Make sure you connected a verified Google Business Profile.
        </div>`;
    }
  } catch (err) {
    console.error("Failed to load locations:", err);
  }
}

function filterLocationsList() {
  const query = document.getElementById("locationSearchInput").value.toLowerCase();
  const dropdown = document.getElementById("locationDropdownResults");
  
  if (!query) {
    dropdown.style.display = "none";
    return;
  }

  const filtered = userLocations.filter(loc => 
    loc.title.toLowerCase().includes(query) || loc.name.toLowerCase().includes(query)
  );

  renderLocationResults(filtered);
  dropdown.style.display = "block";
}

function renderLocationResults(locations) {
  const dropdown = document.getElementById("locationDropdownResults");
  if (!dropdown) return;

  if (locations.length === 0) {
    dropdown.innerHTML = `<div style="padding:10px; font-size:13px; color:var(--text-secondary);">No matching locations found</div>`;
    return;
  }

  dropdown.innerHTML = locations.map(loc => `
    <div style="padding: 10px 12px; cursor: pointer; border-bottom: 1px solid var(--surface-border); font-size: 14px;" 
         onclick="onLocationSelect('${loc.name}')" 
         onmouseover="this.style.background='#f1f5f9'" 
         onmouseout="this.style.background='transparent'">
      <strong>${loc.title}</strong>
      <span style="font-size:11px; color:var(--text-secondary); display:block;">${loc.name}</span>
    </div>
  `).join("");
}

function onLocationSelect(locationName) {
  const target = userLocations.find(l => l.name === locationName);
  if (target) {
    document.getElementById("locationSearchInput").value = target.title;
    document.getElementById("locationDropdownResults").style.display = "none";
    selectLocation(target);
  }
}

async function selectLocation(location) {
  selectedLocation = location;
  
  // Update Plan Badge
  const badge = document.getElementById("locationPlanBadge");
  const plan = location.planTier || "free";
  if (plan === "active" || plan === "pro_monthly") {
    badge.textContent = "Plan: Pro Autopilot ✨";
    badge.style.background = "#dcfce7";
    badge.style.color = "#15803d";
  } else {
    badge.textContent = "Plan: Free Tier";
    badge.style.background = "#fef3c7";
    badge.style.color = "#d97706";
  }

  await fetchReviews(location.name);
}

async function fetchReviews(locationName) {
  const container = document.getElementById("reviewsFeedContainer");
  container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-secondary);">Fetching live Google reviews...</div>`;

  try {
    const res = await fetch(`${BACKEND_URL}/api/reviews?email=${encodeURIComponent(currentUser.email)}&locationName=${encodeURIComponent(locationName)}`);
    const data = await res.json();

    if (data.success) {
      loadedReviews = data.reviews || [];
      renderAnalytics(loadedReviews);
      renderReviews(loadedReviews);
    } else {
      container.innerHTML = `<div style="text-align:center; padding:40px; color:#dc2626;">Error loading reviews: ${data.error}</div>`;
    }
  } catch (err) {
    container.innerHTML = `<div style="text-align:center; padding:40px; color:#dc2626;">Failed to connect to review server.</div>`;
  }
}

function renderAnalytics(reviews) {
  const total = reviews.length;
  const replied = reviews.filter(r => r.reviewReply).length;
  
  let avgRating = 0;
  if (total > 0) {
    const starMap = { "ONE": 1, "TWO": 2, "THREE": 3, "FOUR": 4, "FIVE": 5 };
    const sum = reviews.reduce((acc, r) => acc + (starMap[r.starRating] || 5), 0);
    avgRating = (sum / total).toFixed(1);
  }

  document.getElementById("statTotalReviews").textContent = total;
  document.getElementById("statAiReplied").textContent = replied;
  document.getElementById("statAvgRating").textContent = `${avgRating} ★`;
}

function renderReviews(reviews) {
  const container = document.getElementById("reviewsFeedContainer");
  if (reviews.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-secondary);">No reviews found for this location yet.</div>`;
    return;
  }

  const starSymbols = { "ONE": "★", "TWO": "★★", "THREE": "★★★", "FOUR": "★★★★", "FIVE": "★★★★★" };

  container.innerHTML = reviews.map(r => `
    <div class="google-review-card">
      <div class="reviewer-profile">
        <div class="avatar-circle">${(r.reviewer?.displayName || "A").charAt(0)}</div>
        <div class="reviewer-info">
          <span class="reviewer-name">${r.reviewer?.displayName || "Anonymous Customer"}</span>
          <div class="review-stars-row">
            <span>${starSymbols[r.starRating] || "★★★★★"}</span>
            <span style="color:var(--text-secondary); font-size:12px; margin-left:6px;">${new Date(r.createTime).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      <p class="review-comment">${r.comment || "<i>No written comment provided.</i>"}</p>
      
      ${r.reviewReply ? `
        <div class="google-owner-reply">
          <div class="reply-header">
            <span class="material-symbols-outlined" style="font-size:16px;">verified</span> Response from Owner (AI)
          </div>
          <p class="reply-text">${r.reviewReply.comment}</p>
        </div>
      ` : `
        <div class="status-pending">
          <span class="material-symbols-outlined" style="font-size:16px;">schedule</span> Pending Autopilot Reply
        </div>
      `}
    </div>
  `).join("");
}

function switchTab(type) {
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
  event.target.classList.add("active");

  if (type === "pending") {
    const pending = loadedReviews.filter(r => !r.reviewReply);
    renderReviews(pending);
  } else {
    renderReviews(loadedReviews);
  }
}

async function triggerAutopilot() {
  if (!selectedLocation) return alert("Please select a location first.");
  
  const btn = event.currentTarget;
  btn.disabled = true;
  btn.innerHTML = `<span class="material-symbols-outlined">sync</span> Processing Gemini Replies...`;

  try {
    const res = await fetch(`${BACKEND_URL}/api/cron/autopilot`);
    const data = await res.json();
    alert("Gemini Autopilot executed successfully!");
    await fetchReviews(selectedLocation.name);
  } catch (err) {
    alert("Failed to run autopilot.");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span class="material-symbols-outlined">bolt</span> Run Gemini Autopilot Now`;
  }
}

// ==========================================
// RAZORPAY PAYMENT INTEGRATION
// ==========================================
async function openRazorpayCheckout() {
  if (!selectedLocation) return alert("Please select a location to upgrade.");

  try {
    // 1. Create order on backend
    const res = await fetch(`${BACKEND_URL}/api/payments/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: currentUser.email,
        locationName: selectedLocation.name,
        amount: 2900 // ₹2900 or $29 equivalent in paise/cents
      })
    });
    const orderData = await res.json();

    if (!orderData.success) throw new Error(orderData.error || "Order creation failed");

    // 2. Open Razorpay Popup
    const options = {
      key: orderData.keyId,
      amount: orderData.order.amount,
      currency: "INR",
      name: "ReviewAI Pro Autopilot",
      description: `Subscription for ${selectedLocation.title}`,
      order_id: orderData.order.id,
      handler: async function (response) {
        // Verify payment on backend
        const verifyRes = await fetch(`${BACKEND_URL}/api/payments/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            email: currentUser.email,
            locationName: selectedLocation.name
          })
        });
        const verifyData = await verifyRes.json();
        if (verifyData.success) {
          alert("🎉 Location upgraded to Pro Autopilot successfully!");
          location.reload();
        }
      },
      prefill: { email: currentUser.email }
    };

    const rzp = new Razorpay(options);
    rzp.open();
  } catch (err) {
    alert("Razorpay checkout error: " + err.message);
  }
}

// ==========================================
// FREE TOOLS CALCULATORS (tools.html)
// ==========================================
async function generateFreeReply() {
  const reviewText = document.getElementById("freeReviewText").value;
  const tone = document.getElementById("freeToneSelect").value;
  const output = document.getElementById("freeReplyOutput");

  if (!reviewText) return alert("Please enter a customer review.");

  output.style.display = "block";
  output.textContent = "AI is drafting your reply...";

  try {
    const res = await fetch(`${BACKEND_URL}/api/tools/generate-reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewText, tone })
    });
    const data = await res.json();
    output.textContent = data.reply || "Thank you for visiting us! We appreciate your feedback.";
  } catch (err) {
    output.textContent = "Thank you so much for your feedback! We look forward to serving you again.";
  }
}

function calculateRatingNeeded() {
  const current = parseFloat(document.getElementById("currentRating").value);
  const count = parseInt(document.getElementById("totalReviews").value);
  const target = parseFloat(document.getElementById("targetRating").value);
  const output = document.getElementById("calcOutput");

  if (!current || !count || !target) return alert("Please fill in all fields.");
  if (target <= current) return alert("Target rating must be higher than current rating.");
  if (target >= 5.0) return alert("Target rating must be less than 5.0.");

  // Formula: (Target * Count + 5 * Needed) / (Count + Needed) = Target
  const needed = Math.ceil((count * (target - current)) / (5.0 - target));

  output.style.display = "block";
  output.innerHTML = `You need <strong>${needed}</strong> consecutive 5-star reviews to reach a <strong>${target}★</strong> rating.`;
}

function generateReviewLink() {
  const placeId = document.getElementById("placeIdInput").value.trim();
  const output = document.getElementById("qrOutput");

  if (!placeId) return alert("Please enter a Google Place ID.");

  const directUrl = `https://search.google.com/local/writereview?placeid=${placeId}`;
  output.style.display = "block";
  output.innerHTML = `Direct Review Link:<br><a href="${directUrl}" target="_blank" style="color:var(--primary); text-decoration:underline;">${directUrl}</a>`;
}

// ==========================================
// ADMIN CONTROL PANEL (admin.html)
// ==========================================
async function initAdminConsole() {
  const adminKey = prompt("Enter Admin Secret Key:");
  if (!adminKey) {
    window.location.href = "index.html";
    return;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/metrics`, {
      headers: { "x-admin-key": adminKey }
    });
    const data = await res.json();

    if (data.success) {
      document.getElementById("adminTotalUsers").textContent = data.metrics.totalUsers;
      document.getElementById("adminTotalLocations").textContent = data.metrics.totalLocations;
      document.getElementById("adminActiveSubs").textContent = data.metrics.activeSubs;
      document.getElementById("adminMRR").textContent = `₹${data.metrics.mrr}`;

      renderAdminTable(data.subscriptions, adminKey);
    } else {
      alert("Unauthorized Admin Key");
      window.location.href = "index.html";
    }
  } catch (err) {
    alert("Failed to load admin metrics.");
  }
}

function renderAdminTable(subscriptions, adminKey) {
  const tbody = document.getElementById("adminTableBody");
  if (!subscriptions || subscriptions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="padding:20px; text-align:center;">No subscription records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = subscriptions.map(s => `
    <tr style="border-bottom: 1px solid var(--surface-border);">
      <td style="padding: 12px;">${s.userEmail}</td>
      <td style="padding: 12px;"><strong>${s.locationTitle || "Store"}</strong><br><small style="color:var(--text-secondary);">${s.locationName}</small></td>
      <td style="padding: 12px;">
        <span style="padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: 700; ${s.status === 'active' ? 'background:#dcfce7; color:#15803d;' : 'background:#fef3c7; color:#d97706;'}">
          ${s.status.toUpperCase()}
        </span>
      </td>
      <td style="padding: 12px; text-align: right;">
        <button class="btn btn-outline" style="padding: 4px 10px; font-size: 12px; width: auto;" onclick="toggleAdminProOverride('${s.locationName}', '${s.status}', '${adminKey}')">
          ${s.status === 'active' ? 'Revoke Pro' : 'Grant Pro'}
        </button>
      </td>
    </tr>
  `).join("");
}

async function toggleAdminProOverride(locationName, currentStatus, adminKey) {
  const newStatus = currentStatus === 'active' ? 'free' : 'active';
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/override-plan`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-admin-key": adminKey
      },
      body: JSON.stringify({ locationName, status: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      alert(`Location updated to ${newStatus}`);
      location.reload();
    }
  } catch (err) {
    alert("Failed to update plan status.");
  }
}

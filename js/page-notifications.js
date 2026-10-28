document.addEventListener('DOMContentLoaded', async () => {
  // Get userId from URL or LocalStorage
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('userId') || localStorage.getItem('userId');

  if (!userId) {
    console.error('No userId found.');
    return;
  }

  // Load existing settings
  try {
    const res = await fetch(`${CONFIG.BACKEND_URL}/api/notifications/settings?userId=${userId}`);
    if (res.ok) {
      const data = await res.json();
      if (data.supportEmail) document.getElementById('supportEmail').value = data.supportEmail;
      if (data.supportPhone) document.getElementById('supportPhone').value = data.supportPhone;
      if (data.weeklyReport?.email !== undefined) document.getElementById('weeklyEmail').checked = data.weeklyReport.email;
      if (data.criticalAlerts?.email !== undefined) document.getElementById('criticalEmail').checked = data.criticalAlerts.email;
      if (data.productUpdates?.email !== undefined) document.getElementById('updatesEmail').checked = data.productUpdates.email;
    }
  } catch (err) {
    console.error('Failed to load notification settings:', err);
  }

  // Save settings on button click
  const saveBtn = document.getElementById('saveSettingsBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const payload = {
        userId: userId, // Pass userId explicitly to match backend expectations
        supportEmail: document.getElementById('supportEmail').value,
        supportPhone: document.getElementById('supportPhone').value,
        weeklyReport: { email: document.getElementById('weeklyEmail').checked },
        criticalAlerts: { email: document.getElementById('criticalEmail').checked },
        productUpdates: { email: document.getElementById('updatesEmail').checked }
      };

      try {
        const response = await fetch(`${CONFIG.BACKEND_URL}/api/notifications/settings`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          alert('Notification settings saved successfully!');
        } else {
          alert('Failed to save settings.');
        }
      } catch (err) {
        console.error(err);
        alert('Error connecting to backend.');
      }
    });
  }
});

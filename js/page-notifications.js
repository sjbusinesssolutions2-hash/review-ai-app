document.addEventListener('DOMContentLoaded', async () => {
  // Grab userId from URL parameters or localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('userId') || localStorage.getItem('userId');

  if (!userId) {
    console.error('No userId found in URL or localStorage.');
    alert('User session not found. Please log in again.');
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

  // Save settings handler
  const saveBtn = document.getElementById('saveSettingsBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const payload = {
        userId: userId,
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

        const result = await response.json();

        const result = await response.json();

if (response.ok && result.success) {
  alert('Notification settings saved successfully!');
} else {
  alert(`Failed to save settings: ${result.error || 'Unknown error'}`);
}

      } catch (err) {
        console.error('Network error saving settings:', err);
        alert('Error connecting to backend server.');
      }
    });
  }
});

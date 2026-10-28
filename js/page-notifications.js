document.addEventListener('DOMContentLoaded', async () => {
  // Load existing settings on page load if needed
  try {
    const res = await fetch(`${CONFIG.BACKEND_URL}/api/notifications/settings`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.supportEmail) document.getElementById('supportEmail').value = data.supportEmail;
      if (data.supportPhone) document.getElementById('supportPhone').value = data.supportPhone;
      // Map other checkboxes if present in data...
    }
  } catch (err) {
    console.error('Failed to load notification settings:', err);
  }

  // Handle Save
  const saveBtn = document.getElementById('saveSettingsBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const payload = {
        supportEmail: document.getElementById('supportEmail').value,
        supportPhone: document.getElementById('supportPhone').value,
        weeklyReport: {
          sms: document.getElementById('weeklySms').checked,
          email: document.getElementById('weeklyEmail').checked
        },
        criticalAlerts: {
          sms: document.getElementById('criticalSms').checked,
          email: document.getElementById('criticalEmail').checked
        },
        productUpdates: {
          sms: document.getElementById('updatesSms').checked,
          email: document.getElementById('updatesEmail').checked
        }
      };

      try {
        const response = await fetch(`${CONFIG.BACKEND_URL}/api/notifications/settings`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
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

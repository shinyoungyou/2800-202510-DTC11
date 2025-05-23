const mapping = {
  notifications:     'notificationsToggle',
  vibration:         'vibrationToggle',
  scanNotifications: 'scanNotificationsToggle',
  camera:            'cameraToggle',
  location:          'locationToggle'
};
const scanHistoryRow = document.getElementById('scanHistoryRow');
const scanHistoryVal = document.getElementById('scanHistoryValue');

(async function loadPrefs() {
  const res = await fetch('/api/auth/user-preferences', { credentials: 'include' });
  const prefs = await res.json();
  Object.entries(mapping).forEach(([key, id]) => {
    const cb = document.getElementById(id);
    cb.checked = !!prefs[key];
    cb.addEventListener('change', () => updatePref(key, cb.checked));
  });
  scanHistoryVal.textContent = prefs.scanHistory || '30 Days';
})();

scanHistoryRow.addEventListener('click', async () => {
  const next = prompt('Enter scan history timeframe:', scanHistoryVal.textContent);
  if (!next) return;
  scanHistoryVal.textContent = next;
  await updatePref('scanHistory', next);
});

async function updatePref(key, value) {
  await fetch('/api/auth/user-preferences', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value })
  });
}

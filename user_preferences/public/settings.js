const mapping = {
  notifications:      'notificationsToggle',
  vibration:          'vibrationToggle',
  scanNotifications:  'scanNotificationsToggle',
  camera:             'cameraToggle',
  location:           'locationToggle'
};
const scanHistoryRow = document.getElementById('scanHistoryRow');
const scanHistoryVal = document.getElementById('scanHistoryValue');

// Load prefs
fetch('/api/user-preferences')
  .then(r => r.json())
  .then(prefs => {
    Object.entries(mapping).forEach(([key, id]) => {
      const cb = document.getElementById(id);
      cb.checked = !!prefs[key];
      cb.addEventListener('change', () => updatePref(key, cb.checked));
    });
    scanHistoryVal.textContent = prefs.scanHistory || '30 Days';
  });

// Change scan history
scanHistoryRow.addEventListener('click', () => {
  const current = scanHistoryVal.textContent;
  const next = prompt('Enter scan history timeframe:', current);
  if (next) {
    scanHistoryVal.textContent = next;
    updatePref('scanHistory', next);
  }
});

// PATCH one preference
function updatePref(key, value) {
  fetch('/api/user-preferences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value })
  }).catch(console.error);
}

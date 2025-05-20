// public/index.js

document.addEventListener('DOMContentLoaded', () => {
  fetch('/api/user-preferences')
    .then(res => res.json())
    .then(prefs => {
      // Avatar
      const avatarEl = document.getElementById('avatarSmall');
      if (prefs.profilePicture) {
        avatarEl.style.backgroundImage = `url(${prefs.profilePicture})`;
      }

      // Name
      const nameEl = document.getElementById('profileName');
      nameEl.textContent = prefs.name || 'Your Name';

      // Email
      const emailEl = document.getElementById('profileEmail');
      if (prefs.email) {
        emailEl.textContent = prefs.email;
        emailEl.href = `mailto:${prefs.email}`;
      } else {
        emailEl.textContent = 'email@example.com';
        emailEl.href = '#';
      }
    })
    .catch(console.error);
});

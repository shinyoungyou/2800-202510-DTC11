// public/account.js
document.addEventListener('DOMContentLoaded', () => {
  const avatar       = document.getElementById('avatar');
  const placeholder  = avatar.querySelector('.avatar-placeholder');
  const dispName     = document.getElementById('displayName');
  const dispEmail    = document.getElementById('displayEmail');
  const nameInput    = document.getElementById('nameInput');
  const emailInput   = document.getElementById('emailInput');
  const changePwdBtn = document.getElementById('changePasswordBtn');
  const modalOverlay = document.getElementById('modalOverlay');
  const modalClose   = document.getElementById('modalClose');
  const fileInput    = document.getElementById('fileInput');

  // Load existing preferences
  (async () => {
    const res = await fetch('/api/user-preferences', { credentials: 'include' });
    const prefs = await res.json();

    // Avatar
    if (prefs.profilePicture) {
      avatar.style.backgroundImage = `url(${prefs.profilePicture})`;
      placeholder.style.display = 'none';
    }

    // Name & Email
    dispName.textContent  = prefs.name  || '';
    dispEmail.textContent = prefs.email || '';
    dispEmail.href        = prefs.email ? `mailto:${prefs.email}` : '#';
    nameInput.value  = prefs.name  || '';
    emailInput.value = prefs.email || '';
  })();

  // Update name/email on blur
  nameInput.addEventListener('blur', e => updatePref('name', e.target.value));
  emailInput.addEventListener('blur', e => {
    updatePref('email', e.target.value);
    dispEmail.textContent = e.target.value;
    dispEmail.href        = `mailto:${e.target.value}`;
  });

  // Change Password: only updates password
  changePwdBtn.addEventListener('click', async () => {
    const newPwd = prompt('Enter new password:');
    if (!newPwd) return;
    const res = await fetch('/api/user-preferences', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'password', value: newPwd })
    });
    if (res.ok) alert('Password updated.');
    else alert('Failed to update password.');
  });

  // Avatar click opens upload modal
  avatar.addEventListener('click', () => modalOverlay.classList.remove('hidden'));
  modalClose.addEventListener('click', () => modalOverlay.classList.add('hidden'));

  // Handle photo upload with resize/compress
  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => img.src = reader.result;
    reader.readAsDataURL(file);

    img.onload = () => {
      const MAX = 256;
      let { width, height } = img;
      if (width > height) {
        height = Math.round((MAX / width) * height); width = MAX;
      } else {
        width = Math.round((MAX / height) * width); height = MAX;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      canvas.toBlob(blob => {
        const br = new FileReader();
        br.onload = async () => {
          const dataUrl = br.result;
          avatar.style.backgroundImage = `url(${dataUrl})`;
          placeholder.style.display = 'none';
          await updatePref('profilePicture', dataUrl);
          modalOverlay.classList.add('hidden');
        };
        br.readAsDataURL(blob);
      }, 'image/jpeg', 0.7);
    };
  });

  // Helper to POST a single preference
  async function updatePref(key, value) {
    await fetch('/api/user-preferences', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    });
  }
});

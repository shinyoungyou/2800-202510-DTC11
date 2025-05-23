// public/account.js
document.addEventListener('DOMContentLoaded', () => {
  const avatar       = document.getElementById('avatar');
  const placeholder  = avatar.querySelector('.avatar-placeholder');
  const dispName     = document.getElementById('displayName');
  const dispEmail    = document.getElementById('displayEmail');
  const nameInput    = document.getElementById('nameInput');
  const emailInput   = document.getElementById('emailInput');
  const changePwdBtn = document.getElementById('changePasswordBtn');
  const saveBtn      = document.getElementById('saveProfileBtn');
  const modalOverlay = document.getElementById('modalOverlay');
  const modalClose   = document.getElementById('modalClose');
  const fileInput    = document.getElementById('fileInput');

  // Load existing preferences
  (async () => {
    const res = await fetch('/api/auth/user-preferences', { credentials: 'include' });
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

  // Save Changes: name & email
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;             // prevent double‑click
    const newName  = nameInput.value.trim();
    const newEmail = emailInput.value.trim();

    // Client‑side validation
    if (!newName || !newEmail) {
      alert('Name and email cannot be blank.');
      saveBtn.disabled = false;
      return;
    }
    if (newName.length > 30) {
      alert('Name must be 30 characters or fewer.');
      saveBtn.disabled = false;
      return;
    }
    if (newEmail.length > 30) {
      alert('Email must be 30 characters or fewer.');
      saveBtn.disabled = false;
      return;
    }

    try {
      // Update name
      await updatePref('name', newName);
      dispName.textContent = newName;

      // Update email
      await updatePref('email', newEmail);
      dispEmail.textContent = newEmail;
      dispEmail.href        = `mailto:${newEmail}`;

      alert('Profile updated!');
    } catch (err) {
      console.error(err);
      alert('Failed to save changes.');
    } finally {
      saveBtn.disabled = false;
    }
  });

  // Change Password
  changePwdBtn.addEventListener('click', async () => {
    const newPwd = prompt('Enter new password:');
    if (!newPwd) return;

    // Enforce max length
    if (newPwd.length > 20) {
      alert('Password must be 20 characters or fewer.');
      return;
    }

    try {
      const res = await fetch('/api/auth/user-preferences', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'password', value: newPwd })
      });
      if (res.ok) alert('Password updated.');
      else throw new Error('Update failed');
    } catch {
      alert('Failed to update password.');
    }
  });

  // Avatar upload modal toggle
  avatar.addEventListener('click', () => modalOverlay.classList.remove('hidden'));
  modalClose.addEventListener('click', () => modalOverlay.classList.add('hidden'));

  // Handle photo upload with resize & compress
  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;

    // Only accept image files
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => img.src = reader.result;
    reader.readAsDataURL(file);

    img.onload = () => {
      const MAX = 256;
      let { width, height } = img;
      if (width > height) {
        height = Math.round((MAX / width) * height);
        width = MAX;
      } else {
        width = Math.round((MAX / height) * width);
        height = MAX;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      canvas.toBlob(blob => {
        const br = new FileReader();
        br.onload = async () => {
          const dataUrl = br.result;
          // Update UI
          avatar.style.backgroundImage = `url(${dataUrl})`;
          placeholder.style.display = 'none';
          modalOverlay.classList.add('hidden');
          // Persist to server
          await updatePref('profilePicture', dataUrl);
        };
        br.readAsDataURL(blob);
      }, 'image/jpeg', 0.7);
    };
  });

  // Helper to POST a single preference
  async function updatePref(key, value) {
    await fetch('/api/auth/user-preferences', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    });
  }
});

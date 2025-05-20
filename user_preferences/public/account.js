// public/account.js
// Handles profile picture upload with client-side resize & compression
document.addEventListener('DOMContentLoaded', () => {
  const avatar         = document.getElementById('avatar');
  const placeholder    = avatar.querySelector('.avatar-placeholder');
  const dispName       = document.getElementById('displayName');
  const dispEmail      = document.getElementById('displayEmail');
  const nameInput      = document.getElementById('nameInput');
  const emailInput     = document.getElementById('emailInput');
  const changePwdBtn   = document.getElementById('changePasswordBtn');
  const modalOverlay   = document.getElementById('modalOverlay');
  const modalClose     = document.getElementById('modalClose');
  const fileInput      = document.getElementById('fileInput');

  // Load existing preferences
  fetch('/api/user-preferences')
    .then(res => res.json())
    .then(prefs => {
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
    });

  // Save on blur
  nameInput.addEventListener('blur', e => updatePref('name', e.target.value));
  emailInput.addEventListener('blur', e => {
    updatePref('email', e.target.value);
    dispEmail.textContent = e.target.value;
    dispEmail.href        = `mailto:${e.target.value}`;
  });

  // Stub: change password
  changePwdBtn.addEventListener('click', () => {
    const pw = prompt('Enter new password:');
    if (pw) updatePref('password', pw);
  });

  // Open/Close modal
  avatar.addEventListener('click', () => modalOverlay.classList.remove('hidden'));
  modalClose.addEventListener('click', () => modalOverlay.classList.add('hidden'));

  // On file select: resize/compress then upload
  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      img.src = reader.result;
    };
    reader.readAsDataURL(file);

    img.onload = () => {
      // Set max dimensions
      const MAX_DIM = 256;
      let { width, height } = img;
      if (width > height) {
        if (width > MAX_DIM) {
          height = Math.round(height * (MAX_DIM / width));
          width = MAX_DIM;
        }
      } else {
        if (height > MAX_DIM) {
          width = Math.round(width * (MAX_DIM / height));
          height = MAX_DIM;
        }
      }

      // Draw to canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Export as JPEG @70% quality
      canvas.toBlob(blob => {
        const blobReader = new FileReader();
        blobReader.onload = () => {
          const dataUrl = blobReader.result;
          // Update avatar preview
          avatar.style.backgroundImage = `url(${dataUrl})`;
          placeholder.style.display = 'none';
          // Persist to server
          updatePref('profilePicture', dataUrl);
          modalOverlay.classList.add('hidden');
        };
        blobReader.readAsDataURL(blob);
      }, 'image/jpeg', 0.7);
    };
  });

  // Helper to PATCH a preference
  function updatePref(key, value) {
    fetch('/api/user-preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    }).catch(console.error);
  }
});

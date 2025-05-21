// public/script.js

document.addEventListener('DOMContentLoaded', () => {
  let masterList = [];
  const input   = document.getElementById('allergen-input');
  const suggBox = document.getElementById('suggestions');
  const added   = document.getElementById('added-list');

  // 1) Load master list of valid allergens
  fetch('/api/allergens', { credentials: 'include' })
    .then(res => {
      if (!res.ok) throw new Error(`Allergens load failed (${res.status})`);
      return res.json();
    })
    .then(list => masterList = list.sort())
    .catch(err => console.error('Error loading allergens:', err));

  // 2) Render the user’s allergens from user-preferences.json
  function refreshUser() {
    fetch('/api/user-preferences', { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error(`Prefs load failed (${res.status})`);
        return res.json();
      })
      .then(prefs => {
        const arr = Array.isArray(prefs.allergens) ? prefs.allergens : [];
        const items = arr.map(name =>
          `<li>
             <span>${name}</span>
             <button class="remove-btn" data-name="${name}">×</button>
           </li>`
        ).join('');

        added.innerHTML = `
          <h2>Your Allergens:</h2>
          <ul>${items}</ul>
        `;

        // bind remove handlers
        added.querySelectorAll('.remove-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            removeAllergen(btn.dataset.name);
          });
        });
      })
      .catch(err => console.error('Error fetching user preferences:', err));
  }
  refreshUser();

  // 3) Autocomplete suggestions
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    suggBox.innerHTML = '';
    if (!q) return;
    masterList
      .filter(name => name.toLowerCase().includes(q))
      .slice(0, 10)
      .forEach(name => {
        const li = document.createElement('li');
        li.textContent = name;
        li.onclick = () => addAllergen(name);
        suggBox.appendChild(li);
      });
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const match = masterList.find(n => n.toLowerCase() === input.value.trim().toLowerCase());
      if (match) addAllergen(match);
    }
  });

  // 4) Add an allergen (updates both user_allergens.json and prefs)
  function addAllergen(name) {
    input.value = '';
    suggBox.innerHTML = '';

    fetch('/api/user-allergens', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allergen: name })
    })
    .then(res => {
      if (!res.ok) throw new Error(`Add failed (${res.status})`);
      return res.json();
    })
    .then(() => refreshUser())
    .catch(err => console.error('Error adding allergen:', err));
  }

  // 5) Remove an allergen (syncs both stores)
  function removeAllergen(name) {
    fetch('/api/user-allergens', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allergen: name })
    })
    .then(res => {
      if (!res.ok) throw new Error(`Remove failed (${res.status})`);
      return res.json();
    })
    .then(() => refreshUser())
    .catch(err => console.error('Error removing allergen:', err));
  }
});

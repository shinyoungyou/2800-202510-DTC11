let masterList = [];
const input   = document.getElementById('allergen-input');
const suggBox = document.getElementById('suggestions');
const added   = document.getElementById('added-list');

// Load master allergens
fetch('/api/allergens')
  .then(r => r.json())
  .then(list => masterList = list.sort());

// Render user’s saved allergens
function refreshUser() {
  fetch('/api/user-allergens')
    .then(r => r.json())
    .then(arr => {
      added.innerHTML = 
        '<h2>Your Allergens:</h2><ul>' +
        arr.map(a => `<li>${a}</li>`).join('') +
        '</ul>';
    });
}
refreshUser();

// Only activate autocomplete if input exists
if (input) {
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
}

// Post selection and refresh
function addAllergen(name) {
  input.value = '';
  suggBox.innerHTML = '';
  fetch('/api/user-allergens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ allergen: name })
  })
  .then(r => r.json())
  .then(() => refreshUser());
}

// Remove an allergen
function removeAllergen(name) {
  fetch('/api/user-allergens', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ allergen: name })
  })
  .then(r => r.json())
  .then(() => refreshUser());
}
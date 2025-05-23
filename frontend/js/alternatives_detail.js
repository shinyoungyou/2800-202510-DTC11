const params = new URLSearchParams(window.location.search);
const barcode = params.get("barcode");
const backBtn = document.getElementById("back-btn");
const thumb = document.getElementById("alt-detail-thumb");
const nameEl = document.getElementById("alt-detail-name");
const brandEl = document.getElementById("alt-detail-brand");
const tagsEl = document.getElementById("alt-detail-tags");
const ingredientsEl = document.getElementById("ingredients-text");
const allergensListEl = document.getElementById("allergens-list");
const allergenIcons = {
    celery: "icons/celery.png",
    crustaceans: "icons/shrimp.png",
    eggs: "icons/egg.png",
    fish: "icons/fish.png",
    gluten: "icons/wheat.png",
    lupin: "icons/lupin.png",
    milk: "icons/milk.png",
    molluscs: "icons/mussel.png",
    mustard: "icons/mustard.png",
    nuts: "icons/nut.png",
    peanuts: "icons/peanut.png",
    sesameseeds: "icons/sesame.png",
    soybeans: "icons/soy.png",
    sulphites: "icons/sulphite.png",
};
backBtn.addEventListener("click", () => window.history.back());
async function loadAlternativeDetail() {
    if (!barcode) return;
    const res = await fetch(
        `https://two800-202510-dtc11.onrender.com/product/${barcode}`
    );
    const p = await res.json();
    thumb.src = p.thumbUrl || "icons/allergen-placeholder.svg";
    nameEl.textContent = p.productName || "";
    brandEl.textContent = p.brand || "";
    tagsEl.textContent = (p.allergens || []).map((a) => `#${a.name}`).join(" ");
    const ingredients = p.ingredients || [];
    ingredientsEl.textContent = ingredients
        .map((i) => i.text || i.id)
        .filter(Boolean)
        .join(", ");
    allergensListEl.innerHTML = "";
    const names = p.allergens.map((a) => a.name);
    if (names.length === 0) {
        const li = document.createElement("li");
        li.className = "py-3 text-gray-500";
        li.textContent = "None";
        allergensListEl.appendChild(li);
    } else {
        names.forEach((name) => {
            const li = document.createElement("li");
            li.className = "flex items-center space-x-2 py-3";
            const icon =
                allergenIcons[name] || "icons/allergen-placeholder.svg";
            li.innerHTML = `<img src="${icon}" class="w-6 h-6 flex-shrink-0"/><span>${name}</span>`;
            allergensListEl.appendChild(li);
        });
    }
}
loadAlternativeDetail();

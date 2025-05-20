const API_BASE = "http://localhost:3000/scan";
const params = new URLSearchParams(window.location.search);
const id = params.get("id");
const backBtn = document.getElementById("back-btn");
const deleteBtn = document.getElementById("delete-btn");
const thumb = document.getElementById("detail-thumb");
const nameEl = document.getElementById("detail-name");
const brandEl = document.getElementById("detail-brand");
const tagsEl = document.getElementById("detail-tags");
const listEl = document.getElementById("detail-list");
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
backBtn.addEventListener("click", () => (window.location.href = "index.html"));
deleteBtn.addEventListener("click", async () => {
    if (window.confirm("Are you sure you want to delete this?")) {
        await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
        window.location.href = "index.html";
    }
});
async function loadDetail() {
    const res = await fetch(`${API_BASE}/${id}`);
    const p = await res.json();
    thumb.src = p.thumbUrl || "icons/allergen-placeholder.svg";
    nameEl.textContent = p.productName || "";
    brandEl.textContent = p.brand || "";
    tagsEl.textContent = (p.allergens || []).map((a) => `#${a}`).join(" ");
    listEl.innerHTML = "";
    const percents = p.allergenPercents || {};
    p.allergens.forEach((name) => {
        const iconSrc = allergenIcons[name] || "icons/allergen-placeholder.svg";
        const percent = percents[name];
        const percentText = percent != null ? `${percent.toFixed(1)} %` : "";
        const li = document.createElement("li");
        li.className = "flex items-center justify-between py-3";
        li.innerHTML = `
      <div class="flex items-center space-x-2">
        <img src="${iconSrc}" class="w-6 h-6 flex-shrink-0"/>
        <span>${name}</span>
      </div>
      <span>${percentText}</span>
    `;
        listEl.appendChild(li);
    });
}
loadDetail();

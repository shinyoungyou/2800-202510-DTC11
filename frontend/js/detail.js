const API_BASE = "https://two800-202510-dtc11.onrender.com/scan";
const params = new URLSearchParams(window.location.search);
const id = params.get("id");
const barcodeParam = params.get("barcode");
const backBtn = document.getElementById("back-btn");
const deleteBtn = document.getElementById("delete-btn");
const seeAllBtn = document.getElementById("see-all");
const thumb = document.getElementById("detail-thumb");
const nameEl = document.getElementById("detail-name");
const brandEl = document.getElementById("detail-brand");
const tagsEl = document.getElementById("detail-tags");
const listEl = document.getElementById("detail-list");
const altListEl = document.getElementById("alt-list");
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
    if (id && window.confirm("Are you sure you want to delete this?")) {
        await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
        window.location.href = "index.html";
    }
});
async function loadDetail() {
    let p;
    if (barcodeParam) {
        const res = await fetch(
            `https://two800-202510-dtc11.onrender.com/product/${barcodeParam}`
        );
        p = await res.json();
        p.allergens = p.allergens.map((a) => a.name);
        p.allergenPercents = {};
        p.alternatives = [];
    } else if (id) {
        const res = await fetch(`${API_BASE}/${id}`);
        p = await res.json();
    } else {
        return;
    }
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
        li.innerHTML = `<div class="flex items-center space-x-2"><img src="${iconSrc}" class="w-6 h-6 flex-shrink-0"/><span>${name}</span></div><span>${percentText}</span>`;
        listEl.appendChild(li);
    });
    altListEl.innerHTML = "";
    if (p.alternatives && p.alternatives.length) {
        p.alternatives.forEach((palt) => {
            const li = document.createElement("li");
            li.className = "flex-shrink-0 snap-start w-56 cursor-pointer";
            li.addEventListener("click", () => {
                window.location.href = `alternatives_detail.html?barcode=${palt.barcode}`;
            });
            li.innerHTML = `<div class="flex space-x-4"><img src="${
                palt.thumbUrl
            }" class="w-20 h-20 rounded flex-shrink-0"/><div class="flex flex-col justify-center"><p class="font-medium truncate">${
                palt.productName
            }</p><p class="text-xs text-gray-500 truncate">${
                palt.brand
            }</p><p class="text-xs text-gray-400 truncate">${palt.allergens
                .map((a) => `#${a}`)
                .join(" ")}</p></div></div>`;
            altListEl.appendChild(li);
        });
    }
    if (seeAllBtn && p.barcode) {
        seeAllBtn.addEventListener("click", () => {
            window.location.href = `alternatives.html?barcode=${p.barcode}`;
        });
    }
}
loadDetail();

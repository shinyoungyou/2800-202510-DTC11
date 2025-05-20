const params = new URLSearchParams(window.location.search);
const barcode = params.get("barcode");
const backBtn = document.getElementById("back-btn");
const altsList = document.getElementById("alts-list");
backBtn.addEventListener("click", () => window.history.back());
async function loadAlts() {
    if (!barcode) return;
    try {
        altsList.innerHTML = "<p class='text-gray-500'>Loading alternatives...</p>";
        const res = await fetch(
            `http://localhost:3000/alternatives/${barcode}?limit=8`
        );
        if (!res.ok) throw new Error();
        const alts = await res.json();
        if (alts.length === 0) {
            altsList.innerHTML = `<p class="text-gray-500">No alternatives found.</p>`;
            return;
        }
        altsList.innerHTML = "";
        alts.forEach((p) => {
            const item = document.createElement("div");
            item.className = "flex items-center space-x-4 py-4 cursor-pointer";
            item.addEventListener("click", () => {
                window.location.href = `detail.html?barcode=${p.barcode}`;
            });
            item.innerHTML = `
      <img src="${p.thumbUrl}" class="w-16 h-16 bg-gray-200 rounded"/>
      <div class="flex-1 space-y-1">
        <p class="font-semibold truncate">${p.productName}</p>
        <p class="text-sm text-gray-500 truncate">${p.brand}</p>
        <p class="text-xs text-gray-400 truncate">${p.allergens
            .map((a) => `#${a}`)
            .join(" ")}</p>
      </div>
    `;
            altsList.appendChild(item);
        });
    } catch {
        altsList.innerHTML = `<p class="text-red-500">Failed to load alternatives.</p>`;
    }
}
loadAlts();

const params = new URLSearchParams(window.location.search);
const barcode = params.get("barcode");
const backBtn = document.getElementById("back-btn");
const altsList = document.getElementById("alts-list");
backBtn.addEventListener("click", () => window.history.back());
async function loadAlts() {
    if (!barcode) return;
    altsList.innerHTML = "<p class='text-gray-500'>Loading alternatives...</p>";
    const res = await fetch(
        `http://localhost:3000/alternatives/${barcode}?limit=8`
    );
    const alts = res.ok ? await res.json() : [];
    if (alts.length === 0) {
        altsList.innerHTML = `<p class="text-gray-500">No alternatives found.</p>`;
    } else {
        altsList.innerHTML = "";
        alts.forEach((p) => {
            const item = document.createElement("div");
            item.className = "flex items-center space-x-4 py-4 cursor-pointer";
            item.addEventListener("click", () => {
                window.location.href = `detail.html?barcode=${p.barcode}`;
            });
            item.innerHTML = `<img src="${
                p.thumbUrl
            }" class="w-16 h-16 rounded"/><div class="flex-1"><p class="font-semibold truncate">${
                p.productName
            }</p><p class="text-sm truncate">${
                p.brand
            }</p><p class="text-xs truncate">${p.allergens
                .map((a) => `#${a}`)
                .join(" ")}</p></div>`;
            altsList.appendChild(item);
        });
        const scansRes = await fetch("http://localhost:3000/scan");
        const scans = await scansRes.json();
        const scan = scans.find((s) => s.barcode === barcode);
        if (scan) {
            await fetch(`http://localhost:3000/scan/${scan._id}/alternatives`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ alternatives: alts }),
            });
        }
    }
}
loadAlts();

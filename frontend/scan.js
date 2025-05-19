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
const allergenMap = {
    celery: ["celery"],
    crustaceans: ["crab", "lobster", "shrimp", "prawn", "crustacean"],
    eggs: ["egg", "egg-yolk", "whole-egg"],
    fish: ["fish", "anchovy", "salmon", "tuna", "cod", "haddock"],
    gluten: ["gluten", "wheat", "barley", "rye", "oats", "spelt"],
    lupin: ["lupin"],
    milk: ["milk", "cheese", "butter", "cream", "yoghurt"],
    molluscs: ["mussel", "clam", "oyster", "scallop", "snail"],
    mustard: ["mustard"],
    nuts: ["almond", "hazelnut", "walnut", "pistachio", "cashew"],
    peanuts: ["peanut", "groundnut"],
    sesameseeds: ["sesame", "tahini"],
    soybeans: ["soy", "soya", "soybean", "tofu", "soya-oil"],
    sulphites: [
        "sulphite",
        "sulfite",
        "sulphur-dioxide",
        "sulphur-dioxide-and-sulphites",
    ],
};
const norm = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, "");
const video = document.getElementById("video");
const barcodeBox = document.getElementById("barcode-box");
const bottomSheet = document.getElementById("bottom-sheet");
const prodNameEl = document.getElementById("prod-name");
const prodBrandEl = document.getElementById("prod-brand");
const prodTagsEl = document.getElementById("prod-tags");
const prodThumbEl = document.getElementById("prod-thumb");
const allergensListEl = document.getElementById("allergens-list");
document.addEventListener("DOMContentLoaded", () => {
    const scanButton = document.querySelector(".scan-nav");
    if (scanButton)
        scanButton.addEventListener(
            "click",
            () => (window.location.href = "scan.html")
        );
});
let isExpanded = false;
function toggleSheet(expand = !isExpanded) {
    isExpanded = expand;
    if (isExpanded) {
        bottomSheet.classList.remove("h-24");
        bottomSheet.classList.add("h-[80%]");
    } else {
        bottomSheet.classList.remove("h-[80%]");
        bottomSheet.classList.add("h-24");
    }
}
bottomSheet.addEventListener("click", () => toggleSheet());
const codeReader = new ZXing.BrowserBarcodeReader();
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false,
        });
        video.srcObject = stream;
        await video.play();
    } catch {
        alert("Unable to use the camera.");
    }
}
async function fetchProduct(barcode) {
    const res = await fetch(`http://localhost:3000/product/${barcode}`);
    if (!res.ok) throw new Error(res.statusText);
    return await res.json();
}
async function saveScanToDB(scanDoc) {
    try {
        const res = await fetch("http://localhost:3000/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(scanDoc),
        });
        if (!res.ok) console.warn("Save responded with HTTP", res.status);
    } catch (err) {
        console.error("Failed to save scan:", err);
    }
    saveScanToLocal(scanDoc);
}
function saveScanToLocal(scanDoc) {
    let savedProducts =
        JSON.parse(localStorage.getItem("scannedProducts")) || [];
    if (savedProducts.find((p) => p.barcode === scanDoc.barcode)) return;
    savedProducts.push(scanDoc);
    localStorage.setItem("scannedProducts", JSON.stringify(savedProducts));
}
async function scanLoop() {
    try {
        const result = await codeReader.decodeOnceFromVideoDevice(
            undefined,
            video
        );
        const points = result.getResultPoints();
        const xs = points.map((p) => p.x),
            ys = points.map((p) => p.y);
        const x = Math.min(...xs),
            y = Math.min(...ys),
            width = Math.max(...xs) - x,
            height = Math.max(...ys) - y;
        drawBox({ x, y, width, height });
        await handleCode(result.getText());
        setTimeout(scanLoop, 2000);
    } catch {
        requestAnimationFrame(scanLoop);
    }
}
function drawBox({ x, y, width, height }) {
    barcodeBox.style.cssText = `left:${x}px; top:${y}px; width:${width}px; height:${height}px;`;
    barcodeBox.classList.remove("hidden");
}
async function getProcessedData(text) {
    const res = await fetch("http://localhost:3000/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(res.statusText);
    return await res.json();
}
async function handleCode(barcode) {
    try {
        prodNameEl.textContent = "Loading…";
        prodBrandEl.textContent = "";
        prodTagsEl.textContent = "";
        toggleSheet(false);
        const product = await fetchProduct(barcode);
        prodThumbEl.src = product.thumbUrl;
        const allergens = product.allergens;
        const percentByAllergen = Object.fromEntries(
            allergens.map(({ name }) => [name, null])
        );
        if (Array.isArray(product.ingredients)) {
            product.ingredients.forEach((ing) => {
                const id = norm(ing.id || ""),
                    text = norm(ing.text || "");
                allergens.forEach(({ name }) => {
                    const words = allergenMap[name] || [name];
                    if (
                        words.some((w) => id.includes(w) || text.includes(w)) &&
                        ing.percent_estimate > 0
                    ) {
                        percentByAllergen[name] = Math.max(
                            percentByAllergen[name] || 0,
                            ing.percent_estimate
                        );
                    }
                });
            });
        }
        prodNameEl.textContent = product.productName || "Unknown product";
        prodBrandEl.textContent = product.brand || "Unknown";
        prodTagsEl.textContent = allergens
            .map(({ name }) => `#${name}`)
            .join(" ");
        allergensListEl.innerHTML = "";
        allergens.forEach(({ name, source }) => {
            const gKey = `${name.replace(/\s+/g, "_").toLowerCase()}_100g`;
            const grams = product.nutriments?.[gKey];
            const pct = percentByAllergen[name];
            const right =
                grams != null
                    ? `${grams} g/100g`
                    : pct != null
                    ? `${pct.toFixed(1)} %`
                    : "—";
            const li = document.createElement("li");
            li.className = "flex justify-between py-2";
            const iconSrc =
                allergenIcons[name] || "icons/allergen-placeholder.svg";
            li.innerHTML = `<div class="flex items-center space-x-2 flex-1"><img src="${iconSrc}" alt="${name} icon" class="w-6 h-6 flex-shrink-0"/><span class="${
                source === "ai" ? "text-yellow-600 font-medium" : ""
            }">${name}${
                source === "ai" ? "*" : ""
            }</span></div><div class="flex-shrink-0"><span>${right}</span></div>`;
            allergensListEl.appendChild(li);
        });
        if (!allergens.length) {
            const li = document.createElement("li");
            li.className = "py-2";
            li.textContent = "None";
            allergensListEl.appendChild(li);
        }
        let processedData = {};
        try {
            const aiInput = (product.ingredients || [])
                .map((ing) => ing.text || ing.id || "")
                .join(" ");
            processedData = await getProcessedData(aiInput);
        } catch {}
        const scanDoc = {
            barcode,
            productName: product.productName || "",
            brand: product.brand || "",
            allergens: allergens.map(({ name }) => name),
            allergenPercents: percentByAllergen,
            thumbUrl: product.thumbUrl,
            processedData,
        };
        saveScanToDB(scanDoc);
        toggleSheet(true);
    } catch (err) {
        alert(`Failed to fetch product info:\n${err.message}`);
    }
}
startCamera().then(() => {
    scanLoop();
});

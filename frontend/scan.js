console.log('▶ scan.js loaded');

/* -------- Optional: allergen → icon URL map -------- */
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

/* -------- 14-allergen synonym dictionary -------- */
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

/* lower-case + non-alphanum strip → better matching */
const norm = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, "");

/* ---------- DOM elements ---------- */
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
    if (scanButton) {
        scanButton.addEventListener("click", () => {
            window.location.href = "scan.html";
        });
    }
});


/* Bottom-sheet state ---------------------------------------------------- */
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
/* Toggle on tap (extend to drag gestures if needed) */
bottomSheet.addEventListener("click", () => toggleSheet());

const codeReader = new ZXing.BrowserBarcodeReader();

/* -------------------- Start camera -------------------- */
async function startCamera() {
    console.log('▶ startCamera() called');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false,
        });
        console.log('▶ camera stream received', stream);
        video.srcObject = stream;
        await video.play();
        console.log('▶ video.play() completed');
    } catch (err) {
        console.error("Could not access camera:", err);
        alert("Unable to use the camera.");
    }
}

/* ---------- detector ---------- */
// let detector = null;
// if ("BarcodeDetector" in window) {
//     detector = new BarcodeDetector({
//         formats: ["ean_13", "ean_8", "code_128"],
//     });
// } else {
//     alert("BarcodeDetector API is not supported in this browser.");
// }

/* ---------- product API ---------- */
async function fetchProduct(barcode) {
    const res = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    );
    if (!res.ok) throw new Error(res.statusText);
    const json = await res.json();
    if (json.status !== 1) throw new Error("Product not found.");
    return json.product;
}

/* ---------- save scan to backend ---------- */
async function saveScanToDB(scanDoc) {
    try {
        const res = await fetch("http://localhost:3000/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(scanDoc),
        });

        if (res.ok) {
            console.log("Scan saved successfully:", scanDoc.barcode);
        } else {
            console.warn("Save responded with HTTP", res.status);
        }
    } catch (err) {
        console.error("Failed to save scan:", err);
    }

    saveScanToLocal(scanDoc);
}

function saveScanToLocal(scanDoc) {
    let savedProducts = JSON.parse(localStorage.getItem("scannedProducts")) || [];

    // Prevent duplicate products by barcode
    const existingProduct = savedProducts.find(product => product.barcode === scanDoc.barcode);
    if (existingProduct) {
        console.log("Product already scanned. Skipping duplicate.");
        return;
    }

    savedProducts.push(scanDoc);
    localStorage.setItem("scannedProducts", JSON.stringify(savedProducts));
}



/* ---------- scan loop ---------- */
async function scanLoop() {
    console.log('🔄 scanning…');
    try {
      const result = await codeReader.decodeOnceFromVideoDevice(undefined, video);
  
      console.log('✅ Detected:', result.getText());
      const points = result.getResultPoints(); // [{x,y}, …]
      const xs = points.map(p => p.x);
      const ys = points.map(p => p.y);
      const x = Math.min(...xs),
            y = Math.min(...ys),
            width = Math.max(...xs) - x,
            height = Math.max(...ys) - y;
  
      drawBox({ x, y, width, height });
  
      await handleCode(result.getText());
  
      setTimeout(scanLoop, 2000);
    } catch (err) {
      console.log('❌ no code yet, retrying…');
      requestAnimationFrame(scanLoop);
    }
  }
  

/* ---------- bounding box ---------- */
function drawBox({ x, y, width, height }) {
    barcodeBox.style.cssText = `left:${x}px; top:${y}px; width:${width}px; height:${height}px;`;
    barcodeBox.classList.remove("hidden");
}

/* ---------- handle barcode ---------- */
async function handleCode(barcode) {
    try {
        // loading placeholder
        prodNameEl.textContent = "Loading…";
        prodBrandEl.textContent = "";
        prodTagsEl.textContent = "";
        toggleSheet(false); // stay collapsed while loading

        const product = await fetchProduct(barcode);
        // choose the smallest available photo, fall back to any front image,
        // or keep the placeholder if nothing exists.
        const thumbURL =
            product?.image_thumb_url ||
            product?.image_front_thumb_url ||
            product?.image_front_small_url ||
            product?.image_front_url;
        if (thumbURL) prodThumbEl.src = thumbURL;

        const nutr = product.nutriments || {};
        const allergens =
            Array.isArray(product.allergens_tags) &&
            product.allergens_tags.length
                ? product.allergens_tags.map((t) => t.split(":")[1])
                : [];

        /* --- Build lookup { allergen → % estimate or null } --- */
        const percentByAllergen = Object.fromEntries(
            allergens.map((a) => [a, null])
        );

        if (Array.isArray(product.ingredients)) {
            product.ingredients.forEach((ing) => {
                const id = norm(ing.id || "");
                const text = norm(ing.text || "");

                allergens.forEach((a) => {
                    const words = allergenMap[a] || [a];
                    const hit = words.some(
                        (w) => id.includes(w) || text.includes(w)
                    );
                    if (
                        hit &&
                        ing.percent_estimate &&
                        ing.percent_estimate > 0
                    ) {
                        percentByAllergen[a] = Math.max(
                            percentByAllergen[a] ?? 0,
                            ing.percent_estimate
                        );
                    }
                });
            });
        }

        /* summary */
        prodNameEl.textContent = product.product_name || "Unknown product";
        prodBrandEl.textContent = (product.brands || "Unknown").split(",")[0];
        prodTagsEl.textContent = allergens.map((a) => `#${a}`).join(" ");

        /* allergen list */
        allergensListEl.innerHTML = "";
        allergens.forEach((name) => {
            const gKey = `${name.replace(/\s+/g, "_").toLowerCase()}_100g`;
            const grams = nutr[gKey]; // e.g. “16 g per 100 g”
            const pct = percentByAllergen[name]; // e.g. “3 % of recipe”

            const right =
                grams != null
                    ? `${grams} g/100g`
                    : pct != null
                    ? `${pct.toFixed(1)} %`
                    : "—";

            const li = document.createElement("li");
            li.className = "flex justify-between py-2";
            // lookup icon or fallback to a blank placeholder
            const iconSrc =
                allergenIcons[name] || "icons/allergen-placeholder.svg";
            li.innerHTML = `
              <div class="flex items-center justify-between w-full py-2">
                <!-- Left: icon + name, takes up all free space -->
                <div class="flex items-center space-x-2 flex-1">
                  <img src="${iconSrc}"
                       alt="${name} icon"
                       class="w-6 h-6 flex-shrink-0"/>
                  <span>${name}</span>
                </div>
                <!-- Right: percent, never shrinks or wraps -->
                <div class="flex-shrink-0">
                  <span>${right}</span>
                </div>
              </div>
            `;
            allergensListEl.appendChild(li);
        });
        if (!allergens.length) {
            const li = document.createElement("li");
            li.className = "py-2";
            li.textContent = "None";
            allergensListEl.appendChild(li);
        }

        const scanDoc = {
            barcode,
            productName: product.product_name || "",
            brand: (product.brands || "").split(",")[0],
            allergens,
            allergenPercents: percentByAllergen,
            thumbUrl: thumbURL || "",
        };
        saveScanToDB(scanDoc);

        toggleSheet(true); // expand sheet
    } catch (err) {
        console.error(err);
        alert(`Failed to fetch product info:\n${err.message}`);
    }
}

/* ---------- init ---------- */
startCamera().then(() => {
    scanLoop();
});

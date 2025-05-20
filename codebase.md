# backend\.gitignore

```
/node_modules
package-lock.json
```

# backend\package.json

```json
{
  "name": "backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "start": "nodemon server.js"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/shinyoungyou/2800-202510-DTC11.git"
  },
  "author": "DTC11",
  "license": "ISC",
  "bugs": {
    "url": "https://github.com/shinyoungyou/2800-202510-DTC11/issues"
  },
  "homepage": "https://github.com/shinyoungyou/2800-202510-DTC11#readme",
  "description": "",
  "dependencies": {
    "@zxing/library": "^0.21.3",
    "cors": "^2.8.5",
    "dotenv": "^16.5.0",
    "express": "^5.1.0",
    "mongoose": "^8.14.1"
  },
  "devDependencies": {
    "nodemon": "^3.1.10"
  }
}

```

# backend\scan.js

```js

// --------------------------------------------------
// Router + data‑access for scan resources
// --------------------------------------------------

const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

// ---------------------------------------------------------------------------
// Mongoose model
// ---------------------------------------------------------------------------
const scanSchema = new mongoose.Schema(
    {
        barcode: { type: String, required: true },
        productName: String,
        brand: String,
        allergens: [String],
        allergenPercents: { type: Map, of: Number },
        thumbUrl: String,
    },
    { timestamps: true }
);

const Scan = mongoose.model("Scan", scanSchema);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
// POST /scan  → create one scan document
router.post("/", async (req, res) => {
    try {
        const scan = await Scan.create(req.body);
        res.status(201).json(scan);
    } catch (err) {
        console.error("[POST /scan]", err.message);
        res.status(400).json({ error: "Failed to save scan data" });
    }
});

// GET /scan  → list recent scans (limit 50)
router.get("/", async (_req, res) => {
    try {
        const scans = await Scan.find().sort({ createdAt: -1 }).limit(50);
        res.json(scans);
    } catch (err) {
        console.error("[GET /scan]", err.message);
        res.status(500).json({ error: "Failed to fetch scans" });
    }
});

module.exports = router;

```

# backend\server.js

```js
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/scanapp";

// ---------------------------------------------------------------------------
// Init function (top‑level await not required on LTS)
// ---------------------------------------------------------------------------
async function main() {
    // Connect database
    try {
        await await mongoose.connect(MONGO_URI);
        console.log(`[MongoDB] Connected → ${MONGO_URI}`);
    } catch (err) {
        console.error("[MongoDB] connection error:", err.message);
        process.exit(1);
    }

    // Create Express app + global middleware
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Health‑check root
    app.get("/", (_req, res) => {
        res.send("Scanner backend running");
    });

    // Feature routers (keep logic in separate files)
    app.use("/scan", require("./scan")); // → backend/scan.js

    // Start HTTP server
    app.listen(PORT, () => {
        console.log(`[Express] listening on http://localhost:${PORT}`);
    });
}

main();

```

# frontend\history.js

```js
console.log('▶ history.js loaded');

/* ---------- DOM elements ---------- */
const historyList = document.getElementById("history-list");

// Load scanned products (for history page)
document.addEventListener("DOMContentLoaded", () => {
    if (historyList) {
        loadScannedProducts();
    }
});

// Load saved products from local storage
function loadScannedProducts() {
    if (!historyList) return;

    historyList.innerHTML = "";
    const savedProducts = JSON.parse(localStorage.getItem("scannedProducts")) || [];

    if (savedProducts.length === 0) {
        historyList.innerHTML = `<p class="text-gray-500">No scanned products yet.</p>`;
        return;
    }

    savedProducts.reverse().forEach((product) => {
        const item = document.createElement("div");
        item.className = "flex items-center space-x-4";
        item.innerHTML = `
            <img src="${product.thumbUrl || 'icons/allergen-placeholder.svg'}" 
                 class="w-16 h-16 rounded object-cover bg-gray-300 flex-shrink-0" />
            <div class="flex-1">
                <p class="font-semibold leading-tight truncate">${product.productName || "Unknown Product"}</p>
                <p class="text-sm text-gray-500 truncate">${product.brand || "Unknown Brand"}</p>
                <p class="text-xs text-gray-400 truncate">${product.allergens.map(a => `#${a}`).join(" ")}</p>
            </div>
        `;
        historyList.appendChild(item);
    });
}



// Clear history
function clearHistory() {
    if (confirm("Are you sure you want to clear history?")) {
        localStorage.removeItem("scannedProducts");
        loadScannedProducts(); // Reload to clear the list
    }
}

```

# frontend\home_page.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>document</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

</head>
<body class="p-10">
    <i class="fas fa-trash-alt absolute right-10 text-xl"></i>
    <h1 class="font-bold text-3xl mt-10">History</h1>

    <div id = "history-list" class="mt-5 space-y-4"></div>

    <nav class="fixed bottom-10 left-0 right-0 h-16 bg-white flex justify-around items-center text-black">
        <a href="homepage.html" class="flex flex-col items-center text-gray-500">
            <img src="icons/history-outlined.png" alt="home" class="w-6 h-6 mb-1 object-contain" />
            <span class="text-xs">Home</span>
        </a>
        <a href="scan.html" class="flex flex-col items-center text-gray-500">
            <img src="icons/scan-outlined.png" alt="scan" class="w-6 h-6 mb-1 object-contain" />
            <span class="text-xs">Scan</span>
        </a>
        <button class="flex flex-col items-center text-gray-500">
            <img src="icons/profile-outlined.png" alt="profile" class="w-6 h-6 mb-1 object-contain" />
            <span class="text-xs">Profile</span>
        </button>
    </nav>
    

    <script src="scan.js"></script>
    <script src="history.js"></script>
</body>
</html>
```

# frontend\icons\celery.png

This is a binary file of the type: Image

# frontend\icons\egg.png

This is a binary file of the type: Image

# frontend\icons\fish.png

This is a binary file of the type: Image

# frontend\icons\history-fill.png

This is a binary file of the type: Image

# frontend\icons\history-outlined.png

This is a binary file of the type: Image

# frontend\icons\lupin.png

This is a binary file of the type: Image

# frontend\icons\milk.png

This is a binary file of the type: Image

# frontend\icons\mussel.png

This is a binary file of the type: Image

# frontend\icons\mustard.png

This is a binary file of the type: Image

# frontend\icons\nut.png

This is a binary file of the type: Image

# frontend\icons\peanut.png

This is a binary file of the type: Image

# frontend\icons\profile-fill.png

This is a binary file of the type: Image

# frontend\icons\profile-outlined.png

This is a binary file of the type: Image

# frontend\icons\scan-fill.png

This is a binary file of the type: Image

# frontend\icons\scan-outlined.png

This is a binary file of the type: Image

# frontend\icons\sesame.png

This is a binary file of the type: Image

# frontend\icons\shrimp.png

This is a binary file of the type: Image

# frontend\icons\soy.png

This is a binary file of the type: Image

# frontend\icons\sulphite.png

This is a binary file of the type: Image

# frontend\icons\wheat.png

This is a binary file of the type: Image

# frontend\product_page.html

```html
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>document</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

</head>

<body class="p-10">
    <div class = "flex items-center justify-betweeen">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-black" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" stroke-width="4">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        <i class="fas fa-trash-alt absolute right-10 text-xl"></i>
    </div>
    <nav
        class="h-16 bg-white flex justify-between items-center text-black fixed bottom-10 left-10 right-10 mx-auto max-w-[500px]">
        <button class="flex flex-col items-center text-gray-500">
            <img src="icons/history-outlined.png" alt="home" class="w-6 h-6 mb-1 object-contain" />
            <span class="text-xs">Home</span>
        </button>
        <button class="flex flex-col items-center text-blue-600">
            <img src="icons/scan-outlined.png" alt="scan" class="w-6 h-6 mb-1 object-contain" />
            <span class="text-xs">Scan</span>
        </button>
        <button class="flex flex-col items-center text-gray-500">
            <img src="icons/profile-outlined.png" alt="profile" class="w-6 h-6 mb-1 object-contain" />
            <span class="text-xs">Profile</span>
        </button>
    </nav>
</body>

</html>
```

# frontend\scan.html

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Scan page</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-black flex flex-col h-screen text-white">

  <!-- camera viewport (unchanged) -->
  <div class="relative flex-1 overflow-hidden">
    <video id="video" autoplay playsinline class="w-full h-full object-cover"></video>

    <!-- Four corner guides -->    
    <div class="absolute inset-0 pointer-events-none flex items-center justify-center">
      <div class="relative w-3/4 max-w-[22rem] aspect-square">
        <div class="absolute top-0    left-0   w-10 h-10 border-t-4 border-l-4 border-white"></div>
        <div class="absolute top-0    right-0  w-10 h-10 border-t-4 border-r-4 border-white"></div>
        <div class="absolute bottom-0 left-0   w-10 h-10 border-b-4 border-l-4 border-white"></div>
        <div class="absolute bottom-0 right-0  w-10 h-10 border-b-4 border-r-4 border-white"></div>
      </div>
      <!-- Detected barcode bounding box -->
      <div id="barcode-box" class="absolute border-2 border-green-400 hidden"></div>
    </div>
  </div>

  <!-- bottom sheet (collapsed by default) -->
  <div id="bottom-sheet"
       class="bg-white text-black w-full
              transition-all duration-300
              h-24   /* collapsed height */
              overflow-hidden">
    <!-- handle -->
    <div class="w-full flex justify-center py-1">
      <div class="w-12 h-1.5 bg-gray-300 rounded"></div>
    </div>

    <!-- collapsed summary row -->
    <div id="summary-row" class="flex items-center px-4 space-x-4">
    <!-- thumbnail -->
    <img id="prod-thumb"
         class="w-16 h-16 rounded object-cover bg-gray-300 flex-shrink-0"/>
      <div class="flex-1">
        <p id="prod-name"  class="font-semibold leading-tight truncate">Chocolate milk</p>
        <p id="prod-brand" class="text-sm text-gray-500 truncate">Brand #3</p>
        <p id="prod-tags"  class="text-xs text-gray-400 truncate">#Peanuts  #Milk</p>
      </div>
    </div>

    <!-- expanded details -->
    <div id="details" class="px-4 pt-4 space-y-4">
      <h3 class="font-semibold">Allergens</h3>
      <ul id="allergens-list" class="divide-y divide-gray-200"></ul>
    </div>

    <!-- Alternatives section (UI-only) -->
    <div id="details" class="px-4 pt-4 space-y-4">
       <!-- header -->
    <div class="flex items-baseline justify-between mb-3">
      <h3 class="font-semibold">Alternatives</h3>
      <button class="text-sm text-blue-600 whitespace-nowrap">See all</button>
    </div>

    <!-- horizontal rail -->
    <ul id="alt-list"
        class="flex overflow-x-auto pb-2
               space-x-8          /* 32 px gaps (roomier) */
               snap-x snap-mandatory
               scrollbar-hide">   <!-- hide iOS/Chrome scrollbar -->

        <!-- card 1 (placeholder) -->
        <li class="flex-shrink-0 snap-start w-56"> <!-- ~256 px card -->
          <div class="flex space-x-4">
            <div class="w-20 h-20 bg-gray-300 rounded flex-shrink-0"></div>
            <div class="flex flex-col justify-center min-w-0">
              <p class="font-medium truncate">Product #1</p>
              <p class="text-xs text-gray-500 truncate">Brand #1</p>
              <p class="text-xs text-gray-400 truncate">#Sesame</p>
            </div>
          </div>
        </li>

        <!-- card 2 (placeholder) -->
        <li class="flex-shrink-0 snap-start w-56">
          <div class="flex space-x-4">
            <div class="w-20 h-20 bg-gray-300 rounded flex-shrink-0"></div>
            <div class="flex flex-col justify-center min-w-0">
              <p class="font-medium truncate">Product #2</p>
              <p class="text-xs text-gray-500 truncate">Brand #2</p>
              <p class="text-xs text-gray-400 truncate">#Peanuts</p>
            </div>
          </div>
        </li>

    <!-- add more <li> cards or let JS inject them later -->
    </ul>
    </div>
  </div>

  <!-- bottom navigation -->
  <nav class="h-16 bg-white flex justify-around items-center text-black">
    <a href="home_page.html" class="flex flex-col items-center text-gray-500">
      <img src="icons/history-outlined.png" alt="home" class="w-6 h-6 mb-1 object-contain" />
      <span class="text-xs">Home</span>
    </a>
    <button class="flex flex-col items-center text-blue-600 scan-nav">
      <img src="icons/scan-outlined.png" alt="scan" class="w-6 h-6 mb-1 object-contain" />
      <span class="text-xs">Scan</span>
    </button>
    <button class="flex flex-col items-center text-gray-500">
      <img src="icons/profile-outlined.png" alt="profile" class="w-6 h-6 mb-1 object-contain" />
      <span class="text-xs">Profile</span>
    </button>
  </nav>

  <script src="https://unpkg.com/@zxing/library@latest/umd/index.min.js"></script>
  <script src="scan.js"></script>
</body>
</html>

```

# frontend\scan.js

```js
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

```

# README.md

```md
# 2800-202510-DTC11

```


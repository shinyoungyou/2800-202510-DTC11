# .gitignore

```
node_modules/

```

# .vscode\settings.json

```json
{
  "liveServer.settings.port": 5501
}

```

# backend\.gitignore

```
/node_modules
package-lock.json
.env
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
    "@google/generative-ai": "^0.24.1",
    "@zxing/library": "^0.21.3",
    "cors": "^2.8.5",
    "dotenv": "^16.5.0",
    "express": "^5.1.0",
    "mongoose": "^8.14.1",
    "node-fetch": "^2.7.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.10"
  }
}

```

# backend\product.js

```js
// backend/product.js
const express = require("express");
const fetch = require("node-fetch");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const EU14 = [
    "celery",
    "crustaceans",
    "eggs",
    "fish",
    "gluten",
    "lupin",
    "milk",
    "molluscs",
    "mustard",
    "nuts",
    "peanuts",
    "sesameseeds",
    "soybeans",
    "sulphites",
];

const CANON = {
  "sulphur-dioxide-and-sulphites": "sulphites",
  "sesame-seeds": "sesameseeds",
  "sesame": "sesameseeds",
};
const canon = (a) => CANON[a] || a;

function cloneNutriments(nutriments) {
    for (const k of Object.keys(nutriments)) {
        const m = k.match(/^(.+)_100g$/);
        if (!m) continue;
        const original = m[1];
        const canonical = canon(original);
        if (canonical !== original) {
            const newKey = `${canonical}_100g`;
            if (!(newKey in nutriments)) {
                nutriments[newKey] = nutriments[k];
            }
        }
    }
    return nutriments;
}

function safeJsonArray(text = "[]") {
    let t = text.trim();
    if (t.startsWith("\`\`\`")) {
        t = t.replace(/^\`\`\`[a-z]*\n?/i, "").replace(/\`\`\`$/i, "");
    }
    const match = t.match(/\[[\s\S]*]/);
    if (!match) return [];
    try {
        return JSON.parse(match[0]);
    } catch (e) {
        console.warn("[Gemini] parse fallback:", e.message);
        return [];
    }
}

router.get("/:barcode", async (req, res) => {
    try {
        const { barcode } = req.params;

        /* 1) OpenFoodFacts ------------------------------------------------------------------ */
        const offRes = await fetch(
            `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
        ).then((r) => r.json());

        if (offRes.status !== 1) {
            return res.status(404).json({ error: "Product not found" });
        }
        const prod = offRes.product;
        cloneNutriments(prod.nutriments || {});
        const offAllergens = (prod.allergens_tags || [])
          .map((t) => canon(t.split(":")[1]));

        /* 2) AI 추출 (필요할 때만) ----------------------------------------------------------- */
        const ingredientsText = prod.ingredients_text || "";
        let aiAllergens = [];

        if (ingredientsText && offAllergens.length < EU14.length) {
            console.log(
                `[${barcode}] AI call ▶ missing ≈ ${
                    EU14.length - offAllergens.length
                }`
            );

            const prompt = `
                You are an allergen-extraction assistant for a grocery-scanner app.

                Task:
                1. Read the full context (product name, brand, ingredient list, advisory lines).
                2. Decide which of **exactly these 14 EU allergens** are plausibly present or may be present:
                   [${EU14.join(", ")}]
                   • Treat phrases like “contains X”, “may contain X”, “traces of X”, “processed in a facility with X”
                     as positive evidence.
                   • Ignore phrases like “free from X”, “no X”, “does not contain X”.

                Output:
                - Return ONLY a raw JSON array of the allergen names, lowercase, no markdown, no keys.
                - Return [] if none.

                Example:
                Input → "Brand: ChocoJoy / Product: Dark Chocolate Bar
                          Ingredients: cocoa mass, sugar, cocoa butter, emulsifier (soy lecithin). May contain milk."
                Answer → ["soybeans","milk"]

                Now analyse this product:
                Brand: ${prod.brands || "Unknown"}
                Product: ${prod.product_name || "Unknown"}
                Ingredients & advisory:
                """${ingredientsText}"""
                `;

                console.log(prompt);
                

            const geminiRes = await genAI
                .getGenerativeModel({ model: "gemini-2.0-flash" })
                .generateContent(prompt, {
                    temperature: 0.2,
                    maxOutputTokens: 32,
                });

            try {
                const raw = geminiRes?.response?.text() || "[]";
                console.log(`[${barcode}] AI raw →`, raw);
                aiAllergens = safeJsonArray(raw).map(canon);
                console.log(`[${barcode}] AI parsed →`, aiAllergens);
            } catch (e) {
                console.warn("[Gemini] JSON parse error", e.message);
            }
        }

        const merged = [...new Set([...offAllergens, ...aiAllergens])];

        const allergens = merged.map((name) => ({
          name,
          source: offAllergens.includes(name) ? "off"
                 : aiAllergens.includes(name) ? "ai"
                 : "off",
        }));

        const addedByAI = allergens
            .filter((a) => a.source === "ai")
            .map((a) => a.name);
        console.log(`[${barcode}] FINAL →`, merged, "| AI added:", addedByAI);

        /* 4) 응답 --------------------------------------------------------------------------- */
        res.json({
            barcode,
            productName: prod.product_name || "",
            brand: (prod.brands || "").split(",")[0],
            thumbUrl:
                prod.image_thumb_url ||
                prod.image_front_thumb_url ||
                prod.image_front_small_url ||
                prod.image_front_url ||
                "",
            allergens,
            nutriments: prod.nutriments || {},
            ingredients: prod.ingredients || [],
            ingredientsText,
        });
    } catch (err) {
        console.error("[GET /product/:barcode]", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;

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
    app.use("/product", require("./product"));

    // Start HTTP server
    app.listen(PORT, () => {
        console.log(`[Express] listening on http://localhost:${PORT}`);
    });
}

main();

```

# backend\testGemini.js

```js
// test script
require("dotenv").config();
const fetch = require("node-fetch");

async function pingGemini() {
    const endpoint =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

    const payload = {
        contents: [{ parts: [{ text: "ping" }] }],
        generationConfig: { temperature: 0 },
    };

    const url = `${endpoint}?key=${process.env.GEMINI_API_KEY}`;
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const json = await res.json();

        if (!res.ok) {
            throw new Error(
                `${res.status} ${res.statusText}\n${JSON.stringify(
                    json,
                    null,
                    2
                )}`
            );
        }
        const reply = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
        console.log("[Gemini ping] OK →", reply.slice(0, 60), "…");
    } catch (err) {
        console.error("[Gemini ping] ERROR:", err.message);
        process.exitCode = 1;
    }
}

pingGemini();

```

# frontend\alternative-details.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <link rel="stylesheet" href="/style.css" />
  </head>
  <body>
    <div class="flex-container">
      <div class="header">
        <div class="back-button-section">
          <img
            src="/images/back-button.svg"
            alt="Back to previous button"
            class="back-button"
          />
        </div>
        <div class="menu-button-section">
          <img
            src="/images/menu-button.svg"
            alt="Menu icon"
            class="menu-button"
          />
        </div>
        <h1 class="title" id="title">Alternatives</h1>
      </div>

      <div class="section">
        <div class="card-product-details">
          <div class="product-image-details">
            <img src="#" alt="product #1 image" />
          </div>
          <div class="product-info-details">
            <h2>Product #1</h2>
            <p>brand</p>
            <p>#sesame</p>
          </div>
        </div>

        <div class="ingredients">
          <h2>Ingredients</h2>
          <p>
            Lorem ipsum dolor sit amet consectetur, adipisicing elit. Voluptates
            necessitatibus similique quos magni doloremque reiciendis,
            voluptatem laborum ipsum pariatur numquam consectetur aliquid a amet
            accusamus. Error incidunt architecto eligendi repellendus.
          </p>
        </div>
      </div>

      <h2 class="allergen-title">Possible Allergens</h2>
      <div class="allergens">
        <img src="#" alt="icon of allergen" class="allergen-icon" />
        <p>Eggs</p>
      </div>
    </div>

    <div class="navbar">
      <div class="home-button-section">
        <img
          src="/images/home-button.svg"
          alt="Home button"
          class="home-button"
        />
      </div>
      <div class="scan-button-section">
        <img
          src="/images/scanner-button.svg"
          alt="Scan button"
          class="scan-button"
        />
      </div>
      <div class="profile-button-section">
        <img
          src="/images/profile-button.svg"
          alt="Profile button"
          class="profile-button"
        />
      </div>
    </div>
  </body>
</html>

```

# frontend\history.js

```js
console.log('▶ history.js loaded');

/* ---------- DOM elements ---------- */
const historyList = document.getElementById("history-list");
const trashIcon = document.getElementById("trash-icon");
let checkboxesVisible = false;

// Load scanned products (for history page)
document.addEventListener("DOMContentLoaded", () => {
    if (historyList) {
        loadScannedProducts();
    }
});

trashIcon.addEventListener("click", toggleCheckboxes);

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
        item.setAttribute("data-barcode", product.barcode);

        item.innerHTML = `
            <div class="flex items-center">
                <input type="checkbox" class="delete-checkbox hidden mr-3 w-4 h-4" />
                <img src="${product.thumbUrl || 'icons/allergen-placeholder.svg'}" 
                    class="w-16 h-16 rounded object-cover bg-gray-300 flex-shrink-0" />
            </div>
            <div class="flex-1">
                <p class="font-semibold leading-tight truncate">${product.productName || "Unknown Product"}</p>
                <p class="text-sm text-gray-500 truncate">${product.brand || "Unknown Brand"}</p>
                <p class="text-xs text-gray-400 truncate">${product.allergens.map(a => `#${a}`).join(" ")}</p>
            </div>
        `;
        historyList.appendChild(item);
    });
}

function toggleCheckboxes() {
    const checkboxes = document.querySelectorAll(".delete-checkbox");
    checkboxesVisible = !checkboxesVisible;

    checkboxes.forEach(checkbox => {
        checkbox.classList.toggle("hidden", !checkboxesVisible)
    })

    if (checkboxesVisible) {
        // Create a red delete button with white text
        trashIcon.innerHTML = `
            <button id="delete-button" 
                    class="bg-red-500 text-white px-2 py-1 rounded-md text-sm hover:bg-red-600 transition">
                Delete
            </button>
        `;

        // Attach click event to the delete button
        document.getElementById("delete-button").onclick = deleteSelectedItems;
    } else {
        trashIcon.innerHTML = '';
        trashIcon.appendChild(createTrashIcon());
    }
}

// Delete selected items
function deleteSelectedItems() {
    const checkboxes = document.querySelectorAll(".delete-checkbox");
    let savedProducts = JSON.parse(localStorage.getItem("scannedProducts")) || [];

    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            const productElement = checkbox.closest("div[data-barcode]");
            const barcode = productElement.getAttribute("data-barcode")
            
            // Remove product from localStorage
            savedProducts = savedProducts.filter(product => product.barcode !== barcode);
            
            // Remove product from DOM
            productElement.remove();
        }
    })

    // Update localStorage
    localStorage.setItem("scannedProducts", JSON.stringify(savedProducts));

    // Reset the icon back to trash
    toggleCheckboxes();

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
    <i id="trash-icon" class="fas fa-trash-alt absolute right-10 text-xl"></i>
    <h1 class="font-bold text-3xl mt-10">History</h1>

    <div id = "history-list" class="mt-5 space-y-4"></div>

    <nav class="fixed bottom-0 left-0 right-0 h-16 bg-white flex justify-around items-center text-black">
        <a href="home_page.html" class="flex flex-col items-center text-gray-500">
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

# frontend\index.html

```html
<html>
  <head>
    <link rel="stylesheet" href="/style.css" />
  </head>
  <body>
    <div class="flex-container">
      <div class="header">
        <div class="back-button-section">
          <img
            src="/images/back-button.svg"
            alt="Back to previous button"
            class="back-button"
          />
        </div>
        <div class="menu-button-section">
          <img
            src="/images/menu-button.svg"
            alt="Menu icon"
            class="menu-button"
          />
        </div>
        <h1 class="title" id="title">Alternatives</h1>
      </div>

      <div class="section">
        <div class="card">
          <div class="product-image">
            <img src="#" alt="product #1 image" />
          </div>
          <div class="product-info">
            <h2>Product #1</h2>
            <p>brand</p>
            <p>#sesame</p>
          </div>
        </div>

        <div class="card">
          <div class="product-image">
            <img src="#" alt="product #1 image" />
          </div>
          <div class="product-info">
            <h2>Product #2</h2>
            <p>brand</p>
            <p>#sesame</p>
          </div>
        </div>

        <div class="card">
          <div class="product-image">
            <img src="#" alt="product #1 image" />
          </div>
          <div class="product-info">
            <h2>Product #3</h2>
            <p>brand</p>
            <p>#sesame</p>
          </div>
        </div>

        <div class="card">
          <div class="product-image">
            <img src="#" alt="product #1 image" />
          </div>
          <div class="product-info">
            <h2>Product #4</h2>
            <p>brand</p>
            <p>#sesame</p>
          </div>
        </div>

        <div class="card">
          <div class="product-image">
            <img src="#" alt="product #1 image" />
          </div>
          <div class="product-info">
            <h2>Product #4</h2>
            <p>brand</p>
            <p>#sesame</p>
          </div>
        </div>

        <div class="card">
          <div class="product-image">
            <img src="#" alt="product #1 image" />
          </div>
          <div class="product-info">
            <h2>Product #4</h2>
            <p>brand</p>
            <p>#sesame</p>
          </div>
        </div>

        <div class="card">
          <div class="product-image">
            <img src="#" alt="product #1 image" />
          </div>
          <div class="product-info">
            <h2>Product #4</h2>
            <p>brand</p>
            <p>#sesame</p>
          </div>
        </div>

        <div class="card">
          <div class="product-image">
            <img src="#" alt="product #1 image" />
          </div>
          <div class="product-info">
            <h2>Product #4</h2>
            <p>brand</p>
            <p>#sesame</p>
          </div>
        </div>
      </div>

      <div class="navbar">
        <div class="home-button-section">
          <img
            src="/images/home-button.svg"
            alt="Home button"
            class="home-button"
          />
        </div>
        <div class="scan-button-section">
          <img
            src="/images/scanner-button.svg"
            alt="Scan button"
            class="scan-button"
          />
        </div>
        <div class="profile-button-section">
          <img
            src="/images/profile-button.svg"
            alt="Profile button"
            class="profile-button"
          />
        </div>
      </div>

      <!-- <div class="content"></div> -->
    </div>
  </body>
  <script src="app.js"></script>
</html>

```

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
<script src="scan.js"></script>
<script src="history.js"></script>
</html>
```

# frontend\product.js

```js

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
  <style>.allergen-ai span{color:#ca8a04;font-weight:500}</style>
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
  <script src="history.js"></script>
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
    const res = await fetch(`http://localhost:3000/product/${barcode}`);
    if (!res.ok) throw new Error(res.statusText);
    return await res.json();
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

/* ---------- scan loop ---------- */
async function scanLoop() {
    console.log("🔄 scanning…");
    try {
        const result = await codeReader.decodeOnceFromVideoDevice(
            undefined,
            video
        );

        console.log("✅ Detected:", result.getText());
        const points = result.getResultPoints(); // [{x,y}, …]
        const xs = points.map((p) => p.x);
        const ys = points.map((p) => p.y);
        const x = Math.min(...xs),
            y = Math.min(...ys),
            width = Math.max(...xs) - x,
            height = Math.max(...ys) - y;

        drawBox({ x, y, width, height });

        await handleCode(result.getText());

        setTimeout(scanLoop, 2000);
    } catch (err) {
        console.log("❌ no code yet, retrying…");
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
        console.log(product);
        
        const nutr = product.nutriments || {};
        // choose the smallest available photo, fall back to any front image,
        // or keep the placeholder if nothing exists.

        prodThumbEl.src = product.thumbUrl;


        const allergens = product.allergens; // [{name,source}]

        /* --- Build lookup { allergen → % estimate or null } --- */
        const percentByAllergen = Object.fromEntries(
            allergens.map(({ name }) => [name, null])  // name 필드만 키로
        );

        if (Array.isArray(product.ingredients)) {
            product.ingredients.forEach((ing) => {
                const id = norm(ing.id || "");
                const text = norm(ing.text || "");

                allergens.forEach(({ name }) => {
                    const words = allergenMap[name] || [name];
                    const hit = words.some(
                        (w) => id.includes(w) || text.includes(w)
                    );
                    if (hit && ing.percent_estimate && ing.percent_estimate > 0) {
                        percentByAllergen[name] = Math.max(
                            percentByAllergen[name] ?? 0,
                            ing.percent_estimate
                        );
                    }
                });
            });
        }

        /* summary */
        prodNameEl.textContent = product.productName || "Unknown product";
        prodBrandEl.textContent = product.brand || "Unknown";
        prodTagsEl.textContent = allergens
            .map(({ name }) => `#${name}`)
            .join(" ");

        /* allergen list */
        allergensListEl.innerHTML = "";
        allergens.forEach(({ name, source }) => {
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
                          <span class="${
                              source === "ai"
                                  ? "text-yellow-600 font-medium"
                                  : ""
                          }">
                          ${name}${source === "ai" ? "*" : ""}
                        </span>
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
            productName: product.productName || "",
            brand: product.brand || "",
            allergens: allergens.map(({ name }) => name),
            allergenPercents: percentByAllergen,
            thumbUrl: product.thumbUrl,
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

# images\back-button.svg

This is a file of the type: SVG Image

# images\home-button.svg

This is a file of the type: SVG Image

# images\menu-button.svg

This is a file of the type: SVG Image

# images\profile-button.svg

This is a file of the type: SVG Image

# images\scanner-button.svg

This is a file of the type: SVG Image

# README.md

```md
# 2800-202510-DTC11

```

# style.css

```css
body {
  font-family: Calibri, "Segoe UI", Arial, sans-serif;
  height: 100%;
  margin: 0;
}

h1 {
  text-align: center;
}

.flex-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  /* justify-content: space-between; */
}

.header {
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  margin-top: 3rem;
  height: 15%;
}

.back-button-section {
  width: 50%;
  font-size: 5rem;
}

.back-button {
  width: 5rem;
  display: flex;
  /* margin: 5rem; */
  margin: 0rem 5rem 0rem 5rem;
}

.menu-button-section {
  width: 50%;
  display: flex;
  justify-content: end;
}

.menu-button {
  width: 5rem;
  display: flex;
  margin: 0rem 5rem 0rem 5rem;
}

.title {
  width: 100%;
  font-size: 5rem;
}

.section {
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  /* height: 100%; */
  padding-bottom: 100px;
}

.card {
  display: flex;
  width: 50%;
  justify-content: center;
  margin-bottom: 5rem;
  margin-top: 5rem;
  border-bottom: 1px solid black;
  padding-bottom: 8rem;
}

.product-image {
  width: 40%;
  /* height: 100%; */
  background-color: grey;
  margin-right: 2rem;
}

.navbar {
  display: flex;
  width: 100%;
  background-color: rgba(210, 210, 210, 0.341);
  justify-content: space-around;
  height: 10rem;
  align-self: end;
  height: 10%;
  position: fixed;
  bottom: 0;
  opacity: 1;
}

.home-button-section {
  align-self: center;
}

.home-button {
  height: 6rem;
  border: 3px solid black;
  border-radius: 10%;
}

.scan-button-section {
  align-self: center;
}

.scan-button {
  height: 6rem;
  border: 3px solid black;
  border-radius: 10%;
}

.profile-button-section {
  align-self: center;
}

.profile-button {
  height: 6rem;
  border: 3px solid black;
  border-radius: 10%;
}

.card-product-details {
  display: flex;
  width: 100%;
  margin: 2rem;
}

.product-image-details {
  width: 40%;
  /* height: 100%; */
  background-color: grey;
  margin-right: 2rem;
}

.product-info-details {
  font-size: 2rem;
}

.ingredients {
  width: 100%;
  margin: 2rem;
}

.allergen-title {
  width: 100%;
  margin-left: 2rem;
  margin-bottom: 0rem;
}

.allergens {
  display: flex;
  width: 100%;
  margin: 2rem;
  border-top: 1px solid black;
  border-bottom: 1px solid black;
  align-items: center;
}

.allergen-icon {
  margin-right: 1rem;
}

/* .content {
    margin: 0 auto;
    width: 800px;
    text-align: center;
  } */

```


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

# backend\alternatives.js

```js
const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();
const SEARCH_FIELDS =
    "code,product_name,brands,image_front_small_url,allergens_tags";
const INGREDIENT_SEARCH_LIMIT = 8;
const CATEGORY_SEARCH_LIMIT = 8;
function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((resolve) => setTimeout(() => resolve([]), ms)),
    ]);
}
async function searchByIngredient(term) {
    const url =
        "https://world.openfoodfacts.org/cgi/search.pl" +
        "?search_terms=" +
        encodeURIComponent(term) +
        "&search_simple=1&action=process&json=1" +
        "&fields=" +
        SEARCH_FIELDS +
        "&page_size=" +
        INGREDIENT_SEARCH_LIMIT;
    const res = await fetch(url).then((r) => r.json());
    return res.products || [];
}
async function searchByCategory(catTag) {
    const slug = catTag.includes(":") ? catTag.split(":")[1] : catTag;
    const url =
        "https://world.openfoodfacts.org/category/" +
        encodeURIComponent(slug) +
        ".json" +
        "?fields=" +
        SEARCH_FIELDS +
        "&page_size=" +
        CATEGORY_SEARCH_LIMIT;
    const res = await fetch(url).then((r) => r.json());
    return res.products || [];
}
router.get("/:barcode", async (req, res) => {
    try {
        const barcode = req.params.barcode;
        const limit = parseInt(req.query.limit) || 2;
        const offRes = await fetch(
            "https://world.openfoodfacts.org/api/v0/product/" +
                barcode +
                ".json"
        ).then((r) => r.json());
        if (offRes.status !== 1) {
            return res.json([]);
        }
        const prod = offRes.product;
        const coreIngs = (prod.ingredients || [])
            .sort(
                (a, b) => (b.percent_estimate || 0) - (a.percent_estimate || 0)
            )
            .slice(0, 2)
            .map((i) =>
                (i.text || i.id || "").toLowerCase().replace(/[^a-z]/g, "")
            )
            .filter(Boolean);
        const catTag =
            (prod.categories_tags && prod.categories_tags[0]) ||
            (prod.categories_hierarchy && prod.categories_hierarchy[0]) ||
            null;
        const searches = coreIngs.map((term) =>
            withTimeout(searchByIngredient(term), 9000)
        );
        if (catTag) {
            searches.push(withTimeout(searchByCategory(catTag), 9000));
        }
        const results = await Promise.all(searches);
        const all = results.flat();
        const unique = {};
        all.forEach((p) => {
            if (p.code && p.code !== barcode) {
                unique[p.code] = p;
            }
        });
        const list = Object.values(unique)
            .map((p) => ({
                barcode: p.code,
                productName: p.product_name || "",
                brand: p.brands ? p.brands.split(",")[0] : "",
                thumbUrl: p.image_front_small_url || "",
                allergens: (p.allergens_tags || []).map(
                    (t) => t.split(":")[1] || ""
                ),
            }))
            .sort((a, b) => a.allergens.length - b.allergens.length)
            .slice(0, limit);
        res.json(list);
    } catch {
        res.status(500).json([]);
    }
});
module.exports = router;

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
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const scanSchema = new mongoose.Schema(
    {
        barcode: { type: String, required: true },
        productName: String,
        brand: String,
        allergens: [String],
        allergenPercents: { type: Map, of: Number },
        thumbUrl: String,
        processedData: mongoose.Schema.Types.Mixed,
        alternatives: [
            {
                barcode: String,
                productName: String,
                brand: String,
                thumbUrl: String,
                allergens: [String],
            },
        ],
    },
    { timestamps: true }
);
const Scan = mongoose.model("Scan", scanSchema);
router.post("/", async (req, res) => {
    try {
        const scan = await Scan.create(req.body);
        res.status(201).json(scan);
    } catch (err) {
        res.status(400).json({ error: "Failed to save scan data" });
    }
});
router.get("/", async (_req, res) => {
    try {
        const scans = await Scan.find().sort({ createdAt: -1 }).limit(50);
        res.json(scans);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch scans" });
    }
});
router.get("/:id", async (req, res) => {
    try {
        const scan = await Scan.findById(req.params.id);
        if (!scan) return res.status(404).json({ error: "Not found" });
        res.json(scan);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch scan" });
    }
});
router.patch("/:id/alternatives", async (req, res) => {
    try {
        const { alternatives } = req.body;
        const scan = await Scan.findByIdAndUpdate(
            req.params.id,
            { alternatives },
            { new: true }
        );
        if (!scan) return res.status(404).json({ error: "Not found" });
        res.json(scan);
    } catch (err) {
        res.status(400).json({ error: "Failed to update alternatives" });
    }
});
router.delete("/:id", async (req, res) => {
    try {
        await Scan.findByIdAndDelete(req.params.id);
        res.status(204).end();
    } catch (err) {
        res.status(500).json({ error: "Failed to delete scan" });
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
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/scanapp";
async function main() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log(`MongoDB connected to ${MONGO_URI}`);
    } catch (err) {
        console.error("MongoDB connection error", err.message);
        process.exit(1);
    }
    const app = express();
    app.use(cors());
    app.use(express.json());
    app.get("/", (req, res) => {
        res.send("Scanner backend running");
    });
    app.use("/scan", require("./scan"));
    app.use("/product", require("./product"));
    app.use("/alternatives", require("./alternatives"));
    app.listen(PORT, () => {
        console.log(`Express listening on http://localhost:${PORT}`);
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

# frontend\alternatives_detail.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Alternatives</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"/>
</head>
<body class="bg-white flex flex-col h-screen text-black pb-16">
  <div class="flex items-center justify-between px-4 py-2">
    <button id="back-btn" class="text-2xl"><</button>
  </div>
  <h1 class="text-center font-bold text-xl mt-4">Alternatives</h1>
  <div class="px-4 flex items-start space-x-4 pt-10">
    <img id="alt-detail-thumb" class="w-24 h-24 rounded object-cover bg-gray-200 flex-shrink-0"/>
    <div class="flex-1 space-y-1">
      <h2 id="alt-detail-name" class="font-bold text-lg truncate"></h2>
      <p id="alt-detail-brand" class="text-gray-500 truncate"></p>
      <p id="alt-detail-tags" class="text-xs text-gray-400 truncate"></p>
    </div>
  </div>
  <div class="px-4 pt-6">
    <h3 class="font-semibold">Ingredients:</h3>
    <p id="ingredients-text" class="text-sm mt-1"></p>
  </div>
  <div class="px-4 pt-6 flex-1 overflow-y-auto">
    <h3 class="font-semibold">Possible Allergens</h3>
    <hr class="my-2"/>
    <ul id="allergens-list" class="divide-y divide-gray-200"></ul>
  </div>
  <div id="navbar-container"></div>
  <script src="alternatives_detail.js"></script>
  <script src="navbar.js"></script>
</body>
</html>

```

# frontend\alternatives_detail.js

```js
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
    const res = await fetch(`http://localhost:3000/product/${barcode}`);
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

```

# frontend\alternatives.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Alternatives</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"/>
</head>
<body class="p-4 pb-16 h-screen flex flex-col bg-white text-black">
  <div class="flex items-center justify-between mb-4">
    <button id="back-btn" class="text-2xl"><</button>
    <h1 class="text-xl font-bold">Alternatives</h1>
  </div>
  <div id="alts-list" class="flex-1 overflow-y-auto divide-y divide-gray-200"></div>
  <div id="navbar-container"></div>
  <script src="alternatives.js"></script>
  <script src="navbar.js"></script>
</body>
</html>

```

# frontend\alternatives.js

```js
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
                window.location.href = `alternatives_detail.html?barcode=${p.barcode}`;
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

```

# frontend\detail.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Detail</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-white flex flex-col h-screen text-black pb-16">
  <div class="flex items-center justify-between px-4 py-2">
    <button id="back-btn" class="text-2xl"><</button>
    <button id="delete-btn" class="fas fa-trash-alt text-xl"></button>
  </div>
  <div class="px-4 flex items-center space-x-4">
    <img id="detail-thumb" class="w-16 h-16 rounded object-cover bg-gray-200 flex-shrink-0"/>
    <div class="flex-1 space-y-1">
      <h2 id="detail-name" class="font-bold text-lg leading-tight truncate"></h2>
      <p id="detail-brand" class="text-gray-500 truncate"></p>
      <p id="detail-tags" class="text-xs text-gray-400 truncate"></p>
    </div>
  </div>
  <div class="px-4 pt-6">
    <h3 class="font-semibold">Allergens</h3>
    <ul id="detail-list" class="divide-y divide-gray-200 mt-2"></ul>
  </div>
  <div class="px-4 pt-6">
    <div class="flex items-baseline justify-between mb-3">
      <h3 class="font-semibold">Alternatives</h3>
      <button id="see-all" class="text-sm text-blue-600 whitespace-nowrap">See all</button>
    </div>
    <ul id="alt-list" class="flex overflow-x-auto pb-2 space-x-8 snap-x snap-mandatory scrollbar-hide"></ul>
  </div>
  <div id="navbar-container"></div>
  <script src="detail.js"></script>
  <script src="navbar.js"></script>
</body>
</html>

```

# frontend\detail.js

```js
const API_BASE = "http://localhost:3000/scan";
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
            `http://localhost:3000/product/${barcodeParam}`
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

```

# frontend\history.js

```js
const historyList = document.getElementById("history-list");
const clearBtn = document.getElementById("clear-btn");
let selectionMode = false;
let selectedSet = new Set();
const API_BASE = "http://localhost:3000/scan";

document.addEventListener("DOMContentLoaded", () => {
    clearBtn.addEventListener("click", onClearClick);
    loadScannedProducts();
});

async function onClearClick() {
    if (!selectionMode) {
        selectionMode = true;
        clearBtn.classList.replace("fa-trash-alt", "fa-check");
        clearBtn.classList.add("text-red-500");
        loadScannedProducts();
    } else {
        const ids = Array.from(selectedSet);
        await Promise.all(
            ids.map((id) => fetch(`${API_BASE}/${id}`, { method: "DELETE" }))
        );
        selectionMode = false;
        selectedSet.clear();
        clearBtn.classList.replace("fa-check", "fa-trash-alt");
        clearBtn.classList.remove("text-red-500");
        loadScannedProducts();
    }
}

async function loadScannedProducts() {
    historyList.innerHTML = "";
    const res = await fetch(API_BASE);
    const savedProducts = await res.json();
    if (savedProducts.length === 0) {
        historyList.innerHTML = `<p class="text-gray-500">No scanned products yet.</p>`;
        return;
    }

    savedProducts
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .forEach((product) => {
            const thumb = product.thumbUrl || "icons/allergen-placeholder.svg";
            const datetime = new Date(product.createdAt).toLocaleString();
            const aiSummary = product.processedData?.summary;
            const aiLine = aiSummary
                ? `<p class="text-xs text-gray-500 truncate">${aiSummary}</p>`
                : "";
            const item = document.createElement("div");
            item.className =
                "flex items-center justify-between py-4 cursor-pointer";
            item.dataset.id = product._id;
            item.addEventListener("click", () => {
                if (selectionMode) {
                    if (selectedSet.has(product._id)) {
                        selectedSet.delete(product._id);
                        item.classList.remove("bg-gray-200");
                    } else {
                        selectedSet.add(product._id);
                        item.classList.add("bg-gray-200");
                    }
                } else {
                    window.location.href = `detail.html?id=${product._id}`;
                }
            });

            const leftContent = document.createElement("div");
            leftContent.className = "flex items-center space-x-4 flex-1";

            if (selectionMode) {
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.checked = selectedSet.has(product._id);
                checkbox.className = "w-5 h-5 text-blue-600";
                checkbox.addEventListener("change", () => {
                    if (checkbox.checked) selectedSet.add(product._id);
                    else selectedSet.delete(product._id);
                });
                leftContent.appendChild(checkbox);
            }

            const img = document.createElement("img");
            img.src = thumb;
            img.className =
                "w-16 h-16 rounded object-cover bg-gray-300 flex-shrink-0";
            leftContent.appendChild(img);

            const info = document.createElement("div");
            info.className = "flex-1 space-y-1 overflow-hidden";
            info.innerHTML = `
      <p class="font-semibold leading-tight truncate">${
          product.productName || "Unknown Product"
      }</p>
      <p class="text-sm text-gray-500 truncate">${
          product.brand || "Unknown Brand"
      }</p>
      <p class="text-xs text-gray-400 truncate">${product.allergens
          .map((a) => `#${a}`)
          .join(" ")}</p>
      <p class="text-xs text-gray-400 truncate">${datetime}</p>
      ${aiLine}
    `;
            leftContent.appendChild(info);
            item.appendChild(leftContent);

            const arrow = document.createElement("span");
            arrow.className = "text-gray-400 ml-4 flex-shrink-0";
            arrow.textContent = ">";
            item.appendChild(arrow);

            historyList.appendChild(item);
        });
}

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
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>History</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="p-10 pb-4 h-screen flex flex-col">
  <i id="clear-btn" class="fas fa-trash-alt absolute right-10 text-xl"></i>
  <h1 class="font-bold text-3xl mt-10">History</h1>
  <div id="history-list" class="mt-5 flex-1 overflow-y-auto divide-y divide-gray-200"></div>
  <div id="navbar-container"></div>
  <script src="history.js"></script>
  <script src="navbar.js"></script>
</body>
</html>

```

# frontend\navbar.js

```js
document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname.split("/").pop();
    const isHome =
        path === "" ||
        path === "index.html" ||
        path === "detail.html" ||
        path === "alternatives_detail.html";
    const isScan = path === "scan.html";
    const isProfile = path === "profile.html";
    const c = document.getElementById("navbar-container");
    c.innerHTML = `
    <nav class="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex justify-around items-center text-black">
      <a href="index.html" class="flex flex-col items-center ${
          isHome ? "text-blue-600" : "text-gray-500"
      }">
        <img src="icons/history-outlined.png" alt="home" class="w-6 h-6 mb-1 object-contain"/>
        <span class="text-xs">Home</span>
      </a>
      <a href="scan.html" class="flex flex-col items-center ${
          isScan ? "text-blue-600" : "text-gray-500"
      }">
        <img src="icons/scan-outlined.png" alt="scan" class="w-6 h-6 mb-1 object-contain"/>
        <span class="text-xs">Scan</span>
      </a>
      <a href="profile.html" class="flex flex-col items-center ${
          isProfile ? "text-blue-600" : "text-gray-500"
      }">
        <img src="icons/profile-outlined.png" alt="profile" class="w-6 h-6 mb-1 object-contain"/>
        <span class="text-xs">Profile</span>
      </a>
    </nav>
  `;
});

```

# frontend\scan.html

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Scan page</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>.allergen-ai span{color:#ca8a04;font-weight:500}</style>
</head>
<body class="bg-black flex flex-col h-screen text-white pb-16">
  <div class="relative flex-1 overflow-hidden">
    <video id="video" autoplay playsinline class="w-full h-full object-cover"></video>
    <div class="absolute inset-0 pointer-events-none flex items-center justify-center">
      <div class="relative w-3/4 max-w-[22rem] aspect-square">
        <div class="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-white"></div>
        <div class="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-white"></div>
        <div class="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-white"></div>
        <div class="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-white"></div>
      </div>
      <div id="barcode-box" class="absolute border-2 border-green-400 hidden"></div>
    </div>
  </div>
  <div id="bottom-sheet" class="fixed bottom-16 left-0 right-0 bg-white text-black transition-all duration-300 h-24 overflow-hidden z-10">
    <div class="w-full flex justify-center py-1">
      <div class="w-12 h-1.5 bg-gray-300 rounded"></div>
    </div>
    <div id="summary-row" class="flex items-center px-4 space-x-4">
      <img id="prod-thumb" class="w-16 h-16 rounded object-cover bg-gray-300 flex-shrink-0"/>
      <div class="flex-1">
        <p id="prod-name" class="font-semibold leading-tight truncate">Chocolate milk</p>
        <p id="prod-brand" class="text-sm text-gray-500 truncate">Brand #3</p>
        <p id="prod-tags" class="text-xs text-gray-400 truncate">#Peanuts  #Milk</p>
      </div>
    </div>
    <div id="details" class="px-4 pt-4 space-y-4">
      <h3 class="font-semibold">Allergens</h3>
      <ul id="allergens-list" class="divide-y divide-gray-200"></ul>
    </div>
    <div class="px-4 pt-4 space-y-4">
      <div class="flex items-baseline justify-between mb-3">
        <h3 class="font-semibold">Alternatives</h3>
        <button id="see-all" class="text-sm text-blue-600 whitespace-nowrap">See all</button>
      </div>
      <ul id="alt-list" class="flex overflow-x-auto pb-2 space-x-8 snap-x snap-mandatory scrollbar-hide"></ul>
    </div>
  </div>
  <div id="navbar-container"></div>
  <script src="https://unpkg.com/@zxing/library@latest/umd/index.min.js"></script>
  <script src="scan.js"></script>
  <script src="navbar.js"></script>
</body>
</html>

```

# frontend\scan.js

```js
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
const altListEl = document.getElementById("alt-list");
const seeAllBtn = document.getElementById("see-all");
let currentBarcode = "";
let currentScanId = "";
document.addEventListener("DOMContentLoaded", () => {
    const scanButton = document.querySelector(".scan-nav");
    if (scanButton) {
        scanButton.addEventListener(
            "click",
            () => (window.location.href = "scan.html")
        );
    }
    if (seeAllBtn) {
        seeAllBtn.addEventListener("click", () => {
            if (currentBarcode) {
                window.location.href = `alternatives.html?barcode=${currentBarcode}`;
            }
        });
    }
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
async function fetchAlternatives(barcode, limit = 2) {
    try {
        const res = await fetch(
            `http://localhost:3000/alternatives/${barcode}?limit=${limit}`
        );
        if (!res.ok) throw new Error();
        return await res.json();
    } catch {
        return [];
    }
}
async function saveScanToDB(scanDoc) {
    const res = await fetch("http://localhost:3000/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scanDoc),
    });
    if (!res.ok) console.warn("Save responded with HTTP", res.status);
    else {
        const data = await res.json();
        return data;
    }
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
            li.innerHTML = `<div class="flex items-center space-x-2 flex-1"><img src="${iconSrc}" class="w-6 h-6"/><span>${name}</span></div><div><span>${right}</span></div>`;
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
        const saved = await saveScanToDB(scanDoc);
        currentScanId = saved._id;
        saveScanToLocal(saved);
        toggleSheet(true);
        currentBarcode = barcode;
        altListEl.innerHTML =
            "<p class='text-gray-500'>Loading alternatives...</p>";
        const alts = await fetchAlternatives(barcode, 2);
        altListEl.innerHTML = "";
        alts.forEach((p) => {
            const li = document.createElement("li");
            li.className = "flex-shrink-0 snap-start w-56 cursor-pointer";
            li.addEventListener("click", () => {
                window.location.href = `detail.html?barcode=${p.barcode}`;
            });
            li.innerHTML = `<div class="flex space-x-4"><img src="${
                p.thumbUrl
            }" class="w-20 h-20 rounded"/><div class="flex flex-col justify-center"><p class="truncate">${
                p.productName
            }</p><p class="text-xs truncate">${
                p.brand
            }</p><p class="text-xs truncate">${p.allergens
                .map((a) => `#${a}`)
                .join(" ")}</p></div></div>`;
            altListEl.appendChild(li);
        });
        if (currentScanId) {
            await fetch(
                `http://localhost:3000/scan/${currentScanId}/alternatives`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ alternatives: alts }),
                }
            );
        }
    } catch (err) {
        alert(`Failed to fetch product info:\n${err.message}`);
    }
}
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


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
    if (t.startsWith("```")) {
        t = t.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "");
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

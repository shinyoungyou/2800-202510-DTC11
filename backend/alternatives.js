const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();

const SEARCH_FIELDS =
    "code,product_name,brands,image_front_small_url,allergens_tags";
const INGREDIENT_SEARCH_LIMIT = 8;
const CATEGORY_SEARCH_LIMIT = 8;

const TAG_MAPPINGS = [
    { tag: "soup_mix", keywords: ["mix", "soup", "broth"] },
    { tag: "snack", keywords: ["snack", "chips", "cracker", "biscuit"] },
    {
        tag: "beverage",
        keywords: ["drink", "juice", "milk", "tea", "coffee", "beverage"],
    },
    { tag: "breakfast", keywords: ["cereal", "granola", "oats"] },
    {
        tag: "desserts",
        keywords: ["cake", "cookie", "dessert", "pudding", "sweet"],
    },
];

async function searchByIngredient(ing) {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
        ing
    )}&search_simple=1&action=process&json=1&fields=${SEARCH_FIELDS}&page_size=${INGREDIENT_SEARCH_LIMIT}`;
    console.log(url);
    const res = await fetch(url).then((r) => r.json());
    return res.products || [];
}

async function searchByCategory(cat) {
    const url = `https://world.openfoodfacts.org/category/${encodeURIComponent(
        cat
    )}.json?fields=${SEARCH_FIELDS}&page_size=${CATEGORY_SEARCH_LIMIT}`;
    console.log(url);
    
    const res = await fetch(url).then((r) => r.json());
    return res.products || [];
}

router.get("/:barcode", async (req, res) => {
    const limit = parseInt(req.query.limit) || 2;
    try {
        const barcode = req.params.barcode;
        const offRes = await fetch(
            `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
        ).then((r) => r.json());
        if (offRes.status !== 1) {
            return res.status(404).json([]);
        }
        const prod = offRes.product;
        const ingredients = prod.ingredients || [];
        const ingredientsSorted = ingredients.sort(
            (a, b) => (b.percent_estimate || 0) - (a.percent_estimate || 0)
        );
        const topIngredients = ingredientsSorted
            .slice(0, 2)
            .map((i) => i.text || i.id)
            .filter(Boolean);

        let candidates = [];
        for (const ing of topIngredients) {
            try {
                const byIng = await searchByIngredient(ing);
                candidates = candidates.concat(byIng);
            } catch {}
        }

        const nameText = (
            (prod.product_name || "") +
            " " +
            (prod.ingredients_text || "")
        ).toLowerCase();
        let mappedTag = null;
        for (const m of TAG_MAPPINGS) {
            if (m.keywords.some((k) => nameText.includes(k))) {
                mappedTag = m.tag;
                break;
            }
        }
        if (mappedTag) {
            try {
                const byCat = await searchByCategory(mappedTag);
                candidates = candidates.concat(byCat);
            } catch {}
        }

        const unique = {};
        candidates.forEach((p) => {
            if (p.code && p.code !== barcode) {
                unique[p.code] = p;
            }
        });

        const list = Object.values(unique).map((p) => ({
            barcode: p.code,
            productName: p.product_name || "",
            brand: p.brands ? p.brands.split(",")[0] : "",
            thumbUrl: p.image_front_small_url || "",
            allergens: (p.allergens_tags || []).map(
                (t) => t.split(":")[1] || ""
            ),
        }));

        list.sort((a, b) => a.allergens.length - b.allergens.length);

        res.json(list.slice(0, limit));
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;

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

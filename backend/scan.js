
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

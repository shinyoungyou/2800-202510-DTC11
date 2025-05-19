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
router.delete("/:id", async (req, res) => {
    try {
        await Scan.findByIdAndDelete(req.params.id);
        res.status(204).end();
    } catch (err) {
        res.status(500).json({ error: "Failed to delete scan" });
    }
});
module.exports = router;

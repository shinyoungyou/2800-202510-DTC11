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

# .gitignore

```
/node_modules
package-lock.json
```

# package.json

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

# scan.js

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

# server.js

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


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

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const session = require("express-session");
const path = require("path");
require("dotenv").config();
const authRouter = require("./auth");
const scanRouter = require("./scan");
const productRouter = require("./product");
const alternativesRouter = require("./alternatives");
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
    app.use(
        session({
            secret: "your-very-strong-secret-here",
            resave: false,
            saveUninitialized: false,
            cookie: { secure: false, sameSite: "lax" },
        })
    );
    app.use(express.static(path.join(__dirname, "../frontend")));
    app.use("/api/auth", authRouter);
    app.use("/scan", scanRouter);
    app.use("/product", productRouter);
    app.use("/alternatives", alternativesRouter);
    app.listen(PORT, () => {
        console.log(`Express listening on http://localhost:${PORT}`);
    });
}
main();

/* ---------- DOM elements ---------- */
const video = document.getElementById("video");
const barcodeBox = document.getElementById("barcode-box");
const prodNameEl = document.getElementById("prod-name");
const prodBrandEl = document.getElementById("prod-brand");
const prodTagsEl = document.getElementById("prod-tags");
const allergensListEl = document.getElementById("allergens-list");

/* ---------- camera ---------- */
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false,
        });
        video.srcObject = stream;
        await video.play();
    } catch (err) {
        console.error("Could not access camera:", err);
        alert("Unable to use the camera.");
    }
}

/* ---------- detector ---------- */
let detector = null;
if ("BarcodeDetector" in window) {
    detector = new BarcodeDetector({
        formats: ["ean_13", "ean_8", "code_128"],
    });
} else {
    alert("BarcodeDetector API is not supported in this browser.");
}

/* ---------- product API ---------- */
async function fetchProduct(barcode) {
    const res = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    );
    if (!res.ok) throw new Error(res.statusText);
    const json = await res.json();
    if (json.status !== 1) throw new Error("Product not found.");
    return json.product;
}

/* ---------- scan loop ---------- */
async function scanLoop() {
    if (!detector) return;

    try {
        const barcodes = await detector.detect(video);
        if (barcodes.length) {
            const { rawValue, boundingBox } = barcodes[0];
            drawBox(boundingBox);
            await handleCode(rawValue);
            setTimeout(() => requestAnimationFrame(scanLoop), 2000);
            return;
        } else {
            barcodeBox.classList.add("hidden");
        }
    } catch (err) {
        console.error(err);
    }
    requestAnimationFrame(scanLoop);
}

/* ---------- bounding box ---------- */
function drawBox({ x, y, width, height }) {
    barcodeBox.style.cssText = `left:${x}px; top:${y}px; width:${width}px; height:${height}px;`;
    barcodeBox.classList.remove("hidden");
}

/* ---------- handle barcode ---------- */
async function handleCode(barcode) {
    try {
        prodNameEl.textContent = "Loading…";
        prodBrandEl.textContent = "";
        prodTagsEl.textContent = "";

        const product = await fetchProduct(barcode);
        const allergens =
            Array.isArray(product.allergens_tags) &&
            product.allergens_tags.length
                ? product.allergens_tags.map((t) => t.split(":")[1])
                : [];

        prodNameEl.textContent = product.product_name || "Unknown product";
        prodBrandEl.textContent = (product.brands || "Unknown").split(",")[0];
        prodTagsEl.textContent = allergens.map((a) => `#${a}`).join(" ");

        allergensListEl.innerHTML = "";
        allergens.forEach((name) => {
            const li = document.createElement("li");
            li.className = "py-2";
            li.textContent = name;
            allergensListEl.appendChild(li);
        });
        if (!allergens.length) {
            const li = document.createElement("li");
            li.className = "py-2";
            li.textContent = "None";
            allergensListEl.appendChild(li);
        }
    } catch (err) {
        console.error(err);
        alert(`Failed to fetch product info:\n${err.message}`);
    }
}

/* ---------- init ---------- */
startCamera().then(() => {
    if (detector) scanLoop();
});

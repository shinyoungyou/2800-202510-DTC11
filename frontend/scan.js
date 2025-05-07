/* ---------- DOM elements ---------- */
const video = document.getElementById("video");
const barcodeBox = document.getElementById("barcode-box");

/* ---------- start camera ---------- */
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
        alert("⚠️ Unable to use the camera.");
    }
}

/* ---------- BarcodeDetector ---------- */
let detector = null;
if ("BarcodeDetector" in window) {
    detector = new BarcodeDetector({
        formats: ["ean_13", "ean_8", "code_128"],
    });
} else {
    alert("⚠️ BarcodeDetector API is not supported in this browser.");
}

/* ---------- scan loop ---------- */
async function scanLoop() {
    if (!detector) return;

    try {
        const barcodes = await detector.detect(video);
        if (barcodes.length) {
            const { boundingBox } = barcodes[0];
            drawBox(boundingBox);
        } else {
            barcodeBox.classList.add("hidden");
        }
    } catch (err) {
        console.error(err);
    }
    requestAnimationFrame(scanLoop);
}

/* ---------- draw bounding box ---------- */
function drawBox({ x, y, width, height }) {
    barcodeBox.style.cssText = `left:${x}px; top:${y}px; width:${width}px; height:${height}px;`;
    barcodeBox.classList.remove("hidden");
}

/* ---------- init ---------- */
startCamera().then(() => {
    if (detector) scanLoop();
});

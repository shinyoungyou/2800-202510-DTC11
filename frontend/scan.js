/* ------------ camera startup ------------ */
const video = document.getElementById("video");

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

startCamera();

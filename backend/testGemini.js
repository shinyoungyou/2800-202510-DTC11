// test script
require("dotenv").config();
const fetch = require("node-fetch");

async function pingGemini() {
    const endpoint =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

    const payload = {
        contents: [{ parts: [{ text: "ping" }] }],
        generationConfig: { temperature: 0 },
    };

    const url = `${endpoint}?key=${process.env.GEMINI_API_KEY}`;
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const json = await res.json();

        if (!res.ok) {
            throw new Error(
                `${res.status} ${res.statusText}\n${JSON.stringify(
                    json,
                    null,
                    2
                )}`
            );
        }
        const reply = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
        console.log("[Gemini ping] OK →", reply.slice(0, 60), "…");
    } catch (err) {
        console.error("[Gemini ping] ERROR:", err.message);
        process.exitCode = 1;
    }
}

pingGemini();

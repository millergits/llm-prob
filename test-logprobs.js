const fs = require('fs');
const path = require('path');

let apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    try {
        const envPath = path.join(__dirname, '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/GEMINI_API_KEY=(.*)/);
        if (match) {
            apiKey = match[1].trim();
        }
    } catch (e) {
        // ignore
    }
}



const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

const payload = {
    contents: [{ parts: [{ text: "The future by AI is" }] }],
    generationConfig: {
        responseLogprobs: true,
        logprobs: 5,
        maxOutputTokens: 20
    }
};

console.log("Testing Logprobs with Gemini 1.5 Flash...");
console.log("URL:", url.replace(apiKey, "HIDDEN"));

(async () => {
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`Error ${response.status}: ${text}`);
        } else {
            const data = await response.json();
            console.log("Success!");
            // console.log(JSON.stringify(data, null, 2));
            if (data.candidates && data.candidates[0].logprobs) {
                console.log("Logprobs received!");
            } else {
                console.log("No logprobs in response.");
                console.log(JSON.stringify(data.candidates[0], null, 2));
            }
        }
    } catch (err) {
        console.error("Fetch failed:", err);
    }
})();

const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

async function main() {
    let apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        try {
            const envPath = path.join(__dirname, '.env.local');
            const envContent = fs.readFileSync(envPath, 'utf8');
            const match = envContent.match(/GEMINI_API_KEY=(.*)/);
            if (match) apiKey = match[1].trim();
        } catch (e) { }
    }

    if (!apiKey) {
        console.error("No API Key found");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = "The future of AI is";
    try {
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseLogprobs: true,
                logprobs: 5,
                maxOutputTokens: 20,
            }
        });

        console.log("Success!");
        const response = await result.response;
        console.log(JSON.stringify(response, null, 2));

        if (response.candidates && response.candidates[0].logprobs) {
            console.log("Logprobs found!");
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

main();

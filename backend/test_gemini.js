const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error("❌ No GEMINI_API_KEY found in .env");
    process.exit(1);
}

console.log(`🔑 Key found: ${API_KEY.substring(0, 4)}... (Length: ${API_KEY.length})`);

async function testGemini() {
    const modelName = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
    
    console.log(`🌐 Calling URL: ${url.replace(API_KEY, 'HIDDEN_KEY')}`);

    const prompt = "Generate a JSON object with a 'message' field saying 'Hello World'. Do not use markdown.";

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        console.log(`📡 Status: ${response.status} ${response.statusText}`);

        const text = await response.text();
        console.log("📄 Raw Response Body:");
        console.log(text.substring(0, 500)); // Print first 500 chars

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = JSON.parse(text);
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        console.log("\n✅ Success! Content:");
        console.log(content);

    } catch (error) {
        console.error("\n🔴 Test Failed:");
        console.error(error);
    }
}

testGemini();

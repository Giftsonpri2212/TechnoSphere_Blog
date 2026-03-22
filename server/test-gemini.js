const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("Missing GEMINI_API_KEY in environment variables.");
  process.exit(1);
}

const gemini = new GoogleGenerativeAI(apiKey);

console.log("Testing Gemini API initialization...");
console.log("API Key valid:", !!apiKey);

// Test different model names
const modelNames = [
  "gemini-pro",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
  "gemini-2.0-flash",
  "gemini-pro-vision",
  "gemini-1.5-pro-latest",
  "gemini-1.5-flash-latest",
  "models/gemini-pro",
  "models/gemini-1.5-pro",
  "models/gemini-1.5-flash"
];

async function testModels() {
  for (const modelName of modelNames) {
    try {
      console.log(`\n🔄 Testing model: ${modelName}`);
      const model = gemini.getGenerativeModel({ model: modelName });
      
      const response = await model.generateContent({
        contents: [{
          role: "user",
          parts: [{text: "Say 'Hello' in one word"}]
        }]
      });
      
      const text = response.response.text();
      console.log(`✅ ${modelName} works! Response: "${text.substring(0, 50)}..."`);
      return modelName;
    } catch (error) {
      console.log(`❌ ${modelName}: ${error.message.substring(0, 100)}`);
    }
  }
  console.log("\n❌ No working models found");
}

testModels().catch(console.error);

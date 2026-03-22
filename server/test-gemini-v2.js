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
  "gemini-1.5-pro",
  "gemini-1.5-flash"
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
      console.log(`❌ ${modelName}`);
      console.log(`   Full Error: ${error.message}`);
      console.log(`   Error Type: ${error.constructor.name}`);
      if (error.response) {
        console.log(`   Response status: ${error.response.status}`);
        console.log(`   Response data: ${JSON.stringify(error.response.data || error.response.text)}`);
      }
    }
  }
  console.log("\n❌ No working models found");
}

testModels().catch(console.error);

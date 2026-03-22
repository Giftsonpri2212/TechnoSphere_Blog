const https = require("https");
require("dotenv").config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("Missing GEMINI_API_KEY in environment variables.");
  process.exit(1);
}

async function listModels() {
  return new Promise((resolve, reject) => {
    try {
      console.log("Attempting to list available Gemini models...\n");
      
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      console.log("Endpoint:", url.replace(apiKey, "***API_KEY***"));
      
      https.get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            
            if (res.statusCode !== 200) {
              console.log("\n❌ API Error:");
              console.log("Status:", res.statusCode);
              console.log("Response:", JSON.stringify(json, null, 2));
              resolve();
              return;
            }
            
            console.log("\n✅ Available Models:");
            if (json.models && Array.isArray(json.models)) {
              json.models.forEach(model => {
                console.log(`\n📦 ${model.name}`);
                console.log(`   Display Name: ${model.displayName}`);
                console.log(`   Description: ${model.description}`);
                if (model.supportedGenerationMethods) {
                  console.log(`   Methods: ${model.supportedGenerationMethods.join(", ")}`);
                }
              });
            } else {
              console.log(JSON.stringify(json, null, 2));
            }
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      }).on("error", reject);
    } catch (error) {
      reject(error);
    }
  });
}

listModels().catch(console.error);

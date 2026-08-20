import fs from "fs";
import path from "path";

async function testGemini() {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), ".env"), "utf-8");
  const match = envContent.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)/);
  const apiKey = match ? match[1] : null;

  console.log("Testing Gemini API with gemini-3.6-flash...");

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: "Hello! You are the Chief Scout of PMB League. Say 'Gemini 3.6 Flash Connected and Ready!' in 1 sentence." }],
            },
          ],
        }),
      }
    );

    if (!res.ok) {
      console.error("Gemini API Error:", res.status, await res.text());
      return;
    }

    const data = await res.json();
    console.log("\n🎉 SUCCESSFUL GEMINI RESPONSE:\n", data.candidates?.[0]?.content?.parts?.[0]?.text);
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

testGemini();

import fs from "fs";
import path from "path";

async function testGemini() {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), ".env"), "utf-8");
  let apiKey = "";
  for (const line of envContent.split("\n")) {
    if (line.startsWith("GEMINI_API_KEY=") || line.startsWith("GOOGLE_GEMINI_API_KEY=")) {
      apiKey = line.split("=")[1]?.trim().replace(/^["']|["']$/g, "") || "";
    }
  }
  console.log("API Key exists:", !!apiKey, apiKey ? apiKey.substring(0, 8) + "..." : "");
  if (!apiKey) return;

  const models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-2.5-flash", "gemini-3.6-flash"];

  for (const m of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: "Hello, reply in Moroccan Darija in 1 sentence." }] }],
          }),
        }
      );
      const data = await res.json();
      console.log(`Model ${m}: status ${res.status}`, data?.candidates?.[0]?.content?.parts?.[0]?.text || data?.error?.message);
    } catch (e: any) {
      console.log(`Model ${m} failed:`, e.message);
    }
  }
}

testGemini();

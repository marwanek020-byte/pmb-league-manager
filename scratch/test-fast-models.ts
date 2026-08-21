import fs from "fs";
import path from "path";

async function testFast() {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), ".env"), "utf-8");
  let apiKey = "";
  for (const line of envContent.split("\n")) {
    if (line.startsWith("GEMINI_API_KEY=") || line.startsWith("GOOGLE_GEMINI_API_KEY=")) {
      apiKey = line.split("=")[1]?.trim().replace(/^["']|["']$/g, "") || "";
    }
  }

  const candidateModels = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-3.5-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
  ];

  for (const model of candidateModels) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "جاوبني فسطر واحد بالدارجة المغربية: شكون أحسن خطة كروية؟" }] }]
        })
      });
      const data = await res.json();
      console.log(`Model: ${model} -> Status ${res.status}`);
      if (res.ok) {
        console.log(`Response from ${model}:`, data?.candidates?.[0]?.content?.parts?.[0]?.text);
      } else {
        console.log(`Error from ${model}:`, data?.error?.message);
      }
    } catch (e: any) {
      console.log(`Exception ${model}:`, e.message);
    }
  }
}

testFast();

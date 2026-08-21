import fs from "fs";
import path from "path";

async function listModels() {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), ".env"), "utf-8");
  let apiKey = "";
  for (const line of envContent.split("\n")) {
    if (line.startsWith("GEMINI_API_KEY=") || line.startsWith("GOOGLE_GEMINI_API_KEY=")) {
      apiKey = line.split("=")[1]?.trim().replace(/^["']|["']$/g, "") || "";
    }
  }
  if (!apiKey) return;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    console.log("Status:", res.status);
    if (data.models) {
      console.log("Available models:", data.models.map((m: any) => m.name));
    } else {
      console.log("Error:", data);
    }
  } catch (e: any) {
    console.log("Fetch failed:", e.message);
  }
}

listModels();

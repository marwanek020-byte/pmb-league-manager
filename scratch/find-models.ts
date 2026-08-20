import fs from "fs";
import path from "path";

async function findGenModels() {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), ".env"), "utf-8");
  const match = envContent.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)/);
  const apiKey = match ? match[1] : null;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    const genModels = (data.models || [])
      .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m: any) => m.name);
    console.log("Supported generateContent models in your project:", genModels);
  } catch (err) {
    console.error("List failed:", err);
  }
}

findGenModels();

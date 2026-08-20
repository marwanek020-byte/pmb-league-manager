import fs from "fs";
import path from "path";

async function listModels() {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), ".env"), "utf-8");
  const match = envContent.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)/);
  const apiKey = match ? match[1] : null;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    console.log("Models response:", data);
  } catch (err) {
    console.error("List failed:", err);
  }
}

listModels();

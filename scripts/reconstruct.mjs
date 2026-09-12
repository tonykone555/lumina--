import fs from "node:fs";
import path from "node:path";

function reconstruct(partsDir, outputPath) {
  const parts = fs.readdirSync(partsDir).sort();
  const content = parts.map((name) => fs.readFileSync(path.join(partsDir, name), "utf8")).join("");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, content, "utf8");
}

const world01B64 = fs.readdirSync(".source-parts/world01-b64").sort().map((name) => fs.readFileSync(path.join(".source-parts/world01-b64", name), "utf8")).join("");
fs.writeFileSync(".source-parts/world/01", Buffer.from(world01B64, "base64"));

reconstruct(".source-parts/globals", "app/globals.css");
reconstruct(".source-parts/world", "components/lumina/LuminaWorld.tsx");

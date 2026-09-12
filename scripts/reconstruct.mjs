import fs from "node:fs";
import path from "node:path";

function reconstruct(partsDir, outputPath) {
  const parts = fs.readdirSync(partsDir).sort();
  const content = parts.map((name) => fs.readFileSync(path.join(partsDir, name), "utf8")).join("");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, content, "utf8");
}

reconstruct(".source-parts/globals", "app/globals.css");
reconstruct(".source-parts/world", "components/lumina/LuminaWorld.tsx");

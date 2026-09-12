import fs from "node:fs";
import path from "node:path";

function reconstruct(partsDir, outputPath) {
  const parts = fs.readdirSync(partsDir).sort();
  const content = parts.map((name) => fs.readFileSync(path.join(partsDir, name), "utf8")).join("");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, content, "utf8");
}

// Keep the historical global stylesheet materialization, but do not overwrite
// components/lumina/LuminaWorld.tsx. The live component is now maintained
// directly so spatial interaction changes survive Vercel's prebuild step.
reconstruct(".source-parts/globals", "app/globals.css");

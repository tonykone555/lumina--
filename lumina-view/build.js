const fs = require('fs');
const path = require('path');
const partsDir = path.join(__dirname, 'parts');
const files = fs.readdirSync(partsDir).filter(f => /^\d+\.txt$/.test(f)).sort();
const html = files.map(f => fs.readFileSync(path.join(partsDir, f), 'utf8')).join('');
const out = path.join(__dirname, 'dist');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'index.html'), html);
console.log(`Built Lumina View from ${files.length} exact source chunks (${html.length} chars).`);

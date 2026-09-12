import fs from 'node:fs';
import path from 'node:path';

const targets = [
  ['components/lumina/LuminaWorld.tsx', 4],
  ['app/globals.css', 4],
  ['app/frameless.css', 1],
];

for (const [target, count] of targets) {
  const key = target.replaceAll('/', '__').replaceAll('.', '_');
  let encoded = '';
  for (let i = 1; i <= count; i++) {
    encoded += fs.readFileSync(path.join('.source', `${key}.${i}.b64`), 'utf8').trim();
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, Buffer.from(encoded, 'base64'));
}

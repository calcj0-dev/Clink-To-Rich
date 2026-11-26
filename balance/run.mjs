// 使い方：node balance/run.mjs <spec.json> <out.jsonl>
// spec.json：{ games, msPerDrop?, maxDrops?, strategies: [...], variants: [{ name, config: {path: value}, currency: {path: value} }] }
// 本番のゲーム本体で自動の試作を回し（vitest で同時に）、out.jsonl にまとめて表を出す
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [specFile, outFile] = process.argv.slice(2);
const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
const gen = path.resolve('balance/_gen');
fs.rmSync(gen, { recursive: true, force: true });
fs.mkdirSync(gen, { recursive: true });
const out = path.resolve(outFile);
fs.rmSync(out, { force: true });
const CHUNK = spec.chunk ?? 4;
let n = 0;
for (const v of spec.variants) {
  for (const strategy of spec.strategies) {
    for (let i = 0; i < spec.games; i += CHUNK) {
      const seeds = Array.from({ length: Math.min(CHUNK, spec.games - i) }, (_, k) => 3000 + i + k);
      const s = { variant: v.name, strategy, seeds, out, msPerDrop: spec.msPerDrop ?? 1000, maxDrops: spec.maxDrops ?? 1200, config: v.config ?? {}, currency: v.currency ?? {} };
      fs.writeFileSync(
        path.join(gen, `${n++}.bal.ts`),
        `import { it } from 'vitest';\nimport { runChunk } from '../play';\nit('chunk', () => runChunk(${JSON.stringify(s)}));\n`,
      );
    }
  }
}
execSync('npx vitest run --config vitest.balance.config.ts', { stdio: 'ignore' });
fs.rmSync(gen, { recursive: true, force: true });
execSync(`node balance/summary.mjs "${out}"`, { stdio: 'inherit' });

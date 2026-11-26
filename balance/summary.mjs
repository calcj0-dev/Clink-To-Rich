// 使い方：node balance/summary.mjs out.jsonl …：案・遊び方ごとの表
import fs from 'node:fs';
const rows = process.argv.slice(2).flatMap((f) => fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)));
const g = {};
for (const r of rows) (g[`${r.variant}|${r.strategy}`] ??= []).push(r);
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const man = (y) => (y >= 1e8 ? (y / 1e8).toFixed(1) + '億' : Math.round(y / 1e4).toLocaleString() + '万');
const pct = (a, n) => `${a}/${n}（${Math.round((a / n) * 100)}%）`;
console.log('| 案 | 遊び方 | 回数 | 買えた | 株数(中央) | 最初に買った玉(中央) | 合計 25% / 50% / 75% | 1億以上 | 落とした回数(中央) | 上限まで |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const [k, rs] of Object.entries(g).sort()) {
  const [v, s] = k.split('|');
  const bought = rs.filter((r) => r.shares > 0);
  const first = bought.map((r) => r.boughtDrops[0]);
  const t = rs.map((r) => r.total);
  console.log(`| ${v} | ${s} | ${rs.length} | ${s === 'mergeOnly' ? '-' : pct(bought.length, rs.length)} | ${q(rs.map((r) => r.shares), 0.5)} | ${first.length ? q(first, 0.5) : '-'} | ${man(q(t, 0.25))} / ${man(q(t, 0.5))} / ${man(q(t, 0.75))} | ${pct(rs.filter((r) => r.total >= 1e8).length, rs.length)} | ${q(rs.map((r) => r.drops), 0.5)} | ${rs.filter((r) => r.capped).length} |`);
}

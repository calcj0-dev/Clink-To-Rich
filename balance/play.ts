// バランスの試作：本番のゲーム本体（src/core）を、自動で遊ぶ人（ボット）に遊ばせる。
// 落とす場所の選び方はみな同じで、「買」を押すタイミングだけが違う（sim/bots.mjs と同じ考え方）

import { appendFileSync } from 'node:fs';
import { config, currency } from '../src/data';
import { createGame, type Game } from '../src/core/game';
import type { Config, Currency } from '../src/core/types';

export type Strategy = 'mergeOnly' | 'buyMax3' | 'buyAlways' | 'buyHalf';

/** 'stock.drift' のような点区切りの場所に値を入れる */
function setPath(obj: Record<string, unknown>, path: string, v: unknown) {
  const ks = path.split('.');
  let o = obj;
  while (ks.length > 1) o = o[ks.shift()!] as Record<string, unknown>;
  o[ks[0]!] = v;
}

function chooseX(g: Game, rnd: () => number): number {
  const W = g.config.box.width;
  const rNew = g.world.radiusOf(g.heldTier);
  const bs = g.world.balls();
  let best: { x: number; score: number } | null = null;
  for (let x = rNew + 1; x <= W - rNew - 1; x += 8) {
    let top: (typeof bs)[number] | null = null;
    for (const b of bs) {
      const half = (b.body.bounds.max.x - b.body.bounds.min.x) / 2;
      if (Math.abs(b.body.position.x - x) < half + rNew * 0.6 && (!top || b.body.bounds.min.y < top.body.bounds.min.y)) top = b;
    }
    let score = top ? top.body.bounds.min.y : g.config.box.height;
    if (top && top.kind === 'money' && top.tier === g.heldTier) score += 400;
    if (top && top.kind === 'stock') score -= 30;
    score += rnd() * 20;
    if (!best || score > best.score) best = { x, score };
  }
  return best!.x;
}

function wantBuy(g: Game, s: Strategy): boolean {
  if (s === 'buyAlways') return true;
  if (s === 'buyMax3') return g.play().shares < 3;
  if (s === 'buyHalf') return g.cash() >= 2 * g.price();
  return false;
}

export type Spec = {
  variant: string;
  strategy: Strategy;
  seeds: number[];
  out: string;
  /** 1玉ごとに進める時間（ミリ秒）。人が落とす間かく */
  msPerDrop: number;
  maxDrops: number;
  config: Record<string, unknown>;
  currency: Record<string, unknown>;
};

export function runChunk(spec: Spec): void {
  const cfg = JSON.parse(JSON.stringify(config)) as Config;
  const cur = JSON.parse(JSON.stringify(currency)) as Currency;
  for (const [k, v] of Object.entries(spec.config)) setPath(cfg as unknown as Record<string, unknown>, k, v);
  for (const [k, v] of Object.entries(spec.currency)) setPath(cur as unknown as Record<string, unknown>, k, v);
  for (const seed of spec.seeds) {
    const g = createGame(cfg, cur, seed);
    let s = seed;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    while (!g.over && g.play().drops < spec.maxDrops) {
      g.update(spec.msPerDrop);
      if (g.over) break;
      g.drop(chooseX(g, rnd));
      if (wantBuy(g, spec.strategy)) g.buy();
    }
    const r = g.result();
    const p = g.play();
    appendFileSync(
      spec.out,
      JSON.stringify({
        variant: spec.variant,
        strategy: spec.strategy,
        seed,
        drops: r.drops,
        total: r.total,
        cash: r.cash,
        stock: r.stock,
        shares: r.shares,
        maxOku: r.maxOku,
        boughtDrops: p.boughtDrops,
        crashDrops: p.crashDrops,
        title: r.title,
        capped: !g.over,
      }) + '\n',
    );
  }
}

// 開発用（公開版には入らない）：画像を確かめる・作るためのページ
//   ?screen=image … 自動で遊ばせた1回の結果画像
//   ?screen=og    … URL を貼ったときのカード画像（1200×630）。これを撮って public/og-default.png にする

import { config, currency } from '../data';
import { createGame } from '../core/game';
import { setLastResult } from '../game/lastResult';
import { t } from '../i18n';
import { drawResultImage, IMAGE_H, IMAGE_W } from '../share/resultImage';
import { drawMoney, drawTurnip, snapshotBox } from '../ui/render';

function fullCanvas(): HTMLCanvasElement {
  document.body.style.margin = '0';
  document.body.style.background = '#fff';
  const app = document.querySelector('#app');
  if (app) (app as HTMLElement).style.display = 'none';
  const c = document.createElement('canvas');
  c.style.display = 'block';
  c.style.width = `${IMAGE_W}px`;
  c.style.height = `${IMAGE_H}px`;
  document.body.append(c);
  return c;
}

export function previewResultImage(seed: number, drops: number, buyEvery: number): void {
  const g = createGame(config, currency, seed);
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < drops && !g.over; i++) {
    g.drop(30 + rnd() * (config.box.width - 60));
    if (buyEvery > 0 && i % buyEvery === 0) g.buy();
    g.update(700);
  }
  const r = { ...g.result(), box: snapshotBox(g), newBest: false, best: g.total() };
  setLastResult(r);
  drawResultImage(fullCanvas(), r);
}

export function previewOg(): void {
  const c = fullCanvas();
  c.width = IMAGE_W;
  c.height = IMAGE_H;
  const ctx = c.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#fbf6ea';
  ctx.fillRect(0, 0, IMAGE_W, IMAGE_H);

  const font = 'system-ui, "Hiragino Sans", "Noto Sans JP", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#c98a12';
  ctx.font = `900 120px ${font}`;
  ctx.fillText(t('meta.name'), IMAGE_W / 2, 190);
  ctx.fillStyle = '#5f6779';
  ctx.font = `600 34px ${font}`;
  ctx.fillText(t('meta.tagline'), IMAGE_W / 2, 255);

  // お金の段を小さい方から並べる（大きさの増え方が分かるように）＋かぶ
  const tiers = currency.tiers;
  const maxR = tiers[tiers.length - 1]!.radius;
  const k = 76 / maxR;
  let x = 40;
  const base = 545;
  const items = tiers.map((tr, i) => ({ i, r: Math.max(12, tr.radius * k) }));
  const gap = (IMAGE_W - 80 - items.reduce((sum, it) => sum + it.r * 2, 0) - 2 * config.stock.radius * k - 10) / (items.length);
  for (const it of items) {
    ctx.save();
    ctx.translate(x + it.r, base - it.r);
    drawMoney(ctx, it.i, it.r);
    ctx.restore();
    x += it.r * 2 + gap;
  }
  const kr = Math.max(12, config.stock.radius * k * 1.2);
  ctx.save();
  ctx.translate(x + kr, base - kr);
  drawTurnip(ctx, kr, config.stock.color.base);
  ctx.restore();
}

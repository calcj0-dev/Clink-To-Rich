// タイトル画面の絵：お金（硬貨・お札・束・1億円のケース）とかぶを積み上げた山（2026-11-26：タイトルが地味なので）。
// ゲームと同じ描き方を使う

import { config, currency } from '../../data';
import { h } from '../dom';
import { drawMoney, drawTurnip } from '../render';

const W = 340;
const H = 200;

/** [段の id, x, y, 半径の倍率, 回転] */
const PILE: [string, number, number, number, number][] = [
  ['y10m', 70, 150, 0.62, -0.12],
  ['y1m', 268, 156, 0.62, 0.16],
  ['y100m', 170, 112, 0.8, 0],
  ['y10000', 96, 74, 0.72, -0.35],
  ['y5000', 250, 86, 0.72, 0.3],
  ['y500', 36, 96, 0.9, 0],
  ['y100', 312, 104, 0.95, 0],
  ['y1000', 186, 180, 0.7, 0.05],
  ['y50', 128, 182, 0.95, 0],
  ['y10', 232, 182, 0.95, 0],
  ['y5', 22, 180, 1, 0],
  ['y1', 318, 182, 1.1, 0],
];

export function titleArt(): HTMLCanvasElement {
  const c = h('canvas', { className: 'title-art', attrs: { 'aria-hidden': 'true' } });
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  c.width = W * dpr;
  c.height = H * dpr;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  ctx.scale(dpr, dpr);
  const idx = (id: string) => currency.tiers.findIndex((t) => t.id === id);
  for (const [id, x, y, k, rot] of PILE) {
    const i = idx(id);
    if (i < 0) continue;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    drawMoney(ctx, i, currency.tiers[i]!.radius * k);
    ctx.restore();
  }
  // てっぺんに金色のかぶ
  ctx.save();
  ctx.translate(170, 34);
  drawTurnip(ctx, config.stock.radius * 1.05, config.stock.color.up);
  ctx.restore();
  return c;
}

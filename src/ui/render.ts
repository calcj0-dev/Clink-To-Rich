// 玉と貯金箱の描き方（設計書 1.2・2章）。遊ぶ画面・進化の輪・結果画像で同じものを使う
// お札・硬貨は単純な図形と数字だけ（肖像・模様は描かない。要件定義書 6章）

import { currency } from '../data';
import type { Game } from '../core/game';
import { stockColor } from '../core/rules';
import type { Tier } from '../core/types';
import { t } from '../i18n';
import { money } from '../money';

const TOP = currency.tiers.length - 1;

/** 色を白（amt>0）または黒（amt<0）に寄せる */
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt));
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `rgb(${r},${g},${b})`;
}

/** 文字を幅 maxW に収めて真ん中に書く */
function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, maxW: number, color: string) {
  ctx.font = `700 ${size}px system-ui, "Hiragino Sans", "Noto Sans JP", sans-serif`;
  const w = ctx.measureText(text).width;
  if (w > maxW) {
    size *= maxW / w;
    ctx.font = `700 ${size}px system-ui, "Hiragino Sans", "Noto Sans JP", sans-serif`;
  }
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + size * 0.05);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** 玉に書く金額。硬貨は数字だけ（500）、それより上は「1万円」「3億円」 */
export function ballText(tier: number, oku = 1): string {
  const tr = currency.tiers[tier]!;
  if (tr.look === 'coin') return tr.value.toLocaleString(currency.locale);
  return money(tier === TOP ? oku * tr.value : tr.value);
}

/** お金の玉を (0,0) を中心に半径 r で描く。text=false なら金額を書かない（小さい絵） */
export function drawMoney(ctx: CanvasRenderingContext2D, tier: number, r: number, oku = 1, text = true): void {
  const tr: Tier = currency.tiers[tier]!;
  const c = tr.color;
  const words = text ? ballText(tier, oku) : '';

  // 外側の円（物理の形と同じ）
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = tr.look === 'coin' ? c : shade(c, 0.72);
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.07);
  ctx.strokeStyle = shade(c, -0.35);
  ctx.stroke();

  if (tr.look === 'coin') {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(0.6, r * 0.04);
    ctx.strokeStyle = shade(c, -0.18);
    ctx.stroke();
    if (tr.hole) {
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = shade(c, -0.35);
      ctx.stroke();
      if (words) label(ctx, words, 0, r * 0.52, r * 0.42, r * 1.1, shade(c, -0.6));
    } else if (words) label(ctx, words, 0, 0, r * 0.7, r * 1.4, shade(c, -0.6));
    return;
  }

  if (tr.look === 'bill') {
    const w = r * 1.5;
    const h = r * 0.82;
    roundRect(ctx, -w / 2, -h / 2, w, h, r * 0.08);
    ctx.fillStyle = c;
    ctx.fill();
    ctx.lineWidth = Math.max(1, r * 0.04);
    ctx.strokeStyle = shade(c, -0.3);
    ctx.stroke();
    if (words) label(ctx, words, 0, 0, r * 0.42, w * 0.88, shade(c, -0.7));
    return;
  }

  if (tr.look === 'bundle') {
    // 束：お札を少しずつずらして重ね、真ん中に帯
    const w = r * 1.38;
    const h = r * 0.62;
    const layers = 3;
    for (let i = layers - 1; i >= 0; i--) {
      const dy = (i - 1) * r * 0.16;
      roundRect(ctx, -w / 2 + i * r * 0.04, -h / 2 + dy, w, h, r * 0.06);
      ctx.fillStyle = shade(c, i * 0.12);
      ctx.fill();
      ctx.lineWidth = Math.max(1, r * 0.03);
      ctx.strokeStyle = shade(c, -0.35);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(-r * 0.09, -h / 2 - r * 0.16, r * 0.18, h + r * 0.32);
    if (words) label(ctx, words, 0, r * 0.62, r * 0.3, r * 1.3, shade(c, -0.7));
    return;
  }

  // case：取っ手の付いたケース
  const w = r * 1.4;
  const h = r * 0.92;
  ctx.beginPath();
  ctx.lineWidth = r * 0.08;
  ctx.strokeStyle = shade(c, -0.55);
  ctx.arc(0, -h / 2, r * 0.22, Math.PI, 0);
  ctx.stroke();
  roundRect(ctx, -w / 2, -h / 2, w, h, r * 0.1);
  ctx.fillStyle = shade(c, -0.45);
  ctx.fill();
  ctx.fillStyle = shade(c, -0.25);
  ctx.fillRect(-w / 2, -r * 0.05, w, r * 0.1);
  if (words) label(ctx, words, 0, h * 0.22, r * 0.3, w * 0.85, '#ffffff');
}

/** 株の玉を描く。色は今の株価で決まる（全部の株の玉が同じ色） */
export function drawStock(ctx: CanvasRenderingContext2D, r: number, price: number): void {
  const step = stockColor(price, currency.stock.startPrice, currency.stock.colorSteps);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  if (step.color === 'rainbow') {
    const g = ctx.createLinearGradient(-r, -r, r, r);
    ['#e84a5f', '#f5a623', '#f8e71c', '#3fa45b', '#4a7bd0', '#9b59b6'].forEach((col, i, a) => g.addColorStop(i / (a.length - 1), col));
    ctx.fillStyle = g;
  } else ctx.fillStyle = step.color;
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.07);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.stroke();
  label(ctx, t('ball.stock'), 0, 0, r * 0.8, r * 1.3, '#ffffff');
}

export type DrawState = { now: number; showHeld: boolean };

/** 貯金箱の中身（箱の座標。幅 box.width × 高さ box.height） */
export function drawBox(ctx: CanvasRenderingContext2D, game: Game, s: DrawState): void {
  const { width: W, height: H, dangerLineY, dropY } = game.config.box;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#fbf6ea';
  ctx.fillRect(0, 0, W, H);

  // 落とす位置のガイド
  if (!game.over) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.setLineDash([4, 6]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(game.dropX, dropY);
    ctx.lineTo(game.dropX, H);
    ctx.stroke();
    ctx.restore();
  }

  // 危険な線。越えている間は赤く点滅
  const warn = game.overMs > 0 && Math.floor(s.now / 250) % 2 === 0;
  ctx.save();
  ctx.strokeStyle = warn ? '#e23b3b' : 'rgba(226,59,59,0.35)';
  ctx.lineWidth = warn ? 3 : 2;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(0, dangerLineY);
  ctx.lineTo(W, dangerLineY);
  ctx.stroke();
  ctx.restore();

  const price = game.price();
  for (const b of game.world.balls()) {
    ctx.save();
    ctx.translate(b.body.position.x, b.body.position.y);
    ctx.rotate(b.body.angle);
    if (b.kind === 'money') drawMoney(ctx, b.tier, b.body.circleRadius ?? 10, b.oku || 1);
    else drawStock(ctx, b.body.circleRadius ?? 10, price);
    ctx.restore();
  }

  // 手に持っているお金
  if (s.showHeld && !game.over) {
    ctx.save();
    ctx.translate(game.dropX, dropY);
    drawMoney(ctx, game.heldTier, game.world.radiusOf(game.heldTier));
    ctx.restore();
  }
}

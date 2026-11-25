// 玉と貯金箱の描き方（設計書 1.2・2章）。遊ぶ画面・進化の輪・結果画像で同じものを使う
// 立体的に描く（光は左上から）。2026-11-25 オーナー決定：お札・束・ケースは角の丸い四角
// お札・硬貨は単純な図形と数字だけ（肖像・模様は描かない。要件定義書 6章）

import { config, currency } from '../data';
import type { Game } from '../core/game';
import { turnipColor } from '../core/rules';
import { moneyShape } from '../core/shapes';
import type { Tier } from '../core/types';
import { money } from '../money';

const TOP = currency.tiers.length - 1;
const FONT = 'system-ui, "Hiragino Sans", "Noto Sans JP", sans-serif';

/** 色を白（amt>0）または黒（amt<0）に寄せる */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt));
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `rgb(${r},${g},${b})`;
}

/** 文字を幅 maxW に収めて真ん中に書く。emboss なら左上に明るい影を付けて刻印のように */
export function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, maxW: number, color: string, emboss = '') {
  ctx.font = `800 ${size}px ${FONT}`;
  const w = ctx.measureText(text).width;
  if (w > maxW) {
    size *= maxW / w;
    ctx.font = `800 ${size}px ${FONT}`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const yy = y + size * 0.05;
  if (emboss) {
    ctx.fillStyle = emboss;
    ctx.fillText(text, x + size * 0.05, yy + size * 0.06);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, yy);
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.max(0, r));
}

/** 左上が明るく右下が暗い、ふくらみの光 */
function bulge(ctx: CanvasRenderingContext2D, r: number, light: string, mid: string, dark: string): CanvasGradient {
  const g = ctx.createRadialGradient(-r * 0.4, -r * 0.45, r * 0.05, 0, 0, r * 1.05);
  g.addColorStop(0, light);
  g.addColorStop(0.55, mid);
  g.addColorStop(1, dark);
  return g;
}

/** 玉に書く金額。硬貨は数字だけ（500）、それより上は「1万円」「3億円」 */
export function ballText(tier: number, oku = 1): string {
  const tr = currency.tiers[tier]!;
  if (tr.look === 'coin') return tr.value.toLocaleString(currency.locale);
  return money(tier === TOP ? oku * tr.value : tr.value);
}

/** 硬貨：ふちの厚み・面のふくらみ・刻印のような数字・光のつや */
function drawCoin(ctx: CanvasRenderingContext2D, tr: Tier, r: number, words: string) {
  const c = tr.color;
  // ふち（外側の厚み）
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  const rim = ctx.createLinearGradient(-r, -r, r, r);
  rim.addColorStop(0, shade(c, 0.55));
  rim.addColorStop(0.5, c);
  rim.addColorStop(1, shade(c, -0.45));
  ctx.fillStyle = rim;
  ctx.fill();
  // 面
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2);
  ctx.fillStyle = bulge(ctx, r * 0.86, shade(c, 0.45), c, shade(c, -0.22));
  ctx.fill();
  // 面のふちの段差
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(0.6, r * 0.035);
  ctx.strokeStyle = shade(c, -0.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.74, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(0.5, r * 0.025);
  ctx.strokeStyle = shade(c, -0.15);
  ctx.stroke();
  const ink = shade(c, -0.55);
  const hi = 'rgba(255,255,255,0.55)';
  if (tr.hole) {
    // 穴：内側の影で奥行き
    const hr = r * 0.22;
    ctx.beginPath();
    ctx.arc(0, 0, hr, 0, Math.PI * 2);
    const hole = ctx.createRadialGradient(hr * 0.3, hr * 0.3, hr * 0.2, 0, 0, hr);
    hole.addColorStop(0, '#fbf6ea');
    hole.addColorStop(1, shade(c, -0.5));
    ctx.fillStyle = hole;
    ctx.fill();
    if (words) label(ctx, words, 0, r * 0.5, r * 0.4, r * 1.1, ink, hi);
  } else if (words) label(ctx, words, 0, 0, r * 0.62, r * 1.3, ink, hi);
  // つや
  ctx.beginPath();
  ctx.ellipse(-r * 0.38, -r * 0.42, r * 0.32, r * 0.14, -0.7, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill();
}

/** 四隅の小さな数字を描く大きさの下限（これより小さいお札では、つぶれるので描かない） */
const BILL_DETAIL_MIN_H = 70;

/** お札の面（2026-11-25 オーナー決定：案A 紙幣風）。生成りの紙に色インクの二重の枠と右の色帯、すかしの丸、
 *  大きいときだけ四隅に小さな数字、紙の反りの光。肖像・地紋は描かない。(0,0) を中心に幅 w・高さ h */
function billFace(ctx: CanvasRenderingContext2D, ink: string, w: number, h: number, corner: number, words: string, cornerNum: string) {
  roundRect(ctx, -w / 2, -h / 2, w, h, corner * 0.5);
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, '#fbf8ef');
  g.addColorStop(0.5, '#f1ebdc');
  g.addColorStop(1, '#ded6c3');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = Math.max(0.8, h * 0.02);
  ctx.strokeStyle = '#a89f8a';
  ctx.stroke();
  // インクの枠（二重線）
  const m = h * 0.08;
  roundRect(ctx, -w / 2 + m, -h / 2 + m, w - m * 2, h - m * 2, corner * 0.3);
  ctx.lineWidth = Math.max(1, h * 0.05);
  ctx.strokeStyle = shade(ink, -0.15);
  ctx.stroke();
  const m2 = m + h * 0.07;
  roundRect(ctx, -w / 2 + m2, -h / 2 + m2, w - m2 * 2, h - m2 * 2, corner * 0.2);
  ctx.lineWidth = Math.max(0.5, h * 0.015);
  ctx.stroke();
  // 右の色帯
  const bw = w * 0.2;
  ctx.fillStyle = shade(ink, 0.2);
  ctx.fillRect(w / 2 - m2 - bw, -h / 2 + m2, bw, h - m2 * 2);
  // すかしの丸（左）
  const wx = -w * 0.28;
  ctx.beginPath();
  ctx.ellipse(wx, 0, h * 0.2, h * 0.24, 0, 0, Math.PI * 2);
  const wm = ctx.createRadialGradient(wx, 0, 0, wx, 0, h * 0.24);
  wm.addColorStop(0, '#ffffff');
  wm.addColorStop(1, '#ebe4d3');
  ctx.fillStyle = wm;
  ctx.fill();
  // 四隅の数字（大きいときだけ）
  if (cornerNum && h >= BILL_DETAIL_MIN_H) {
    label(ctx, cornerNum, -w / 2 + m2 + h * 0.13, -h / 2 + m2 + h * 0.1, h * 0.16, w * 0.15, shade(ink, -0.45));
    label(ctx, cornerNum, w / 2 - m2 - h * 0.13, h / 2 - m2 - h * 0.1, h * 0.16, w * 0.15, '#ffffff');
  }
  if (words) label(ctx, words, 0, 0, h * 0.36, w * 0.44, shade(ink, -0.6));
  // 紙の反り（上が明るい）
  roundRect(ctx, -w / 2, -h / 2, w, h * 0.45, corner * 0.5);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fill();
}

/** お札の四隅の数字（1万円札なら「1」、千円札なら「1000」） */
const billNumber = (value: number) => String(value >= 10_000 ? value / 10_000 : value);

/** お札 */
function drawBill(ctx: CanvasRenderingContext2D, tr: Tier, w: number, h: number, corner: number, words: string) {
  billFace(ctx, tr.color, w, h, corner, words, billNumber(tr.value));
}

/** 束の上に見えるお札のインクの色：一番高いお札（1万円札）の色 */
const BUNDLE_INK = [...currency.tiers].reverse().find((t) => t.look === 'bill')?.color ?? '#C9B38A';

/** 束：横から見た厚み（お札の重なり）＋上のお札（案A の面）＋帯 */
function drawBundle(ctx: CanvasRenderingContext2D, tr: Tier, w: number, h: number, corner: number, words: string) {
  const c = tr.color;
  const side = h * 0.28; // 厚みの部分
  const faceH = h - side;
  // 厚み（紙の重なり。束ごとの色を少し混ぜる）
  roundRect(ctx, -w / 2, -h / 2, w, h, corner);
  const sg = ctx.createLinearGradient(0, -h / 2 + faceH, 0, h / 2);
  sg.addColorStop(0, shade(c, 0.35));
  sg.addColorStop(1, shade(c, -0.25));
  ctx.fillStyle = sg;
  ctx.fill();
  const lines = tr.value >= 10_000_000 ? 7 : 5;
  ctx.lineWidth = Math.max(0.5, h * 0.012);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  for (let i = 1; i <= lines; i++) {
    const y = -h / 2 + faceH + (side * i) / (lines + 1);
    ctx.beginPath();
    ctx.moveTo(-w / 2 + corner * 0.6, y);
    ctx.lineTo(w / 2 - corner * 0.6, y);
    ctx.stroke();
  }
  roundRect(ctx, -w / 2, -h / 2, w, h, corner);
  ctx.lineWidth = Math.max(0.8, h * 0.025);
  ctx.strokeStyle = shade(c, -0.45);
  ctx.stroke();
  // 上のお札（金額は帯の右に書くので、ここでは書かない）
  ctx.save();
  ctx.translate(0, -h / 2 + faceH / 2);
  billFace(ctx, BUNDLE_INK, w, faceH, corner, '', '');
  ctx.restore();
  // 帯（左寄り。厚みの部分まで回り込む）
  const bx = -w * 0.3;
  const bw = w * 0.13;
  const band = ctx.createLinearGradient(bx - bw / 2, 0, bx + bw / 2, 0);
  band.addColorStop(0, '#e9e4d8');
  band.addColorStop(0.5, '#ffffff');
  band.addColorStop(1, '#d9d2c2');
  ctx.fillStyle = band;
  ctx.fillRect(bx - bw / 2, -h / 2, bw, h);
  if (words) label(ctx, words, w * 0.12, -h / 2 + faceH / 2, faceH * 0.36, w * 0.6, shade(c, -0.75));
}

/** 1億円〜：アルミのケース（取っ手・金具・合わせ目） */
function drawCase(ctx: CanvasRenderingContext2D, w: number, h: number, corner: number, words: string) {
  const handleH = h * 0.16;
  const top = -h / 2 + handleH;
  const bodyH = h - handleH;
  // 取っ手
  const hw = w * 0.32;
  roundRect(ctx, -hw / 2, -h / 2 + handleH * 0.1, hw, handleH * 1.4, handleH * 0.5);
  ctx.lineWidth = Math.max(1.2, handleH * 0.32);
  ctx.strokeStyle = '#3c4148';
  ctx.stroke();
  // 本体（金属の光）
  roundRect(ctx, -w / 2, top, w, bodyH, corner);
  const g = ctx.createLinearGradient(-w / 2, top, w / 2, h / 2);
  g.addColorStop(0, '#f1f3f5');
  g.addColorStop(0.45, '#b8bec6');
  g.addColorStop(0.55, '#c9ced5');
  g.addColorStop(1, '#7c838c');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = Math.max(1, h * 0.025);
  ctx.strokeStyle = '#5b6169';
  ctx.stroke();
  // 縁の内側の線
  const m = bodyH * 0.07;
  roundRect(ctx, -w / 2 + m, top + m, w - m * 2, bodyH - m * 2, corner * 0.6);
  ctx.lineWidth = Math.max(0.6, h * 0.012);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.stroke();
  // 合わせ目と金具
  const seamY = top + bodyH * 0.3;
  ctx.fillStyle = '#6b727a';
  ctx.fillRect(-w / 2 + m * 0.5, seamY - h * 0.012, w - m, h * 0.024);
  for (const lx of [-w * 0.28, w * 0.28]) {
    roundRect(ctx, lx - w * 0.06, seamY - bodyH * 0.07, w * 0.12, bodyH * 0.14, w * 0.02);
    const lg = ctx.createLinearGradient(0, seamY - bodyH * 0.07, 0, seamY + bodyH * 0.07);
    lg.addColorStop(0, '#f6e7a8');
    lg.addColorStop(1, '#b08d2c');
    ctx.fillStyle = lg;
    ctx.fill();
  }
  if (words) label(ctx, words, 0, top + bodyH * 0.66, bodyH * 0.28, w * 0.8, '#2b3036', 'rgba(255,255,255,0.7)');
}

/** お金の玉を (0,0) を中心に描く。r は大きさの基準（丸の半径）。text=false なら金額を書かない（小さい絵） */
export function drawMoney(ctx: CanvasRenderingContext2D, tier: number, r: number, oku = 1, text = true): void {
  const tr: Tier = currency.tiers[tier]!;
  const words = text ? ballText(tier, oku) : '';
  const shape = moneyShape(tr.look, r, config.physics.shapes);
  if (shape.kind === 'circle') return drawCoin(ctx, tr, r, words);
  const { w, h, corner } = shape;
  if (tr.look === 'bill') drawBill(ctx, tr, w, h, corner, words);
  else if (tr.look === 'bundle') drawBundle(ctx, tr, w, h, corner, words);
  else drawCase(ctx, w, h, corner, words);
}

/** かぶ（株）の玉を描く（2026-11-25 オーナー決定）。物理の形は円のまま。
 *  色は平均取得価額と今の株価で決まる（全部のかぶが同じ色）：同じなら白、上がると金、下がると黒 */
export function drawTurnip(ctx: CanvasRenderingContext2D, r: number, color: string): void {
  // 葉（3枚。大きめ・葉脈つき。2026-11-25 オーナー指定で大きく）。付け根から先へ、ふっくらした楕円
  const baseY = -r * 0.42;
  const leaves: [number, number][] = [
    [-0.72, -1.12],
    [0.72, -1.12],
    [0, -1.28],
  ];
  for (const [lx, ly] of leaves) {
    const tipX = lx * r;
    const tipY = ly * r;
    const len = Math.hypot(tipX, tipY - baseY);
    const ang = Math.atan2(tipY - baseY, tipX);
    ctx.save();
    ctx.translate(0, baseY);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.ellipse(len / 2, 0, len / 2, len * 0.24, 0, 0, Math.PI * 2);
    const lg = ctx.createLinearGradient(0, 0, len, 0);
    lg.addColorStop(0, '#3a8229');
    lg.addColorStop(1, '#86cc62');
    ctx.fillStyle = lg;
    ctx.fill();
    ctx.lineWidth = Math.max(0.6, r * 0.035);
    ctx.strokeStyle = '#2b6420';
    ctx.stroke();
    // 葉脈
    ctx.beginPath();
    ctx.moveTo(len * 0.05, 0);
    ctx.lineTo(len * 0.9, 0);
    for (const t of [0.35, 0.6]) {
      ctx.moveTo(len * t, 0);
      ctx.lineTo(len * (t + 0.15), -len * 0.13);
      ctx.moveTo(len * t, 0);
      ctx.lineTo(len * (t + 0.15), len * 0.13);
    }
    ctx.lineWidth = Math.max(0.5, r * 0.025);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.stroke();
    ctx.restore();
  }
  // 実（少し下に寄せた丸）と、下に細い根
  const cy = r * 0.18;
  const br = r * 0.78;
  ctx.beginPath();
  ctx.moveTo(-r * 0.04, cy + br * 0.95);
  ctx.quadraticCurveTo(0, r * 1.04, r * 0.05, r * 1.0);
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.strokeStyle = shade(color, -0.3);
  ctx.stroke();
  ctx.save();
  ctx.translate(0, cy);
  ctx.beginPath();
  ctx.arc(0, 0, br, 0, Math.PI * 2);
  ctx.fillStyle = bulge(ctx, br, shade(color, 0.6), color, shade(color, -0.35));
  ctx.fill();
  ctx.lineWidth = Math.max(0.8, r * 0.04);
  ctx.strokeStyle = shade(color, -0.4);
  ctx.stroke();
  // 葉の付け根のくぼみ
  ctx.beginPath();
  ctx.ellipse(0, -br * 0.82, br * 0.22, br * 0.08, 0, 0, Math.PI * 2);
  ctx.fillStyle = shade(color, -0.25);
  ctx.fill();
  // つや
  ctx.beginPath();
  ctx.ellipse(-br * 0.38, -br * 0.3, br * 0.16, br * 0.3, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fill();
  ctx.restore();
}

export type DrawState = { now: number; showHeld: boolean };

/** 終わった瞬間の貯金箱の中身（結果画面・結果画像で描き直すため） */
export type BoxSnapshot = {
  width: number;
  height: number;
  dangerLineY: number;
  turnipColor: string;
  balls: { kind: 'money' | 'stock'; x: number; y: number; r: number; angle: number; tier: number; oku: number }[];
};

export function snapshotBox(game: Game): BoxSnapshot {
  const { width, height, dangerLineY } = game.config.box;
  return {
    width,
    height,
    dangerLineY,
    turnipColor: turnipColor(game.price(), game.avgCost(), game.config.stock.color),
    balls: game.world.balls().map((b) => ({
      kind: b.kind,
      x: b.body.position.x,
      y: b.body.position.y,
      r: b.r,
      angle: b.body.angle,
      tier: b.kind === 'money' ? b.tier : -1,
      oku: b.kind === 'money' ? b.oku || 1 : 0,
    })),
  };
}

/** 貯金箱の中身の絵を (0,0) から幅 width × 高さ height（箱の座標）で描く。外側で scale しておく */
export function drawSnapshot(ctx: CanvasRenderingContext2D, s: BoxSnapshot): void {
  ctx.fillStyle = '#fbf6ea';
  ctx.fillRect(0, 0, s.width, s.height);
  ctx.save();
  ctx.strokeStyle = 'rgba(226,59,59,0.35)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(0, s.dangerLineY);
  ctx.lineTo(s.width, s.dangerLineY);
  ctx.stroke();
  ctx.restore();
  for (const b of s.balls) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    if (b.kind === 'money') drawMoney(ctx, b.tier, b.r, b.oku);
    else drawTurnip(ctx, b.r, s.turnipColor);
    ctx.restore();
  }
  // 箱の枠（左右と底）
  ctx.strokeStyle = '#c8b88f';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, s.height);
  ctx.lineTo(s.width, s.height);
  ctx.lineTo(s.width, 0);
  ctx.stroke();
}

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

  const kabu = turnipColor(game.price(), game.avgCost(), game.config.stock.color);
  for (const b of game.world.balls()) {
    ctx.save();
    ctx.translate(b.body.position.x, b.body.position.y);
    ctx.rotate(b.body.angle);
    if (b.kind === 'money') drawMoney(ctx, b.tier, b.r, b.oku || 1);
    else drawTurnip(ctx, b.r, kabu);
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

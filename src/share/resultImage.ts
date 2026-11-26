// 結果画像（1200×630。設計書 6章）：終わったときの貯金箱の中身＋合計＋称号。ブラウザの中で作る

import { siteUrl } from '../data';
import type { LastResult } from '../game/lastResult';
import { t } from '../i18n';
import type { MessageKey } from '../i18n/types';
import { yen } from '../money';
import { drawSnapshot } from '../ui/render';

export const IMAGE_W = 1200;
export const IMAGE_H = 630;
const FONT = 'system-ui, "Hiragino Sans", "Noto Sans JP", sans-serif';

/** 文字を幅 maxW に収める大きさで書く */
function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, weight: number, maxW: number, color: string) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  const w = ctx.measureText(text).width;
  if (w > maxW) ctx.font = `${weight} ${(size * maxW) / w}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/** 結果画像を canvas に描く */
export function drawResultImage(canvas: HTMLCanvasElement, r: LastResult): void {
  canvas.width = IMAGE_W;
  canvas.height = IMAGE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 見た目は案B「あたたか」（2026-11-26）：クリームからうすいコーラルへ
  const bg = ctx.createLinearGradient(0, 0, 0, IMAGE_H);
  bg.addColorStop(0, '#fff7ef');
  bg.addColorStop(1, '#ffe6d6');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, IMAGE_W, IMAGE_H);

  // 左：貯金箱の中身
  const boxH = 520;
  const scale = boxH / r.box.height;
  const boxW = r.box.width * scale;
  ctx.save();
  ctx.translate(48, 50);
  ctx.scale(scale, scale);
  drawSnapshot(ctx, r.box);
  ctx.restore();

  // 右：作品名・合計・内訳・称号
  const x = 48 + boxW + 56;
  const maxW = IMAGE_W - x - 48;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  fitText(ctx, t('meta.name'), x, 112, 44, 900, maxW, '#e0643f');
  fitText(ctx, t('result.total', { yen: yen(r.total) }), x, 222, 76, 800, maxW, '#1a1f2b');
  fitText(ctx, t('result.breakdown', { cash: yen(r.cash), stock: yen(r.stock) }), x, 278, 32, 500, maxW, '#8a6a5c');

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(x - 20, 320, maxW + 40, 150, 18);
  ctx.fill();
  fitText(ctx, t('result.title', { title: t(`titles.${r.title}` as MessageKey) }), x, 386, 46, 800, maxW, '#e0643f');
  fitText(ctx, t(`titleLines.${r.title}` as MessageKey), x, 438, 28, 500, maxW, '#1a1f2b');

  // 下：注意書きと URL
  fitText(ctx, t('image.note'), x, 548, 22, 500, maxW, '#8a6a5c');
  const url = siteUrl().replace(/^https?:\/\//, '').replace(/\/$/, '');
  fitText(ctx, url, x, 584, 24, 600, maxW, '#8a6a5c');
}

export function resultImageBlob(r: LastResult): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  drawResultImage(canvas, r);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

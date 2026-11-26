// 株価のチャート（2026-11-26 オーナー指定：高品質に。最初は線、ローソク足に切り替えられる）
// 右に値段の目盛り、今の値段の札、平均取得価額の点線、暴落の印。値段は丸める前の株価（history）

import { t } from '../../i18n';
import { moneyUnits } from '../../money';

/** チャートの目盛り・札の金額：4.4万円・12万円・1.3億円（チャートは細かい動きを見せるので小数1けた） */
export function chartYen(v: number): string {
  const u = moneyUnits();
  const f = (n: number, unit: string) => `${n < 100 ? Number(n.toFixed(1)) : Math.round(n).toLocaleString(u.locale)}${unit}${u.symbol}`;
  if (v >= 1e8) return f(v / 1e8, u.oku);
  if (v >= 1e4) return f(v / 1e4, u.man);
  return `${Math.round(v).toLocaleString(u.locale)}${u.symbol}`;
}

export type ChartMode = 'line' | 'candle';

/** 見せる玉の数（最近の何玉ぶん） */
const DROPS = 72;
/** ローソク足1本が何玉ぶんか */
const PER_CANDLE = 4;
const UP = '#d93a3f';
const DOWN = '#2f6be0';
const GOLD = '#c98a12';
const GRID = '#ece6d8';
const SUB = '#8a8f9c';
const FONT = 'system-ui, "Hiragino Sans", "Noto Sans JP", sans-serif';

export type ChartInput = {
  /** history[d]＝ d 玉目を落としたあとの株価（history[0] は始まり） */
  history: readonly number[];
  crashDrops: readonly number[];
  /** 平均取得価額（株がなければ 0） */
  avgCost: number;
  mode: ChartMode;
};

/** 目盛りにちょうどよい間（1・2・5 × 10 のべき） */
function niceStep(range: number, count: number): number {
  const raw = range / count;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

export function drawChart(canvas: HTMLCanvasElement, input: ChartInput, W = 320, H = 190): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const { history, mode } = input;
  const end = history.length - 1; // 今の玉の番号
  const start = Math.max(0, end - DROPS);
  const pts = history.slice(start);

  // 描く場所
  const L = 8;
  const R = W - 58; // 右は目盛りの文字
  const T = 12;
  const B = H - 14;

  // 値段の幅（平均取得価額も入れる）
  let lo = Math.min(...pts);
  let hi = Math.max(...pts);
  if (input.avgCost > 0) {
    lo = Math.min(lo, input.avgCost);
    hi = Math.max(hi, input.avgCost);
  }
  const pad = (hi - lo || hi * 0.2 || 1) * 0.08;
  lo = Math.max(0, lo - pad);
  hi += pad;
  const x = (d: number) => L + ((d - start) / Math.max(1, DROPS)) * (R - L);
  const y = (v: number) => B - ((v - lo) / (hi - lo)) * (B - T);

  // 目盛りと横線（今の値段の札と重なる目盛りの文字は書かない）
  const tagY = Math.min(Math.max(y(history[end]!), T + 8), B - 8);
  const step = niceStep(hi - lo, 4);
  ctx.font = `600 10px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) {
    const yy = Math.round(y(v)) + 0.5;
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(L, yy);
    ctx.lineTo(R, yy);
    ctx.stroke();
    if (Math.abs(yy - tagY) < 14) continue;
    ctx.fillStyle = SUB;
    ctx.fillText(chartYen(v), R + 6, yy);
  }

  // 平均取得価額の点線
  if (input.avgCost > 0) {
    const ya = y(input.avgCost);
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#5f6779';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(L, ya);
    ctx.lineTo(R, ya);
    ctx.stroke();
    ctx.restore();
    ctx.font = `700 10px ${FONT}`;
    ctx.fillStyle = '#5f6779';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(t('kabu.avgLine'), L + 2, ya - 2);
  }

  if (mode === 'line') {
    // 面（上から下へ薄くなる金色）
    const grad = ctx.createLinearGradient(0, T, 0, B);
    grad.addColorStop(0, 'rgba(201,138,18,0.28)');
    grad.addColorStop(1, 'rgba(201,138,18,0)');
    const path = () => {
      ctx.beginPath();
      pts.forEach((v, i) => {
        const px = x(start + i);
        const py = y(v);
        if (i === 0) ctx.moveTo(px, py);
        else {
          // 前の点との間をなめらかに
          const pv = pts[i - 1]!;
          const mx = (x(start + i - 1) + px) / 2;
          ctx.quadraticCurveTo(x(start + i - 1), y(pv), mx, (y(pv) + py) / 2);
          if (i === pts.length - 1) ctx.lineTo(px, py);
        }
      });
    };
    path();
    ctx.lineTo(x(end), B);
    ctx.lineTo(x(start), B);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    path();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  } else {
    // ローソク足：PER_CANDLE 玉ごとに1本（始め・高い・安い・終わり）
    const slot = ((R - L) / DROPS) * PER_CANDLE;
    const bw = Math.max(2, slot * 0.62);
    for (let s = end; s > start; s -= PER_CANDLE) {
      const a = Math.max(start, s - PER_CANDLE);
      const seg = history.slice(a, s + 1);
      const open = seg[0]!;
      const close = seg[seg.length - 1]!;
      const high = Math.max(...seg);
      const low = Math.min(...seg);
      const cx = (x(a) + x(s)) / 2;
      const color = close >= open ? UP : DOWN;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(cx) + 0.5, y(high));
      ctx.lineTo(Math.round(cx) + 0.5, y(low));
      ctx.stroke();
      const top = y(Math.max(open, close));
      const h = Math.max(1.5, Math.abs(y(open) - y(close)));
      ctx.fillStyle = color;
      ctx.fillRect(cx - bw / 2, top, bw, h);
    }
  }

  // 暴落の印（▼）
  ctx.fillStyle = '#e23b3b';
  for (const d of input.crashDrops) {
    if (d <= start || d > end) continue;
    const px = x(d);
    const py = Math.max(T + 2, y(history[d - 1] ?? history[d]!) - 8);
    ctx.beginPath();
    ctx.moveTo(px - 4, py - 5);
    ctx.lineTo(px + 4, py - 5);
    ctx.lineTo(px, py + 1);
    ctx.closePath();
    ctx.fill();
  }

  // 今の値段の点と札
  const last = history[end]!;
  const ly = y(last);
  if (mode === 'line') {
    ctx.beginPath();
    ctx.arc(x(end), ly, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(201,138,18,0.25)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x(end), ly, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = GOLD;
    ctx.fill();
  }
  const tag = chartYen(last);
  ctx.font = `800 10px ${FONT}`;
  const tw = Math.min(W - R - 2, ctx.measureText(tag).width + 10);
  const ty = tagY;
  ctx.fillStyle = mode === 'line' ? GOLD : last >= (history[end - 1] ?? last) ? UP : DOWN;
  ctx.beginPath();
  ctx.roundRect(R + 2, ty - 8, tw, 16, 4);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(tag, R + 7, ty + 0.5, tw - 8);
}

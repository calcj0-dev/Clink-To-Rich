// かぶ（株価）の画面（2026-11-25 オーナー決定）：下の「かぶ」ボタンで開く。
// 株価のチャートを見て「買」で1株ずつ買える。「売」はなし。開いている間は玉の動きを止め、買ったかぶは閉じたら降る

import { playSound } from '../../audio';
import type { Game } from '../../core/game';
import { turnipColor } from '../../core/rules';
import { t } from '../../i18n';
import { money } from '../../money';
import { button, h } from '../dom';
import { drawTurnip } from '../render';

/** チャートに出す玉の数（設計書 2章「最近60玉」） */
const CHART_DROPS = 60;
const CHART_W = 320;
const CHART_H = 150;
const ICON = 28;

function drawChart(canvas: HTMLCanvasElement, history: readonly number[]): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = CHART_W * dpr;
  canvas.height = CHART_H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, CHART_W, CHART_H);

  const pts = history.slice(-(CHART_DROPS + 1));
  const lo = Math.min(...pts);
  const hi = Math.max(...pts);
  const pad = 10;
  const span = hi - lo || hi * 0.1 || 1;
  const x = (i: number) => pad + (i / Math.max(1, CHART_DROPS)) * (CHART_W - pad * 2);
  const y = (v: number) => CHART_H - pad - ((v - lo) / span) * (CHART_H - pad * 2);

  // 目盛りの代わりに薄い横線
  ctx.strokeStyle = '#ece6d8';
  ctx.lineWidth = 1;
  for (let k = 0; k <= 3; k++) {
    const yy = pad + (k / 3) * (CHART_H - pad * 2);
    ctx.beginPath();
    ctx.moveTo(pad, yy);
    ctx.lineTo(CHART_W - pad, yy);
    ctx.stroke();
  }

  // 面と線
  ctx.beginPath();
  pts.forEach((v, i) => (i === 0 ? ctx.moveTo(x(i), y(v)) : ctx.lineTo(x(i), y(v))));
  ctx.lineTo(x(pts.length - 1), CHART_H - pad);
  ctx.lineTo(x(0), CHART_H - pad);
  ctx.closePath();
  ctx.fillStyle = 'rgba(201,138,18,0.12)';
  ctx.fill();
  ctx.beginPath();
  pts.forEach((v, i) => (i === 0 ? ctx.moveTo(x(i), y(v)) : ctx.lineTo(x(i), y(v))));
  ctx.strokeStyle = '#c98a12';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // 今の株価の点
  const last = pts.length - 1;
  ctx.beginPath();
  ctx.arc(x(last), y(pts[last]!), 4, 0, Math.PI * 2);
  ctx.fillStyle = '#c98a12';
  ctx.fill();
}

/** かぶの画面を開く。閉じたら onClose を呼ぶ */
export function openKabuPanel(game: Game, onClose: () => void): void {
  const chart = h('canvas', { className: 'kabu-chart' });
  const price = h('p', { className: 'kabu-price' });
  const icon = h('canvas', { className: 'kabu-icon' });
  const held = h('span');
  const avg = h('p', { className: 'kabu-sub' });
  const cash = h('p', { className: 'kabu-sub' });
  const status = h('p', { className: 'kabu-status', attrs: { role: 'status', 'aria-live': 'polite' } });
  const buyBtn = button(t('kabu.buy'), () => {
    const p = game.price();
    if (game.buy()) {
      status.textContent = t('buy.done', { yen: money(p) });
      playSound(game.config.sounds.buy);
    }
    refresh();
  }, 'btn btn-kabu-buy');

  const dialog = h('dialog', { className: 'modal kabu-panel' }, [
    h('h2', { className: 'modal-title', text: t('kabu.heading') }),
    chart,
    price,
    h('p', { className: 'kabu-held' }, [icon, held]),
    avg,
    cash,
    status,
    h('div', { className: 'kabu-actions' }, [buyBtn, button(t('common.close'), () => dialog.close(), 'btn')]),
    h('p', { className: 'game-note', text: t('hud.gameNote') }),
  ]);

  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  icon.width = ICON * dpr;
  icon.height = ICON * dpr;

  function refresh() {
    const play = game.play();
    price.textContent = t('buy.price', { yen: money(game.price()) });
    held.textContent = t('kabu.held', { n: play.shares });
    avg.textContent = play.shares > 0 ? t('kabu.avg', { yen: money(game.avgCost()) }) : '';
    avg.hidden = play.shares === 0;
    cash.textContent = t('kabu.cash', { yen: money(game.cash()) });
    buyBtn.disabled = !game.canBuy();
    const ictx = icon.getContext('2d');
    if (ictx) {
      ictx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ictx.clearRect(0, 0, ICON, ICON);
      ictx.translate(ICON / 2, ICON / 2 + 1);
      drawTurnip(ictx, ICON / 2 - 2, turnipColor(game.price(), game.avgCost(), game.config.stock.color));
    }
  }

  drawChart(chart, game.market.history);
  refresh();
  dialog.addEventListener('close', () => {
    dialog.remove();
    onClose();
  });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  document.body.append(dialog);
  dialog.showModal();
}

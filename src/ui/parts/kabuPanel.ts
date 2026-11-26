// かぶ（株価）の画面（2026-11-25 オーナー決定）：下の「かぶ」ボタンで開く。
// 株価のチャートを見て「買」で1株ずつ買える。「売」はなし。開いている間は玉の動きを止め、買ったかぶは閉じたら降る

import { playSound } from '../../audio';
import type { Game } from '../../core/game';
import { turnipColor } from '../../core/rules';
import { t } from '../../i18n';
import { money } from '../../money';
import { button, h } from '../dom';
import { settings } from '../../settings';
import { drawTurnip } from '../render';
import { drawChart, type ChartMode } from './chart';

const ICON = 28;

/** かぶの画面を開く。閉じたら onClose を呼ぶ */
export function openKabuPanel(game: Game, onClose: () => void): void {
  const chart = h('canvas', { className: 'kabu-chart' });
  // 線／ローソク足の切り替え（最初は線。選んだものは端末に保存）
  const modeBtns = (['line', 'candle'] as ChartMode[]).map((m) =>
    h('button', { className: 'seg-btn', text: t(m === 'line' ? 'kabu.line' : 'kabu.candle'), attrs: { type: 'button' } }),
  );
  const paintChart = () => {
    const mode = settings.chart;
    modeBtns.forEach((btn, i) => btn.setAttribute('aria-pressed', String((i === 0 ? 'line' : 'candle') === mode)));
    drawChart(chart, { history: game.market.history, crashDrops: game.market.crashDrops, avgCost: game.avgCost(), mode });
  };
  modeBtns.forEach((btn, i) =>
    btn.addEventListener('click', () => {
      settings.chart = i === 0 ? 'line' : 'candle';
      paintChart();
    }),
  );
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
    h('div', { className: 'seg' }, modeBtns),
    chart,
    price,
    h('p', { className: 'kabu-held' }, [icon, held]),
    avg,
    cash,
    status,
    h('div', { className: 'kabu-actions' }, [buyBtn, button(t('common.close'), () => dialog.close(), 'btn')]),
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
    paintChart(); // 平均取得価額の線を合わせる
    const ictx = icon.getContext('2d');
    if (ictx) {
      ictx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ictx.clearRect(0, 0, ICON, ICON);
      ictx.translate(ICON / 2, ICON / 2 + 1);
      drawTurnip(ictx, ICON / 2 - 2, turnipColor(game.price(), game.avgCost(), game.config.stock.color));
    }
  }

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
  // 開いたときに切り替えボタンへ自動で付くフォーカスの枠を出さない
  (document.activeElement as HTMLElement | null)?.blur();
}

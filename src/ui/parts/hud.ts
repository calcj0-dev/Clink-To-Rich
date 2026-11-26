// 上の表示（設計書 2章 S2）：合計・次のお金・現金／株（株数）・1株の値段

import type { Game } from '../../core/game';
import { t } from '../../i18n';
import { money } from '../../money';
import { h } from '../dom';
import { drawMoney } from '../render';
import { soundButton } from './soundButton';

const NEXT_SIZE = 40;

/** 中身が変わったときだけ文字を書き換える */
function setText(el: HTMLElement, text: string) {
  if (el.textContent !== text) el.textContent = text;
}

/** menuButton は右上（音のボタンの左）に置く一時停止のボタン */
export function hud(menuButton: HTMLElement) {
  const total = h('div', { className: 'hud-total' });
  const cash = h('span', { className: 'hud-cash' });
  const stock = h('span', { className: 'hud-stock' });
  const nextCanvas = h('canvas', { className: 'hud-next-coin' });
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  nextCanvas.width = NEXT_SIZE * dpr;
  nextCanvas.height = NEXT_SIZE * dpr;
  const nctx = nextCanvas.getContext('2d');
  let shownNext = -1;
  const sound = soundButton();

  const el = h('header', { className: 'hud' }, [
    h('div', { className: 'hud-main' }, [
      h('div', { className: 'hud-money' }, [total, h('div', { className: 'hud-sub' }, [cash, stock])]),
      h('div', { className: 'hud-next' }, [h('span', { className: 'hud-next-label', text: t('hud.next') }), nextCanvas]),
      h('div', { className: 'hud-buttons' }, [menuButton, sound.el]),
    ]),
  ]);

  function update(game: Game) {
    setText(total, t('hud.total', { yen: money(game.total()) }));
    setText(cash, t('hud.cash', { yen: money(game.cash()) }));
    setText(stock, `${t('hud.stock', { yen: money(game.stockValue()) })} (${t('hud.shares', { n: game.play().shares })})`);
    if (nctx && shownNext !== game.nextTier) {
      shownNext = game.nextTier;
      nctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      nctx.clearRect(0, 0, NEXT_SIZE, NEXT_SIZE);
      nctx.translate(NEXT_SIZE / 2, NEXT_SIZE / 2);
      // 実際の大きさの比のまま（降るお金で一番大きい100円玉＝株の玉の大きさが枠いっぱい）
      const fit = (NEXT_SIZE / 2 - 1) / game.config.stock.radius;
      const r = Math.min(NEXT_SIZE / 2 - 1, game.world.radiusOf(game.nextTier) * fit);
      drawMoney(nctx, game.nextTier, r);
    }
  }

  /** 暴落のとき、株の金額を一瞬赤くする */
  let flashTimer = 0;
  function flashStock() {
    stock.classList.remove('flash');
    void stock.offsetWidth; // もう一度アニメーションさせるため
    stock.classList.add('flash');
    clearTimeout(flashTimer);
    flashTimer = window.setTimeout(() => stock.classList.remove('flash'), 1200);
  }

  function dispose() {
    clearTimeout(flashTimer);
    sound.dispose();
  }

  return { el, update, flashStock, dispose };
}

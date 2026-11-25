// S2 遊ぶ画面（設計書 1.1・2章・5.7）
// 画面（ボタンと進化の輪を除く）を触って左右に動かし、離すと落ちる（スイカゲームと同じ）

import { config, currency } from '../../data';
import { createGame, type GameEvent } from '../../core/game';
import { setLastResult } from '../../game/lastResult';
import { t } from '../../i18n';
import { money } from '../../money';
import { load, save } from '../../storage';
import type { ScreenFactory } from '../app';
import { h } from '../dom';
import { evolutionRing } from '../parts/evolution';
import { hud } from '../parts/hud';
import { openKabuPanel } from '../parts/kabuPanel';
import { drawBox, snapshotBox } from '../render';

/** 1フレームで進める時間の上限（タブを戻したときに一気に進まないように） */
const MAX_FRAME_MS = 50;
const TOAST_MS = 1600;
/** 「貯金箱が割れました」を見せてから結果へ進むまで */
const OVER_SHOW_MS = 1800;

export const playScreen: ScreenFactory = (app) => {
  const game = createGame(config, currency, Math.floor(Math.random() * 2 ** 31));
  const W = config.box.width;
  const H = config.box.height;

  const top = hud();
  const evo = evolutionRing();
  const canvas = h('canvas', { className: 'box-canvas' });
  const toast = h('div', { className: 'toast', attrs: { role: 'status', 'aria-live': 'polite' } });
  const stage = h('div', { className: 'stage' }, [canvas, toast]);
  const buyPrice = h('span', { className: 'buy-price' });
  const buyBtn = h('button', { className: 'btn btn-buy', attrs: { type: 'button' } }, [
    h('span', { className: 'buy-label', text: t('kabu.button') }),
    buyPrice,
  ]);
  const overlay = h('div', { className: 'over', attrs: { hidden: '' } });

  const el = h('section', { className: 'screen screen-play' }, [
    top.el,
    stage,
    evo.el,
    buyBtn,
    h('p', { className: 'game-note', text: t('hud.gameNote') }),
    overlay,
  ]);

  // ---- 箱の大きさを画面に合わせる ----
  const ctx = canvas.getContext('2d');
  let scale = 1;
  let dpr = 1;
  const resize = () => {
    const r = stage.getBoundingClientRect();
    scale = Math.max(0.1, Math.min(r.width / W, r.height / H));
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.style.width = `${W * scale}px`;
    canvas.style.height = `${H * scale}px`;
    canvas.width = Math.round(W * scale * dpr);
    canvas.height = Math.round(H * scale * dpr);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(stage);

  // ---- 落とす操作 ----
  const toBoxX = (clientX: number) => {
    const r = canvas.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * W;
  };
  let aiming = false;
  const isControl = (e: Event) => (e.target as HTMLElement).closest('button, .evo, .over') !== null;
  const onDown = (e: PointerEvent) => {
    if (isControl(e) || game.over) return;
    aiming = true;
    game.setDropX(toBoxX(e.clientX));
  };
  const onMove = (e: PointerEvent) => {
    // マウスは押していなくても位置が動く（PC）。指は触っている間だけ
    if (aiming || e.pointerType === 'mouse') game.setDropX(toBoxX(e.clientX));
  };
  const onUp = (e: PointerEvent) => {
    if (!aiming) return;
    aiming = false;
    game.setDropX(toBoxX(e.clientX));
    game.drop();
  };
  const onCancel = () => {
    aiming = false;
  };
  el.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);

  // ---- かぶ：チャートを開く。開いている間は玉の動きを止める ----
  let paused = false;
  buyBtn.addEventListener('click', () => {
    if (game.over || paused) return;
    paused = true;
    aiming = false;
    openKabuPanel(game, () => {
      paused = false;
    });
  });

  // ---- 出来事 ----
  let toastTimer = 0;
  const showToast = (text: string, kind = '') => {
    toast.textContent = text;
    toast.className = `toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => (toast.className = 'toast'), TOAST_MS);
  };
  const offEvent = game.onEvent((e: GameEvent) => {
    if (e.type === 'oku') showToast(t('events.oku'), 'toast-oku');
    if (e.type === 'crash') {
      showToast(t('events.crash'), 'toast-crash');
      top.flashStock();
      stage.classList.remove('shake');
      void stage.offsetWidth; // もう一度ゆらすため
      stage.classList.add('shake');
    }
    if (e.type === 'over') showOver();
  });

  /** 「貯金箱が割れました」を少し見せてから結果へ。ベストはここで端末に保存する */
  let overTimer = 0;
  function showOver() {
    const result = game.result();
    const prevBest = Number(load('best', '0')) || 0;
    const newBest = result.total > prevBest;
    if (newBest) save('best', String(result.total));
    setLastResult({ ...result, box: snapshotBox(game), newBest, best: Math.max(prevBest, result.total) });

    overlay.replaceChildren(
      h('div', { className: 'over-card' }, [
        h('p', { className: 'over-title', text: t('events.over') }),
        h('p', { className: 'over-total', text: t('result.total', { yen: money(result.total) }) }),
      ]),
    );
    overlay.hidden = false;
    overTimer = window.setTimeout(() => app.go('result'), OVER_SHOW_MS);
  }

  // 開発用：?demo=40 で40玉を自動で落としてから始める（見た目の確認用。公開版では無視する）
  if (import.meta.env.DEV) {
    const q = new URLSearchParams(location.search);
    const n = Number(q.get('demo') ?? 0);
    for (let i = 0; i < n && !game.over; i++) {
      game.drop(30 + Math.random() * (W - 60));
      if (q.has('kabu') && game.play().shares < 6) game.buy(); // &kabu=1：買えるときにかぶを買う（6株まで）
      game.update(700);
    }
    if (q.has('panel')) queueMicrotask(() => buyBtn.click()); // &panel=1：かぶの画面を開く
  }

  // ---- 毎フレーム ----
  let raf = 0;
  let last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(now - last, MAX_FRAME_MS);
    last = now;
    if (!paused) game.update(dt);
    if (ctx) {
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
      drawBox(ctx, game, { now, showHeld: game.canDrop() });
    }
    top.update(game);
    const priceText = t('buy.price', { yen: money(game.price()) });
    if (buyPrice.textContent !== priceText) buyPrice.textContent = priceText;
    buyBtn.disabled = game.over;
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame((now) => {
    last = now;
    resize();
    frame(now);
  });

  return {
    el,
    unmount() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      clearTimeout(toastTimer);
      clearTimeout(overTimer);
      offEvent();
      evo.dispose();
      top.dispose();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    },
  };
};

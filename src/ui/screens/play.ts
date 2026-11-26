// S2 遊ぶ画面（設計書 1.1・2章・5.7）
// 画面（ボタンと進化の輪を除く）を触って左右に動かし、離すと落ちる（スイカゲームと同じ）

import { config, currency } from '../../data';
import { createGame, type GameEvent } from '../../core/game';
import { playSound } from '../../audio';
import { setLastResult } from '../../game/lastResult';
import { t } from '../../i18n';
import { yen } from '../../money';
import { settings } from '../../settings';
import { load, save } from '../../storage';
import type { ScreenFactory } from '../app';
import { h } from '../dom';
import { openMoneyPanel } from '../parts/evolution';
import { hud } from '../parts/hud';
import { openKabuPanel } from '../parts/kabuPanel';
import { openPauseMenu, pauseButton } from '../parts/pauseMenu';
import { drawBox, snapshotBox } from '../render';

/** 1フレームで進める時間の上限（タブを戻したときに一気に進まないように） */
const MAX_FRAME_MS = 50;
const TOAST_MS = 1600;
/** 「貯金箱が割れました」を見せてから結果へ進むまで */
const OVER_SHOW_MS = 1800;

/** 出来事の効果音（設計書 1.9）。音の名前は config.json の sounds */
function playEventSound(e: GameEvent): void {
  const s = config.sounds;
  const tiers = currency.tiers;
  // 小さいお金ほど高い音（0〜1）
  const pitch = (tier: number) => tier / Math.max(1, tiers.length - 1);
  if (e.type === 'drop') playSound(s.coin, pitch(e.tier));
  else if (e.type === 'merge') playSound(s[tiers[e.to]?.look ?? 'coin'], pitch(e.to));
  else if (e.type === 'crash') playSound(s.crash);
  else if (e.type === 'oku') playSound(s.oku);
  else if (e.type === 'over') playSound(s.over);
}

export const playScreen: ScreenFactory = (app) => {
  const game = createGame(config, currency, Math.floor(Math.random() * 2 ** 31));
  const W = config.box.width;
  const H = config.box.height;

  let aiming = false;
  // 一時停止・お金の種類・かぶの画面を開いている間は玉の動きを止める
  let paused = false;
  const pause = (open: (resume: () => void) => void) => {
    if (game.over || paused) return;
    paused = true;
    aiming = false;
    open(() => {
      paused = false;
    });
  };
  const top = hud(pauseButton(() => pause((resume) => openPauseMenu(resume, () => app.go('title')))));
  const moneyBtn = h('button', { className: 'btn btn-money', text: t('evo.button'), attrs: { type: 'button' } });
  moneyBtn.addEventListener('click', () => pause((resume) => openMoneyPanel(resume)));
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
    h('div', { className: 'bottom-row' }, [moneyBtn, buyBtn]),
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
  const isControl = (e: Event) => (e.target as HTMLElement).closest('button, .over') !== null;
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

  // ---- かぶ：チャートを開く ----
  buyBtn.addEventListener('click', () => pause((resume) => openKabuPanel(game, resume)));

  // ---- 出来事 ----
  let toastTimer = 0;
  const showToast = (text: string, kind = '') => {
    toast.textContent = text;
    toast.className = `toast show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => (toast.className = 'toast'), TOAST_MS);
  };
  const offEvent = game.onEvent((e: GameEvent) => {
    playEventSound(e);
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
        h('p', { className: 'over-total', text: t('result.total', { yen: yen(result.total) }) }),
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
    const cm = q.get('chart'); // &chart=candle：チャートをローソク足に
    if (cm === 'line' || cm === 'candle') settings.chart = cm;
    if (q.has('panel')) queueMicrotask(() => buyBtn.click()); // &panel=1：かぶの画面を開く
    // &open=money・menu：お金の種類・一時停止のメニューを開く
    if (q.get('open') === 'money') queueMicrotask(() => moneyBtn.click());
    if (q.get('open') === 'menu') queueMicrotask(() => el.querySelector<HTMLButtonElement>('.hud-buttons .icon-btn')?.click());
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
    const priceText = t('buy.price', { yen: yen(game.price()) });
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
      top.dispose();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    },
  };
};

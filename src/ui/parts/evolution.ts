// 進化の輪（設計書 2章 M3）：13段を小さく並べ、タップでそのお金のひとことを吹き出しで出す

import { currency } from '../../data';
import { getLocale } from '../../i18n';
import { h } from '../dom';
import { drawMoney } from '../render';

const SIZE = 26;
const BUBBLE_MS = 2600;

export function evolutionRing(): { el: HTMLElement; dispose: () => void } {
  const maxR = currency.tiers[currency.tiers.length - 1]!.radius;
  const lang = getLocale();
  const bubble = h('div', { className: 'evo-bubble', attrs: { role: 'status', 'aria-live': 'polite' } });
  let timer = 0;

  const items = currency.tiers.map((tier, i) => {
    const canvas = h('canvas', { className: 'evo-coin' });
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.translate(SIZE / 2, SIZE / 2);
      // 大きさの違いが分かるよう、一番大きいものを枠いっぱいにして比で縮める（小さすぎないよう下限あり）
      const r = Math.max(5.5, (SIZE / 2 - 1) * (tier.radius / maxR));
      drawMoney(ctx, i, r, 1, false);
    }
    const btn = h('button', { className: 'evo-item', attrs: { type: 'button', 'aria-label': tier.label[lang] ?? tier.id } }, [canvas]);
    btn.addEventListener('click', () => {
      bubble.replaceChildren(h('strong', { text: tier.label[lang] ?? '' }), h('span', { text: tier.line[lang] ?? '' }));
      bubble.style.setProperty('--x', `${((i + 0.5) / currency.tiers.length) * 100}%`);
      bubble.classList.add('show');
      clearTimeout(timer);
      timer = window.setTimeout(() => bubble.classList.remove('show'), BUBBLE_MS);
    });
    return btn;
  });

  const el = h('div', { className: 'evo' }, [bubble, h('div', { className: 'evo-row' }, items)]);
  return { el, dispose: () => clearTimeout(timer) };
}

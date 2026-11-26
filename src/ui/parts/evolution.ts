// お金の種類（進化の輪。設計書 2章 M3）：下の「お金の種類」ボタンで開く（2026-11-26 オーナー指定）。
// 13段を「→」でつないで並べ、変わっていく順が分かるようにする。お金をタップするとひとことを出す。
// 開いている間は玉の動きを止める（かぶの画面と同じ）

import { currency } from '../../data';
import { getLocale, t } from '../../i18n';
import { button, h } from '../dom';
import { drawMoney } from '../render';

const SIZE = 46;

export function openMoneyPanel(onClose: () => void): void {
  const lang = getLocale();
  const maxR = currency.tiers[currency.tiers.length - 1]!.radius;
  const line = h('p', { className: 'evo-line', attrs: { role: 'status', 'aria-live': 'polite' }, text: t('evo.hint') });
  const dpr = Math.min(window.devicePixelRatio || 1, 3);

  const cells: HTMLElement[] = [];
  currency.tiers.forEach((tier, i) => {
    const canvas = h('canvas', { className: 'evo-coin' });
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.translate(SIZE / 2, SIZE / 2);
      // 大きさの違いが分かるよう、一番大きいものを枠いっぱいにして比で縮める（小さすぎないよう下限あり）
      const r = Math.max(12, (SIZE / 2 - 2) * (tier.radius / maxR));
      drawMoney(ctx, i, r, 1, r >= 14);
    }
    const name = tier.label[lang] ?? tier.id;
    const item = h('button', { className: 'evo-item', attrs: { type: 'button', 'aria-label': name } }, [
      canvas,
      h('span', { className: 'evo-name', text: name }),
    ]);
    item.addEventListener('click', () => {
      line.replaceChildren(h('strong', { text: name }), h('span', { text: tier.line[lang] ?? '' }));
      for (const c of cells) c.classList.toggle('on', c === item);
    });
    cells.push(item);
  });

  // 「お金 → お金 → …」の順に並べる（折り返しても順が分かるよう、矢印はお金の後ろに付ける）
  const flow = h(
    'div',
    { className: 'evo-flow' },
    cells.map((c, i) =>
      h('div', { className: 'evo-step' }, [c, i < cells.length - 1 ? h('span', { className: 'evo-arrow', text: '→', attrs: { 'aria-hidden': 'true' } }) : null]),
    ),
  );

  const dialog = h('dialog', { className: 'modal evo-panel' }, [
    h('h2', { className: 'modal-title', text: t('evo.heading') }),
    flow,
    line,
    button(t('common.close'), () => dialog.close(), 'btn'),
  ]);
  dialog.addEventListener('close', () => {
    dialog.remove();
    onClose();
  });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  document.body.append(dialog);
  dialog.showModal();
  (document.activeElement as HTMLElement | null)?.blur();
}

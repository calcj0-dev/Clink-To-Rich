// ゲーム中のメニュー（2026-11-26 オーナー指定：ゲーム中にタイトルへ戻れるように）。
// 右上の一時停止ボタンで開き、開いている間は玉の動きを止める。「続ける」「タイトルへ」

import { t } from '../../i18n';
import { button, h } from '../dom';

const PAUSE_ICON =
  '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>';

export function pauseButton(onClick: () => void): HTMLButtonElement {
  const el = h('button', { className: 'icon-btn', attrs: { type: 'button', 'aria-label': t('menu.open') }, on: { click: onClick } });
  el.innerHTML = PAUSE_ICON;
  return el;
}

/** 一時停止のメニューを開く。「続ける」なら onResume、「タイトルへ」なら onTitle */
export function openPauseMenu(onResume: () => void, onTitle: () => void): void {
  let toTitle = false;
  const dialog = h('dialog', { className: 'modal pause-menu' }, [
    h('h2', { className: 'modal-title', text: t('menu.heading') }),
    h('div', { className: 'pause-actions' }, [
      button(t('menu.resume'), () => dialog.close(), 'btn btn-primary'),
      button(
        t('menu.toTitle'),
        () => {
          toTitle = true;
          dialog.close();
        },
        'btn',
      ),
    ]),
  ]);
  dialog.addEventListener('close', () => {
    dialog.remove();
    if (toTitle) onTitle();
    else onResume();
  });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  document.body.append(dialog);
  dialog.showModal();
  (document.activeElement as HTMLElement | null)?.blur();
}

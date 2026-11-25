// 重ねて開く画面：遊び方（M1）・プライバシー（M2）（設計書 2章）

import { config } from '../data';
import { t } from '../i18n';
import { button, externalLink, h } from './dom';

/** 見出し・中身・「閉じる」の重ね表示を開く。外側を押しても閉じる */
function openDialog(title: string, body: (Node | null)[]): void {
  const dialog = h('dialog', { className: 'modal' });
  dialog.append(h('h2', { className: 'modal-title', text: title }), ...body.filter((n): n is Node => n !== null), button(t('common.close'), () => dialog.close(), 'btn'));
  dialog.addEventListener('close', () => dialog.remove());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  document.body.append(dialog);
  dialog.showModal();
}

/** M1 遊び方。図は今は入れない（文だけ） */
export function openHow(): void {
  openDialog(t('title.how'), [h('p', { className: 'how-body', text: t('how.body') })]);
}

/** M2 プライバシーについて（U3。2026-11-25 オーナー決定：Vercel Analytics だけ） */
export function openPrivacy(): void {
  openDialog(t('privacy.title'), [
    h('div', { className: 'privacy-body' }, [
      h('p', { text: t('privacy.p1') }),
      h('p', { text: t('privacy.p2') }),
      h('p', { text: t('privacy.p3') }),
      h('p', { text: t('privacy.p4') }),
      h('p', {}, [externalLink(t('privacy.vercelPolicy'), config.links.vercelPrivacy)]),
    ]),
  ]);
}

// S3 結果（設計書 2章・1.6・1.8）
// 貯金箱の中身、合計と内訳、落とした回数、一番大きい億、株で増えた額、称号と一言、ベスト、シェア（#6）、もう一回、
// つくった人のアプリ（TAMERU）、フォロー、まとめサイトへのリンク、免責
// 「お金は寝かせるより働かせる」と「積立投資を超えろ！」は出さない（2026-11-25 オーナー決定）

import { config, currency } from '../../data';
import { getLastResult } from '../../game/lastResult';
import { t } from '../../i18n';
import type { MessageKey } from '../../i18n/types';
import { money } from '../../money';
import type { ScreenFactory } from '../app';
import { button, externalLink, h, linkButton } from '../dom';
import { openPrivacy } from '../modals';
import { drawSnapshot } from '../render';

/** 結果画面に出す貯金箱の絵の幅（CSS px） */
const BOX_W = 200;

export const resultScreen: ScreenFactory = (app) => {
  const r = getLastResult();
  if (!r) {
    // 結果がない（直接開いた）ときはタイトルへ
    queueMicrotask(() => app.go('title'));
    return { el: h('section', { className: 'screen' }) };
  }

  // 終わったときの貯金箱の中身
  const box = h('canvas', { className: 'result-box' });
  const scale = BOX_W / r.box.width;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  box.style.width = `${BOX_W}px`;
  box.style.height = `${r.box.height * scale}px`;
  box.width = Math.round(BOX_W * dpr);
  box.height = Math.round(r.box.height * scale * dpr);
  const ctx = box.getContext('2d');
  if (ctx) {
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    drawSnapshot(ctx, r.box);
  }

  const stockLine =
    r.shares === 0
      ? t('result.noStock')
      : r.stockGain >= 0
        ? t('result.stockGain', { yen: money(r.stockGain), paid: money(r.spent) })
        : t('result.stockLoss', { yen: money(-r.stockGain), paid: money(r.spent) });

  const el = h('section', { className: 'screen screen-result' }, [
    h('h1', { className: 'result-heading', text: t('result.heading') }),
    h('div', { className: 'result-top' }, [
      box,
      h('div', { className: 'result-nums' }, [
        h('p', { className: 'result-total', text: t('result.total', { yen: money(r.total) }) }),
        h('p', { className: 'result-sub', text: t('result.breakdown', { cash: money(r.cash), stock: money(r.stock) }) }),
        h('p', { className: 'result-sub', text: t('result.drops', { n: r.drops }) }),
        r.maxOku > 0 ? h('p', { className: 'result-sub', text: t('result.bigOku', { yen: money(r.maxOku * currency.topTier.unitValue) }) }) : null,
        h('p', { className: 'result-sub', text: stockLine }),
      ]),
    ]),
    h('div', { className: 'result-title' }, [
      h('p', { className: 'result-title-name', text: t('result.title', { title: t(`titles.${r.title}` as MessageKey) }) }),
      h('p', { className: 'result-title-line', text: t(`titleLines.${r.title}` as MessageKey) }),
    ]),
    h('p', { className: r.newBest ? 'result-best new' : 'result-best', text: r.newBest ? t('result.newBest') : t('result.best', { yen: money(r.best) }) }),
    // シェアと画像の保存は #6 で動かす
    h('div', { className: 'result-actions' }, [
      h('button', { className: 'btn btn-share', text: t('result.share'), attrs: { type: 'button', disabled: '' } }),
      h('button', { className: 'btn', text: t('result.save'), attrs: { type: 'button', disabled: '' } }),
    ]),
    button(t('result.retry'), () => app.go('play'), 'btn btn-primary btn-retry'),
    linkButton(t('result.toTitle'), () => app.go('title')),
    h('div', { className: 'tameru-box' }, [
      h('p', { className: 'apps-heading', text: t('result.apps') }),
      h('p', { className: 'tameru-heading', text: t('result.tameruHeading') }),
      h('p', { className: 'tameru-body', text: t('result.tameruBody') }),
      h('a', {
        className: 'btn btn-primary tameru-btn',
        text: t('result.tameruButton'),
        attrs: { href: config.links.tameru, target: '_blank', rel: 'noopener' },
      }),
    ]),
    h('div', { className: 'result-links' }, [
      externalLink(t('result.follow'), config.links.follow),
      externalLink(t('result.portal'), config.links.portal),
    ]),
    h('p', { className: 'disclaimer', text: t('title.disclaimer') }),
    h('p', {}, [linkButton(t('privacy.title'), openPrivacy)]),
  ]);
  return { el };
};

// S1 タイトル（設計書 2章）：名前、一言、はじめる、右上にバージョン、遊び方、ベスト、免責、まとめサイトへのリンク、クレジット、プライバシー
// 音のボタンは #7 で足す

import { config } from '../../data';
import { t } from '../../i18n';
import { money } from '../../money';
import { load } from '../../storage';
import { APP_VERSION } from '../../version';
import type { ScreenFactory } from '../app';
import { button, externalLink, h, linkButton } from '../dom';
import { openHow, openPrivacy } from '../modals';

export const titleScreen: ScreenFactory = (app) => {
  const best = Number(load('best', '0'));
  const el = h('section', { className: 'screen screen-title' }, [
    h('div', { className: 'top-bar' }, [h('span', { className: 'version', text: t('title.version', { version: APP_VERSION }) })]),
    h('h1', { className: 'title', text: t('meta.name') }),
    h('p', { className: 'tagline', text: t('meta.tagline') }),
    button(t('title.start'), () => app.go('play'), 'btn btn-primary btn-start'),
    linkButton(t('title.how'), openHow),
    best > 0 ? h('p', { className: 'best', text: t('title.best', { total: money(best) }) }) : null,
    h('div', { className: 'title-foot' }, [
      h('p', { className: 'disclaimer', text: t('title.disclaimer') }),
      h('p', {}, [externalLink(t('title.portal'), config.links.portal)]),
      h('p', {}, [externalLink(t('title.credit'), config.links.follow)]),
      h('p', {}, [linkButton(t('privacy.title'), openPrivacy)]),
    ]),
  ]);
  return { el };
};

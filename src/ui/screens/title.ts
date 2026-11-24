// S1 タイトル（設計書 2章）。#1 では名前・一言・右上のバージョンだけ。残りは #3〜#7 で足す

import { t } from '../../i18n';
import { APP_VERSION } from '../../version';
import type { ScreenFactory } from '../app';
import { h } from '../dom';

export const titleScreen: ScreenFactory = () => {
  const el = h('section', { className: 'screen screen-title' }, [
    h('div', { className: 'top-bar' }, [h('span', { className: 'version', text: t('title.version', { version: APP_VERSION }) })]),
    h('h1', { className: 'title', text: t('meta.name') }),
    h('p', { className: 'tagline', text: t('meta.tagline') }),
  ]);
  return { el };
};

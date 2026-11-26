// 投稿文（設計書 5.5）。文面は ja.json の share.text に置き、ここでは差し込む値を決めるだけ

import { config } from '../data';
import type { Result } from '../core/game';
import { t } from '../i18n';
import type { MessageKey } from '../i18n/types';
import { yen } from '../money';

/** 投稿文（URL は含めない。X の投稿画面・Web Share には URL を別に渡す） */
export function postText(r: Pick<Result, 'total' | 'cash' | 'stock' | 'title'>): string {
  return t('share.text', {
    total: yen(r.total),
    cash: yen(r.cash),
    stock: yen(r.stock),
    title: t(`titles.${r.title}` as MessageKey),
    hashtag: config.hashtag,
  });
}

/** X の文字数の数え方：URL は23、下の範囲の文字は1、それ以外（日本語など）は2。上限280 */
export const X_LIMIT = 280;
const X_URL_WEIGHT = 23;
const LIGHT_RANGES: [number, number][] = [
  [0, 4351],
  [8192, 8205],
  [8208, 8223],
  [8242, 8247],
];

export function xLength(text: string, withUrl = true): number {
  let n = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    n += LIGHT_RANGES.some(([a, b]) => code >= a && code <= b) ? 1 : 2;
  }
  return withUrl ? n + 1 + X_URL_WEIGHT : n;
}

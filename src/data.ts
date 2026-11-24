// JSON のデータを読み込む窓口（設計書 4章）。
// 中身の検査（お金の段・株・称号など）は #2 で足す

import configJson from './data/config.json';
import jpyJson from './data/currencies/JPY.json';
import jaJson from './data/i18n/ja.json';
import type { Locale } from './i18n/types';

export const config = configJson;

/** 通貨ごとのデータ。通貨を足すときは JSON を作ってここに1行足す（決定 #13） */
export const currencies = { JPY: jpyJson };

/** 言語ごとの文言。言語を足すときは JSON を作ってここに1行足す（共通の決まり C7） */
export const messagesByLocale = { ja: jaJson } satisfies Record<Locale, unknown>;

/** 作品のURL（環境変数 VITE_SITE_URL。設計書 5.1）。未設定なら今のページのURL */
export function siteUrl(): string {
  const v = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();
  if (v) return v;
  return typeof location === 'undefined' ? '' : location.origin + location.pathname;
}

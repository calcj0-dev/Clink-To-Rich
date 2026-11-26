// 画面に出す金額の文字（設計書 3章 yenText）。言葉は ja.json の num と通貨の JSON から

import { currency } from './data';
import { yenFull, yenText, type MoneyUnits } from './core/rules';
import { t } from './i18n';

export function moneyUnits(): MoneyUnits {
  return { oku: t('num.oku'), man: t('num.man'), symbol: currency.symbol, locale: currency.locale };
}

/** 合計・現金・株などの金額：1円単位で「24,830,123円」（2026-11-26 オーナー指定） */
export function yen(v: number): string {
  return yenFull(v, moneyUnits());
}

/** 短い形「3億2,000万円」「2,483万円」「9,800円」：1株の値段・お金の玉の名前に使う */
export function money(yen: number): string {
  return yenText(yen, moneyUnits());
}

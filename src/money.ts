// 画面に出す金額の文字（設計書 3章 yenText）。言葉は ja.json の num と通貨の JSON から

import { currency } from './data';
import { yenText, type MoneyUnits } from './core/rules';
import { t } from './i18n';

export function moneyUnits(): MoneyUnits {
  return { oku: t('num.oku'), man: t('num.man'), symbol: currency.symbol, locale: currency.locale };
}

/** 「3億2,000万円」「2,483万円」「9,800円」 */
export function money(yen: number): string {
  return yenText(yen, moneyUnits());
}

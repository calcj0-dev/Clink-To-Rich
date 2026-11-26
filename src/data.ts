// JSON のデータを読み込み、検査して渡す窓口（設計書 4章・共通の決まり C6）。
// 検査の中身は参照実装 sim/validate.mjs の「1. データの検査」と同じ（T-01）。おかしければ読み込みで止める

import configJson from './data/config.json';
import jpyJson from './data/currencies/JPY.json';
import jaJson from './data/i18n/ja.json';
import { halfWidth, moneyShape } from './core/shapes';
import type { Config, Currency } from './core/types';
import type { Locale } from './i18n/types';

/** 段の数（決定 #4。2026-11-25 に5千円札を足して13段） */
const TIER_COUNT = 13;
/** 降るお金の種類（決定 #5。小さい方から） */
const DROP_COUNT = 5;
const LOOKS = ['coin', 'bill', 'bundle', 'case'];
const TITLE_RULES = ['totalAtLeast', 'noStock', 'boughtBeforeCrash', 'else'];
const PORTAL = 'https://app-lab-rust.vercel.app';

/** 文言のうち、検査で見る部分 */
export type MessagesForCheck = { titles: Record<string, string>; titleLines: Record<string, string> };

/** データを確かめ、おかしな所を英語の文で返す（なければ空） */
export function validateData(cfg: Config, cur: Currency, msgs: MessagesForCheck, lang = 'ja'): string[] {
  const errors: string[] = [];
  const check = (cond: unknown, msg: string) => {
    if (!cond) errors.push(msg);
  };
  const T = cur.tiers;

  check(T.length === TIER_COUNT, `tiers: expected ${TIER_COUNT}, got ${T.length}`);
  check(
    T.every((t, i) => i === 0 || (t.value > T[i - 1]!.value && t.radius > T[i - 1]!.radius)),
    'tiers: value and radius must increase',
  );
  check(T.every((t) => t.id && t.label[lang] && t.line[lang] && t.color), 'tiers: each tier needs id, label, line, color');
  check(new Set(T.map((t) => t.id)).size === T.length, 'tiers: ids must be unique');
  check(T.every((t) => LOOKS.includes(t.look)), `tiers: look must be one of ${LOOKS.join('/')}`);

  const last = T[T.length - 1];
  check(last && cur.topTier.id === last.id && cur.topTier.unitValue === last.value, 'topTier: must be the last tier');
  check(cur.topTier.additive === true, 'topTier: must be additive');
  check(
    last && cur.topTier.maxRadius >= last.radius && cur.topTier.maxRadius === (cfg.box.width * (2 / 3)) / 2,
    'topTier: maxRadius must be 2/3 of the box width (as a diameter)',
  );

  const dropIds = Object.keys(cur.drops);
  check(
    JSON.stringify(dropIds) === JSON.stringify(T.slice(0, DROP_COUNT).map((t) => t.id)),
    `drops: must be the ${DROP_COUNT} smallest tiers in order`,
  );
  check(Object.values(cur.drops).every((w) => w > 0), 'drops: weights must be positive');

  // かぶの玉は降る硬貨のどれかと同じ大きさ（2026-11-26 オーナー決定：50円玉と同じ）
  check(T.slice(0, DROP_COUNT).some((t) => t.radius === cfg.stock.radius), 'stock.radius: must equal one of the dropped coins');
  check(cur.stock.startPrice > 0 && cur.stock.minUnit > 0 && cur.stock.sigDigits >= 1, 'stock: startPrice/minUnit/sigDigits');
  const col = cfg.stock.color;
  const hex = /^#[0-9A-Fa-f]{6}$/;
  check(hex.test(col.base) && hex.test(col.up) && hex.test(col.down), 'stock.color: colors must be #RRGGBB');
  check(col.upFullRatio > 1 && col.downFullRatio > 0 && col.downFullRatio < 1, 'stock.color: upFullRatio > 1 and 0 < downFullRatio < 1');
  check(cfg.stock.buy.spawnIntervalMs >= 0, 'stock.buy.spawnIntervalMs');
  check(
    cfg.stock.buy.payFrom === 'cashBalance' && cfg.stock.buy.ballsRemain === true && cfg.stock.buy.sharesPerPress === 1,
    'stock.buy: pay from cash balance, 1 share per press, balls remain',
  );
  check(cfg.stock.crashProb >= 0 && cfg.stock.crashProb <= 1 && cfg.stock.crashSize > 0 && cfg.stock.crashSize < 1, 'stock: crash');

  const a = cur.titleAmounts;
  check(
    (a.legend ?? 0) > (a.oku ?? 0) && (a.oku ?? 0) > (a.rich ?? 0) && (a.rich ?? 0) > (a.hesokuri ?? 0),
    'titleAmounts: must be in descending order',
  );
  check(cfg.titles.every((t) => TITLE_RULES.includes(t.rule)), 'titles: unknown rule');
  check(cfg.titles.every((t) => t.rule !== 'totalAtLeast' || (t.amount && t.amount in a)), 'titles: amount not in titleAmounts');
  check(cfg.titles.every((t) => msgs.titles[t.id] && msgs.titleLines[t.id]), 'titles: each title needs a name and a line');
  check(cfg.titles[cfg.titles.length - 1]?.rule === 'else', 'titles: last rule must be "else"');

  const shapes = cfg.physics.shapes;
  check(
    Object.entries(shapes).every(([look, s]) => LOOKS.includes(look) && look !== 'coin' && s.aspect >= 1 && s.corner >= 0 && s.corner <= 0.5),
    'physics.shapes: look must be bill/bundle/case, aspect >= 1, 0 <= corner <= 0.5',
  );
  if (last) {
    const biggest = moneyShape(last.look, cur.topTier.maxRadius, shapes);
    check(halfWidth(biggest) * 2 <= cfg.box.width * (2 / 3) + 0.5, 'physics.shapes: the biggest top tier must fit in 2/3 of the box width');
  }

  check(cfg.links.portal.startsWith(PORTAL), 'links.portal: must point to Ted App Lab');
  check(cfg.box.dangerLineY > 0 && cfg.box.dangerLineY < cfg.box.height, 'box.dangerLineY');
  check(cfg.physics.fps > 0, 'physics.fps');
  return errors;
}

/** 通貨ごとのデータ。通貨を足すときは JSON を作ってここに1行足す（決定 #13） */
export const currencies: Record<string, Currency> = { JPY: jpyJson satisfies Currency };

/** 言語ごとの文言。言語を足すときは JSON を作ってここに1行足す（共通の決まり C7） */
export const messagesByLocale = { ja: jaJson } satisfies Record<Locale, MessagesForCheck>;

export const config: Config = configJson satisfies Config;

const found = currencies[config.currency];
if (!found) throw new Error(`data: unknown currency ${config.currency}`);
/** 使う通貨（最初の版は日本円だけ） */
export const currency: Currency = found;

const errors = validateData(config, currency, messagesByLocale.ja);
if (errors.length) throw new Error(`data: invalid\n${errors.join('\n')}`);

/** 作品のURL（環境変数 VITE_SITE_URL。設計書 5.1）。未設定なら今のページのURL */
export function siteUrl(): string {
  const v = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();
  if (v) return v;
  return typeof location === 'undefined' ? '' : location.origin + location.pathname;
}

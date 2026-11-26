// 表示と判定（設計書 3章）。参照実装 sim/rules.mjs と同じ結果にする（T-02）

import type { TitleRule, TurnipColor } from './types';

/** 金額の表示に使う言葉（ja.json の num と、通貨の symbol・locale） */
export type MoneyUnits = { oku: string; man: string; symbol: string; locale: string };

/** 金額の表示：1億以上「3億2,000万円」、1万以上「2,483万円」、それ未満「9,800円」（万の下は切り捨て） */
export function yenText(yen: number, u: MoneyUnits): string {
  yen = Math.floor(yen);
  const f = (n: number) => n.toLocaleString(u.locale);
  if (yen >= 1e8) {
    const oku = Math.floor(yen / 1e8);
    const man = Math.floor((yen % 1e8) / 1e4);
    return `${f(oku)}${u.oku}${man ? f(man) + u.man : ''}${u.symbol}`;
  }
  if (yen >= 1e4) return `${f(Math.floor(yen / 1e4))}${u.man}${u.symbol}`;
  return `${f(yen)}${u.symbol}`;
}

/** 金額を1円単位で：24,830,123円（2026-11-26 オーナー指定：合計・現金・株などは1円単位） */
export function yenFull(yen: number, u: Pick<MoneyUnits, 'symbol' | 'locale'>): string {
  return `${Math.floor(yen).toLocaleString(u.locale)}${u.symbol}`;
}

/** 株価の丸め：上 sigDigits けた、最小 minUnit 円 */
export function roundPrice(p: number, { minUnit, sigDigits }: { minUnit: number; sigDigits: number }): number {
  p = Math.max(p, minUnit);
  const unit = Math.max(minUnit, 10 ** (Math.floor(Math.log10(p)) - (sigDigits - 1)));
  return Math.round(p / unit) * unit;
}

/** 億の玉の半径：1億ふえるごとに 1億円の玉の半径 × growPerUnit。上限 maxRadius */
export function okuRadius(oku: number, baseRadius: number, top: { growPerUnit: number; maxRadius: number }): number {
  return Math.min(baseRadius * (1 + top.growPerUnit * (oku - 1)), top.maxRadius);
}

/** 2つの色（#RRGGBB）を t（0〜1）で混ぜる */
export function mixColor(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => {
    const x = (pa >> shift) & 255;
    const y = (pb >> shift) & 255;
    return Math.round(x + (y - x) * t);
  };
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/** かぶの色の寄り具合：今の株価 ÷ 平均取得価額 で決める（2026-11-25 オーナー決定）。
 *  +1 で up になりきり、−1 で down になりきる。株がないときは 0（base）。倍率は対数で見る（2倍と半分が同じ幅） */
export function turnipLean(price: number, avgCost: number, c: TurnipColor): number {
  if (!(avgCost > 0)) return 0;
  const r = price / avgCost;
  if (r >= 1) return Math.min(1, Math.log(r) / Math.log(c.upFullRatio));
  return -Math.min(1, Math.log(r) / Math.log(c.downFullRatio));
}

/** かぶの色：同じなら白、10倍で金、半分で黒（config.json の stock.color） */
export function turnipColor(price: number, avgCost: number, c: TurnipColor): string {
  const lean = turnipLean(price, avgCost, c);
  return lean >= 0 ? mixColor(c.base, c.up, lean) : mixColor(c.base, c.down, -lean);
}

export type TitleInput = { total: number; sharesBought: number; boughtDrops: number[]; crashDrops: number[] };

/** 称号：config.titles を上から順に見て最初に当てはまったものの id */
export function titleFor(play: TitleInput, titles: TitleRule[], amounts: Record<string, number>): string {
  for (const t of titles) {
    if (t.rule === 'totalAtLeast' && play.total >= (amounts[t.amount ?? ''] ?? Infinity)) return t.id;
    if (t.rule === 'noStock' && play.sharesBought === 0) return t.id;
    if (
      t.rule === 'boughtBeforeCrash' &&
      play.crashDrops.some((c) => play.boughtDrops.some((b) => b <= c && c - b <= (t.withinDrops ?? 0)))
    )
      return t.id;
    if (t.rule === 'else') return t.id;
  }
  throw new Error('no title matched');
}

/** 現金＝箱の中のお金の合計 − 株に使った額 */
export const cashOf = (ballsValue: number, spent: number): number => ballsValue - spent;

export type Holding = { spent: number; shares: number };

/** 「株を買う」：現金 ≥ 株価なら1株。お金の玉は消えない → 新しい { spent, shares }。買えなければ null */
export function buyOne(state: Holding, ballsValue: number, price: number): Holding | null {
  if (cashOf(ballsValue, state.spent) < price) return null;
  return { spent: state.spent + price, shares: state.shares + 1 };
}

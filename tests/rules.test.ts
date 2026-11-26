// T-02 丸め・表示・色・称号（sim/validate_result.md の「2.」の例がすべて同じになる）
import { describe, expect, it } from 'vitest';
import { config, currency, messagesByLocale } from '../src/data';
import { buyOne, cashOf, okuRadius, roundPrice, titleFor, turnipColor, turnipLean } from '../src/core/rules';
import { money, yen } from '../src/money';

const R0 = currency.tiers[currency.tiers.length - 1]!.radius;
const titleName = (p: Partial<Parameters<typeof titleFor>[0]> & { total: number }) =>
  messagesByLocale.ja.titles[
    titleFor({ sharesBought: 1, boughtDrops: [], crashDrops: [], ...p }, config.titles, currency.titleAmounts) as keyof typeof messagesByLocale.ja.titles
  ];

describe('T-02 丸め・表示・色・称号', () => {
  it('億の玉の半径：104 → 114.4 → 120（上限）', () => {
    expect(okuRadius(1, R0, currency.topTier)).toBe(104);
    expect(okuRadius(2, R0, currency.topTier)).toBe(R0 * 1.1);
    expect(okuRadius(2, R0, currency.topTier)).toBeCloseTo(114.4, 10);
    expect(okuRadius(3, R0, currency.topTier)).toBe(120);
    expect(okuRadius(5, R0, currency.topTier)).toBe(120);
  });

  it.each([
    [0, '0円'],
    [9800, '9,800円'],
    [24_830_123, '24,830,123円'],
    [1_234_567_890, '1,234,567,890円'],
    [5000.6, '5,000円'],
  ])('合計・現金・株は1円単位 %i → %s', (v, want) => {
    expect(yen(v)).toBe(want);
  });

  it.each([
    [1234, 1200],
    [23456, 23000],
    [987654, 990000],
    [137000000, 140000000],
    [50, 100],
  ])('株価の丸め %i → %i円', (p, want) => {
    expect(roundPrice(p, currency.stock)).toBe(want);
  });

  it.each([
    [9800, '9,800円'],
    [24830000, '2,483万円'],
    [320000000, '3億2,000万円'],
    [100000000, '1億円'],
  ])('金額の表示 %i → %s', (y, want) => {
    expect(money(y)).toBe(want);
  });

  // かぶの色（2026-11-25 オーナー決定）：平均取得価額と比べて、同じなら白、10倍で金、半分で黒
  const C = config.stock.color;
  it.each([
    ['株を持っていない', 20000, 0, '#FFFFFF'],
    ['平均取得価額と同じ', 10000, 10000, '#FFFFFF'],
    ['10倍', 100000, 10000, '#E0B12E'],
    ['100倍（金のまま）', 1000000, 10000, '#E0B12E'],
    ['半分', 5000, 10000, '#1A1A1A'],
    ['4分の1（黒のまま）', 2500, 10000, '#1A1A1A'],
  ])('かぶの色：%s → %s', (_name, price, avg, want) => {
    expect(turnipColor(price as number, avg as number, C)).toBe(want);
  });

  it('かぶの色：上がるほど金に、下がるほど黒に近づく（倍率は対数で見る）', () => {
    expect(turnipLean(10000 * Math.sqrt(10), 10000, C)).toBeCloseTo(0.5, 10); // 約3.16倍で半分金
    expect(turnipLean(10000 * Math.SQRT1_2, 10000, C)).toBeCloseTo(-0.5, 10); // 約0.71倍で半分黒
    expect(turnipLean(20000, 10000, C)).toBeGreaterThan(0);
    expect(turnipLean(6500, 10000, C)).toBeLessThan(-0.6); // 暴落1回分でかなり黒い
  });

  it('現金12,610円で1株1万円を買う → 現金2,610円・1株。次の1株は買えない。合体で現金も増える', () => {
    const st = buyOne({ spent: 0, shares: 0 }, 12610, 10000);
    expect(st).toEqual({ spent: 10000, shares: 1 });
    expect(cashOf(12610, st!.spent)).toBe(2610);
    expect(buyOne(st!, 12610, 10000)).toBeNull();
    expect(cashOf(12610 + 3, st!.spent)).toBe(2613);
  });

  it('称号', () => {
    expect(titleName({ total: 12e8 })).toBe('伝説の億り人');
    expect(titleName({ total: 2e8, sharesBought: 0 })).toBe('億り人');
    expect(titleName({ total: 5e6, sharesBought: 0 })).toBe('タンス預金の達人');
    expect(titleName({ total: 5e6, boughtDrops: [40], crashDrops: [42] })).toBe('全力買いの直後に暴落した人');
    expect(titleName({ total: 5e6, boughtDrops: [40], crashDrops: [44] })).toBe('へそくり名人');
    expect(titleName({ total: 2e7 })).toBe('小金持ち');
    expect(titleName({ total: 5e5 })).toBe('貯金箱の新人');
  });
});

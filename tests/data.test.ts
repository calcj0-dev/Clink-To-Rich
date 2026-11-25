// T-01 データの検査（設計書 4章。sim/validate.mjs の「1.」と同じ項目）
import { describe, expect, it } from 'vitest';
import { config, currency, messagesByLocale, validateData } from '../src/data';
import type { Config, Currency } from '../src/core/types';
import { cfgWith, clone, curWith } from './helpers';

const check = (cfg: Config, cur: Currency, msgs = messagesByLocale.ja) => validateData(cfg, cur, msgs);

describe('T-01 データの検査', () => {
  it('今のデータは検査に通る', () => {
    expect(check(config, currency)).toEqual([]);
  });

  it('今のデータの中身：13段（5千円札あり）・降るのは5種類・株の玉は100円玉と同じ大きさ・1株1万円から', () => {
    expect(currency.tiers).toHaveLength(13);
    expect(currency.tiers.map((t) => t.value).slice(6, 9)).toEqual([1000, 5000, 10000]);
    expect(Object.keys(currency.drops)).toEqual(['y1', 'y5', 'y10', 'y50', 'y100']);
    expect(config.stock.radius).toBe(currency.tiers.find((t) => t.id === 'y100')!.radius);
    expect(currency.stock.startPrice).toBe(10000);
    expect(config.links.portal.startsWith('https://app-lab-rust.vercel.app')).toBe(true);
  });

  it('段が1つ足りないと止まる', () => {
    expect(check(config, curWith((c) => c.tiers.splice(5, 1)))).not.toEqual([]);
  });

  it('大きさが逆だと止まる', () => {
    expect(check(config, curWith((c) => ([c.tiers[3]!.radius, c.tiers[4]!.radius] = [c.tiers[4]!.radius, c.tiers[3]!.radius])))).not.toEqual([]);
  });

  it('降るお金に500円玉があると止まる', () => {
    expect(check(config, curWith((c) => (c.drops.y500 = 5)))).not.toEqual([]);
  });

  it('称号の最後が「それ以外」でないと止まる', () => {
    expect(check(cfgWith((c) => c.titles.pop()), currency)).not.toEqual([]);
  });

  it('称号の文が足りないと止まる', () => {
    const msgs = clone(messagesByLocale.ja) as { titles: Record<string, string>; titleLines: Record<string, string> };
    delete msgs.titleLines.t_rich;
    expect(validateData(config, currency, msgs)).not.toEqual([]);
  });

  it('株の玉が100円玉と違う大きさだと止まる', () => {
    expect(check(cfgWith((c) => (c.stock.radius = 20)), currency)).not.toEqual([]);
  });

  it('まとめサイトのリンクが違うと止まる', () => {
    expect(check(cfgWith((c) => (c.links.portal = 'https://example.com')), currency)).not.toEqual([]);
  });

  it('かぶの色の設定がおかしいと止まる（金になる倍率が1以下・黒になる倍率が1以上・色の形が違う）', () => {
    expect(check(cfgWith((c) => (c.stock.color.upFullRatio = 1)), currency)).not.toEqual([]);
    expect(check(cfgWith((c) => (c.stock.color.downFullRatio = 1.5)), currency)).not.toEqual([]);
    expect(check(cfgWith((c) => (c.stock.color.up = 'gold')), currency)).not.toEqual([]);
  });
});

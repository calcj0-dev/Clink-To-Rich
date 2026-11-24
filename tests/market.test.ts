// T-05 株価：同じ種なら同じ動き（sim と同じ）。暴落の後18玉は暴落しない。株を買っても株価は動かない
import seedrandom from 'seedrandom';
import { describe, expect, it } from 'vitest';
import { config, currency } from '../src/data';
import { createGame } from '../src/core/game';
import { createMarket, type MarketParams } from '../src/core/market';
import fixture from './fixtures/sim-seed.json';
import { tierIndex } from './helpers';

const params = (over: Partial<MarketParams> = {}): MarketParams => ({
  startPrice: currency.stock.startPrice,
  drift: config.stock.drift,
  vol: config.stock.vol,
  crashProb: config.stock.crashProb,
  crashSize: config.stock.crashSize,
  crashCooldownDrops: config.stock.crashCooldownDrops,
  floorPrice: config.stock.floorPrice,
  ...over,
});

describe('T-05 株価', () => {
  it('同じ種なら同じ動き', () => {
    const a = createMarket(params(), seedrandom('7'));
    const b = createMarket(params(), seedrandom('7'));
    for (let d = 1; d <= 500; d++) {
      a.step(d);
      b.step(d);
    }
    expect(a.history).toEqual(b.history);
    expect(a.crashDrops).toEqual(b.crashDrops);
  });

  it.each([1, 42])('参照実装 sim と同じ：種 %i の「次のお金」と株価', (seed) => {
    const want = fixture[String(seed) as '1' | '42'];
    const g = createGame(config, currency, seed);
    const tiers = [g.nextTier];
    const prices: number[] = [];
    for (let i = 0; i < want.prices.length; i++) {
      g.update(config.box.dropCooldownMs + 50);
      expect(g.drop(i % 2 ? 60 : 300)).toBe(true);
      tiers.push(g.nextTier);
      prices.push(g.market.price);
    }
    expect(tiers).toEqual(want.tiers);
    for (let i = 0; i < prices.length; i++) expect(prices[i]).toBeCloseTo(want.prices[i]!, 6);
  });

  it('暴落の後18玉は暴落しない', () => {
    const m = createMarket(params({ crashProb: 1 }), seedrandom('3'));
    for (let d = 1; d <= 200; d++) m.step(d);
    const c = m.crashDrops;
    expect(c.length).toBeGreaterThan(5);
    for (let i = 1; i < c.length; i++) expect(c[i]! - c[i - 1]!).toBe(config.stock.crashCooldownDrops);
  });

  it('暴落すると株価が35％下がる（ゆれを0にして確かめる）', () => {
    const m = createMarket(params({ crashProb: 1, vol: 0, drift: 0 }), seedrandom('3'));
    m.step(1);
    expect(m.price).toBeCloseTo(currency.stock.startPrice * (1 - config.stock.crashSize), 6);
  });

  it('株を買っても株価は動かない', () => {
    const g = createGame(config, currency, 5);
    g.world.addMoney(tierIndex('y10000'), 60, config.box.height - 52);
    g.world.addMoney(tierIndex('y10000'), 200, config.box.height - 52);
    const before = { price: g.market.price, len: g.market.history.length };
    expect(g.buy()).toBe(true);
    expect(g.buy()).toBe(true);
    expect(g.market.price).toBe(before.price);
    expect(g.market.history.length).toBe(before.len);
  });
});

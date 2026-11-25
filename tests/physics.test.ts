// T-03 合体：同じ段の2つ → 1つ上。違う段は合体しない。億は足し算で育つ
import { describe, expect, it } from 'vitest';
import { config, currency } from '../src/data';
import { createWorld, type MoneyBall } from '../src/core/physics';
import { tierIndex } from './helpers';

const H = config.box.height;
const TOP = currency.tiers.length - 1;

function run(world: ReturnType<typeof createWorld>, ms: number) {
  const merges = [];
  for (let t = 0; t < ms; t += 1000 / 60) merges.push(...world.step(1000 / 60));
  return merges;
}
const money = (world: ReturnType<typeof createWorld>) => world.balls().filter((b): b is MoneyBall => b.kind === 'money');

describe('T-03 合体', () => {
  it('1円玉＋1円玉 → 5円玉', () => {
    const w = createWorld(config, currency);
    w.addMoney(0, 100, H - 13);
    w.addMoney(0, 124, H - 13);
    run(w, 300);
    const m = money(w);
    expect(m).toHaveLength(1);
    expect(m[0]!.tier).toBe(tierIndex('y5'));
  });

  it('違う段どうしは合体しない', () => {
    const w = createWorld(config, currency);
    w.addMoney(0, 100, H - 13);
    w.addMoney(1, 128, H - 17);
    run(w, 500);
    expect(money(w).map((b) => b.tier).sort()).toEqual([0, 1]);
  });

  it('お金と株の玉は合体しない。株どうしも合体しない', () => {
    const w = createWorld(config, currency);
    w.addMoney(tierIndex('y100'), 60, H - 33);
    w.addStock(120, H - 33);
    w.addStock(184, H - 33);
    run(w, 500);
    expect(w.balls()).toHaveLength(3);
  });

  it('1,000万円＋1,000万円 → 1億円', () => {
    const w = createWorld(config, currency);
    w.addMoney(TOP - 1, 180, H - 90);
    w.addMoney(TOP - 1, 180, H - 90 - 175);
    const merges = run(w, 800);
    expect(merges.some((m) => m.ball.tier === TOP && m.ball.oku === 1)).toBe(true);
    const m = money(w);
    expect(m).toHaveLength(1);
    expect(w.valueOf(m[0]!)).toBe(100_000_000);
    expect(m[0]!.r).toBe(104);
    expect(m[0]!.body.circleRadius ?? 0).toBe(0); // ケースは四角（丸ではない）
    const box = m[0]!.body.bounds;
    expect(Math.min(box.max.x - box.min.x, box.max.y - box.min.y)).toBeGreaterThan(100); // 面積が同じ四角（横 約206 × 縦 約165）
  });

  it('1億円＋1億円＝2億円（半径 114.4）、2億円＋1億円＝3億円（半径 120 上限）', () => {
    const w = createWorld(config, currency);
    w.addMoney(TOP, 180, H - 104, 1);
    w.addMoney(TOP, 180, H - 104 - 200, 1);
    run(w, 800);
    let m = money(w);
    expect(m).toHaveLength(1);
    expect(m[0]!.oku).toBe(2);
    expect(w.valueOf(m[0]!)).toBe(200_000_000);
    expect(m[0]!.r).toBeCloseTo(114.4, 6);

    w.addMoney(TOP, 180, m[0]!.body.position.y - 114.4 - 100, 1);
    run(w, 1200);
    m = money(w);
    expect(m).toHaveLength(1);
    expect(m[0]!.oku).toBe(3);
    expect(w.valueOf(m[0]!)).toBe(300_000_000);
    expect(m[0]!.r).toBe(120);
  });
});

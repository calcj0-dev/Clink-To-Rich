// お金の形（2026-11-25 オーナー決定）：硬貨は丸、お札・束・ケースは角の丸い四角。面積は丸とほぼ同じ
import { describe, expect, it } from 'vitest';
import { config, currency } from '../src/data';
import { halfWidth, moneyShape } from '../src/core/shapes';

describe('お金の形', () => {
  it('硬貨は丸、お札・束・ケースは四角', () => {
    for (const tr of currency.tiers) {
      const s = moneyShape(tr.look, tr.radius, config.physics.shapes);
      expect(s.kind, tr.id).toBe(tr.look === 'coin' ? 'circle' : 'rect');
    }
  });

  it('四角の面積は同じ段の丸と同じ', () => {
    for (const tr of currency.tiers.filter((x) => x.look !== 'coin')) {
      const s = moneyShape(tr.look, tr.radius, config.physics.shapes);
      if (s.kind !== 'rect') throw new Error('not rect');
      expect(s.w * s.h).toBeCloseTo(Math.PI * tr.radius ** 2, 6);
      expect(s.w).toBeGreaterThanOrEqual(s.h); // 横長
    }
  });

  it('一番大きいケース（3億円以上）も箱の幅の3分の2に収まる', () => {
    const top = currency.tiers[currency.tiers.length - 1]!;
    const s = moneyShape(top.look, currency.topTier.maxRadius, config.physics.shapes);
    expect(halfWidth(s) * 2).toBeLessThanOrEqual((config.box.width * 2) / 3);
  });
});

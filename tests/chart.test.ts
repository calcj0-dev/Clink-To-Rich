// 株価チャートの金額の書き方（2026-11-26：チャートは小数1けたまで）
import { describe, expect, it } from 'vitest';
import { chartYen } from '../src/ui/parts/chart';

describe('チャートの金額', () => {
  it.each([
    [9800, '9,800円'],
    [44000, '4.4万円'],
    [40000, '4万円'],
    [120000, '12万円'],
    [2_350_000, '235万円'],
    [130_000_000, '1.3億円'],
    [12_000_000_000, '120億円'],
  ])('%i → %s', (v, want) => {
    expect(chartYen(v)).toBe(want);
  });
});

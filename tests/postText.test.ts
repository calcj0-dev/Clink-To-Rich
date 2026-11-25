// 投稿文（設計書 5.5）
import { describe, expect, it } from 'vitest';
import { postText, X_LIMIT, xLength } from '../src/share/postText';

describe('投稿文', () => {
  it('設計書の例と同じ文になる', () => {
    expect(postText({ total: 24_830_000, cash: 1_830_000, stock: 23_000_000, title: 't_rich' })).toBe(
      '億までチャリンで2,483万円（現金 183万円／株 2,300万円）。称号：小金持ち #億までチャリン',
    );
  });

  it('一番長い称号・大きな金額でも X の文字数に収まる', () => {
    const text = postText({ total: 123_456_780_000, cash: 98_765_430_000, stock: 24_691_350_000, title: 't_crash' });
    expect(xLength(text)).toBeLessThanOrEqual(X_LIMIT);
  });
});

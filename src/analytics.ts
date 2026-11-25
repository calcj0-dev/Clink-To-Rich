// 計測（2026-11-25 オーナー決定）：Vercel Analytics でページが見られた回数だけ。
// Google Analytics と、出来事（イベント）の送信は使わない。ゲームの結果はどこにも送らない

import { inject } from '@vercel/analytics';

/** 起動時に1回呼ぶ。公開版だけ */
export function initAnalytics(): void {
  try {
    if (import.meta.env.PROD) inject({ mode: 'production', framework: 'vanilla' });
  } catch {
    // 読み込めなくても遊べる
  }
}

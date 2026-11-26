// 利用者の設定（効果音のあり・なし、チャートの表示）。端末に保存する（設計書 1.9・要件定義書 F-10）

import type { ChartMode } from './ui/parts/chart';
import { load, save } from './storage';

type Listener = () => void;
const listeners = new Set<Listener>();

export const settings = {
  /** 最初から鳴る */
  get sound(): boolean {
    return load('sound', 'on') === 'on';
  },
  set sound(v: boolean) {
    save('sound', v ? 'on' : 'off');
    for (const fn of listeners) fn();
  },
  /** チャートの表示。最初は線（2026-11-26 オーナー指定） */
  get chart(): ChartMode {
    return load('chart', 'line') === 'candle' ? 'candle' : 'line';
  },
  set chart(v: ChartMode) {
    save('chart', v);
    for (const fn of listeners) fn();
  },
};

/** 設定が変わったら呼ばれる（音のボタンの見た目を合わせるため）。戻り値で解除 */
export function onSettingsChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

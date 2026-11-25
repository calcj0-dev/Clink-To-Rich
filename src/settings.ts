// 利用者の設定（効果音のあり・なし）。端末に保存する（設計書 1.9・要件定義書 F-10）

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
};

/** 設定が変わったら呼ばれる（音のボタンの見た目を合わせるため）。戻り値で解除 */
export function onSettingsChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

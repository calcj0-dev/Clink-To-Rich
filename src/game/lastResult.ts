// 終わった1回の結果を、結果画面（とシェア）へ渡す入れ物。端末には保存しない（保存するのはベストだけ）

import type { Result } from '../core/game';
import type { BoxSnapshot } from '../ui/render';

export type LastResult = Result & {
  box: BoxSnapshot;
  /** この回でベストを更新したか */
  newBest: boolean;
  best: number;
};

let last: LastResult | null = null;

export function setLastResult(r: LastResult): void {
  last = r;
}

export function getLastResult(): LastResult | null {
  return last;
}

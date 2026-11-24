// 株価（設計書 1.5）。参照実装 sim/game.mjs の stepMarket と同じ式・同じ乱数の使い方
// 株価が動くのはお金を1つ落としたときだけ（株を買っても動かない）

export type Rng = () => number;

export type MarketParams = {
  startPrice: number;
  drift: number;
  vol: number;
  crashProb: number;
  crashSize: number;
  crashCooldownDrops: number;
  floorPrice: number;
};

export type Market = {
  /** 今の株価（丸める前） */
  readonly price: number;
  /** これまでの株価（丸める前）。最初は始まりの株価 */
  readonly history: readonly number[];
  /** 暴落した玉の番号 */
  readonly crashDrops: readonly number[];
  /** drop 玉目を落としたときに1回呼ぶ。暴落したら true */
  step(drop: number): boolean;
};

export function createMarket(p: MarketParams, rng: Rng): Market {
  let price = p.startPrice;
  let lastCrashDrop = -999;
  const history = [price];
  const crashDrops: number[] = [];
  return {
    get price() {
      return price;
    },
    history,
    crashDrops,
    step(drop) {
      // ボックス＝ミュラー法の正規乱数（sim と同じく乱数を2つ使う）
      const z = Math.sqrt(-2 * Math.log(rng() || 1e-12)) * Math.cos(2 * Math.PI * rng());
      let next = price * Math.exp(p.drift - (p.vol * p.vol) / 2 + p.vol * z);
      // 暴落の後 crashCooldownDrops 玉は暴落しない（その間は乱数も引かない。sim と同じ）
      let crashed = false;
      if (drop - lastCrashDrop >= p.crashCooldownDrops && rng() < p.crashProb) {
        next *= 1 - p.crashSize;
        lastCrashDrop = drop;
        crashDrops.push(drop);
        crashed = true;
      }
      price = Math.max(next, p.floorPrice);
      history.push(price);
      return crashed;
    },
  };
}

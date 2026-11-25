// ゲームの状態と進行（設計書 1章・3章・5.3）。画面を持たない。参照実装 sim/game.mjs と同じ動き
// 画面は毎フレーム update(ミリ秒) を呼び、玉の位置を描き、onEvent で演出・効果音を出す

import seedrandom from 'seedrandom';
import { createMarket, type Market } from './market';
import { createWorld, type Ball, type World } from './physics';
import { buyOne, cashOf, roundPrice, titleFor } from './rules';
import { halfWidth } from './shapes';
import type { Config, Currency } from './types';

/** 設計書 5.3 の Play。玉は Matter.js の世界の中 */
export type Play = {
  drops: number;
  shares: number;
  /** 丸めた今の株価 */
  price: number;
  spent: number;
  boughtDrops: number[];
  crashDrops: number[];
  maxOku: number;
  reachedOku: boolean;
  over: boolean;
};

export type GameEvent =
  | { type: 'drop'; tier: number }
  | { type: 'merge'; from: number; to: number; oku: number }
  | { type: 'buy'; price: number; shares: number; cash: number }
  | { type: 'crash' }
  | { type: 'oku' }
  | { type: 'over' };

export type Result = {
  total: number;
  cash: number;
  stock: number;
  shares: number;
  spent: number;
  drops: number;
  maxOku: number;
  /** 株で増えた額（今の株の金額 − 株に使った額） */
  stockGain: number;
  title: string;
};

/** 玉が「ほぼ止まっている」とみなす縦の速さ（sim と同じ） */
const STILL_VY = 0.5;

export type Game = ReturnType<typeof createGame>;

export function createGame(cfg: Config, cur: Currency, seed: number | string = 1) {
  const rng = seedrandom(String(seed));
  const world: World = createWorld(cfg, cur);
  const market: Market = createMarket(
    {
      startPrice: cur.stock.startPrice,
      drift: cfg.stock.drift,
      vol: cfg.stock.vol,
      crashProb: cfg.stock.crashProb,
      crashSize: cfg.stock.crashSize,
      crashCooldownDrops: cfg.stock.crashCooldownDrops,
      floorPrice: cfg.stock.floorPrice,
    },
    rng,
  );
  const tiers = cur.tiers;
  const TOP = tiers.length - 1;
  const W = cfg.box.width;
  const stepMs = 1000 / cfg.physics.fps;

  // 降るお金と割合（段の番号の順。sim と同じ順で乱数を使う）
  const dropTable = Object.entries(cur.drops)
    .map(([id, w]) => [tiers.findIndex((t) => t.id === id), w] as const)
    .sort((a, b) => a[0] - b[0]);
  const dropSum = dropTable.reduce((s, [, w]) => s + w, 0);
  function pickDropTier(): number {
    let x = rng() * dropSum;
    for (const [t, w] of dropTable) if ((x -= w) < 0) return t;
    return dropTable[0]![0];
  }

  const S = {
    drops: 0,
    shares: 0,
    spent: 0,
    boughtDrops: [] as number[],
    maxOku: 0,
    reachedOku: false,
    over: false,
    // 手に持っているお金（次に落とす）と、その次のお金（右上に出す）。
    // 乱数を使う順は sim と同じ：最初に2つ → 落とすたびに「株価 → その次のお金」
    heldTier: pickDropTier(),
    nextTier: pickDropTier(),
    dropX: W / 2,
    lastDropAt: -Infinity,
    overMs: 0,
    acc: 0,
    /** 買ったがまだ降らせていないかぶの数（続けて買ったときは1つずつ降らせる） */
    stockQueue: 0,
    lastStockAt: -Infinity,
  };

  const listeners = new Set<(e: GameEvent) => void>();
  const emit = (e: GameEvent) => {
    for (const fn of listeners) fn(e);
  };

  const ballsValue = () =>
    world.balls().reduce((s, b) => s + (b.kind === 'money' ? world.valueOf(b) : 0), 0);
  const price = () => roundPrice(market.price, cur.stock);
  const cash = () => cashOf(ballsValue(), S.spent);
  const stockValue = () => S.shares * price();
  const total = () => cash() + stockValue();
  /** 平均取得価額＝株に使った額 ÷ 持っている株数（株がなければ 0） */
  const avgCost = () => (S.shares > 0 ? S.spent / S.shares : 0);

  const clampX = (x: number, r: number) => Math.min(Math.max(x, r + 1), W - r - 1);

  function checkOku(): void {
    if (!S.reachedOku && total() >= cur.goal.value) {
      S.reachedOku = true;
      emit({ type: 'oku' });
    }
  }

  /** 終わりの判定（設計書 1.6）：落とした直後の玉を除き、線より上でほぼ止まっている玉があるか */
  function anyOverLine(): boolean {
    const now = world.now();
    return world.balls().some(
      (b: Ball) =>
        now - b.born >= cfg.box.overGraceMs &&
        b.body.bounds.min.y < cfg.box.dangerLineY &&
        Math.abs(b.body.velocity.y) < STILL_VY,
    );
  }

  /** 落とした後 dropCooldownMs は次を落とせない */
  const canDrop = () => !S.over && world.now() - S.lastDropAt >= cfg.box.dropCooldownMs;

  function physicsStep(): void {
    if (S.stockQueue > 0 && world.now() - S.lastStockAt >= cfg.stock.buy.spawnIntervalMs) {
      S.stockQueue--;
      S.lastStockAt = world.now();
      world.addStock(clampX(S.dropX, cfg.stock.radius), cfg.box.dropY);
    }
    for (const m of world.step(stepMs)) {
      if (m.ball.tier === TOP) S.maxOku = Math.max(S.maxOku, m.ball.oku);
      emit({ type: 'merge', from: m.from, to: m.ball.tier, oku: m.ball.oku });
    }
    checkOku();
    if (anyOverLine()) {
      S.overMs += stepMs;
      if (S.overMs >= cfg.box.overConfirmMs) {
        S.over = true;
        emit({ type: 'over' });
      }
    } else S.overMs = 0;
  }

  return {
    config: cfg,
    world,
    market,
    /** 手に持っているお金（次に落とす段） */
    get heldTier() {
      return S.heldTier;
    },
    /** その次のお金（右上に出す段） */
    get nextTier() {
      return S.nextTier;
    },
    get dropX() {
      return S.dropX;
    },
    /** 線より上に玉が残っている時間（ミリ秒）。線を赤く点滅させるのに使う */
    get overMs() {
      return S.overMs;
    },
    get over() {
      return S.over;
    },
    /** 落とす位置を動かす（指を左右に動かしたとき）。次のお金が箱からはみ出ない所までに収める */
    setDropX(x: number): void {
      S.dropX = clampX(x, halfWidth(world.shapeOf(S.heldTier)));
    },
    canDrop,
    /** 次のお金を今の位置から落とす。株価が1回動く */
    drop(x: number = S.dropX): boolean {
      if (!canDrop()) return false;
      const tier = S.heldTier;
      const cx = clampX(x, halfWidth(world.shapeOf(tier)));
      world.addMoney(tier, cx, cfg.box.dropY);
      S.drops++;
      S.lastDropAt = world.now();
      const crashed = market.step(S.drops);
      S.heldTier = S.nextTier;
      S.nextTier = pickDropTier();
      S.dropX = clampX(cx, halfWidth(world.shapeOf(S.heldTier)));
      emit({ type: 'drop', tier });
      if (crashed) emit({ type: 'crash' });
      checkOku();
      return true;
    },
    canBuy(): boolean {
      return !S.over && cash() >= price();
    },
    /** 「買」：現金から1株の値段を引く。かぶの玉は次に時間が進んだとき、落とす位置から1つずつ降る。
     *  お金の玉は消えない。株価は動かない */
    buy(): boolean {
      if (S.over) return false;
      const p = price();
      const next = buyOne({ spent: S.spent, shares: S.shares }, ballsValue(), p);
      if (!next) return false;
      S.spent = next.spent;
      S.shares = next.shares;
      S.boughtDrops.push(S.drops);
      S.stockQueue++;
      emit({ type: 'buy', price: p, shares: S.shares, cash: cash() });
      return true;
    },
    /** 平均取得価額（かぶの色の基準） */
    avgCost,
    /** 時間を ms ミリ秒進める（物理は 1/fps 秒ずつ）。終わったら進めない */
    update(ms: number): void {
      S.acc += ms;
      while (S.acc >= stepMs && !S.over) {
        S.acc -= stepMs;
        physicsStep();
      }
      if (S.over) S.acc = 0;
    },
    price,
    cash,
    stockValue,
    total,
    play(): Play {
      return {
        drops: S.drops,
        shares: S.shares,
        price: price(),
        spent: S.spent,
        boughtDrops: [...S.boughtDrops],
        crashDrops: [...market.crashDrops],
        maxOku: S.maxOku,
        reachedOku: S.reachedOku,
        over: S.over,
      };
    },
    result(): Result {
      const t = total();
      return {
        total: t,
        cash: cash(),
        stock: stockValue(),
        shares: S.shares,
        spent: S.spent,
        drops: S.drops,
        maxOku: S.maxOku,
        stockGain: stockValue() - S.spent,
        title: titleFor(
          { total: t, sharesBought: S.shares, boughtDrops: S.boughtDrops, crashDrops: [...market.crashDrops] },
          cfg.titles,
          cur.titleAmounts,
        ),
      };
    },
    onEvent(fn: (e: GameEvent) => void): () => void {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

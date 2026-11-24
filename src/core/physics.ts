// 物理（設計書 3章）。Matter.js の円の剛体、壁は左右と床。参照実装 sim/game.mjs と同じ作り
// 合体：衝突の始まりで同じ段のお金どうしなら2つを消し、中点に1つ上の段を作る。1億円以上どうしは足し算

import Matter from 'matter-js';
import { okuRadius } from './rules';
import type { Config, Currency } from './types';

const { Engine, Bodies, Composite, Events } = Matter;

export type Ball =
  | { kind: 'money'; body: Matter.Body; tier: number; oku: number; born: number; dead: boolean }
  | { kind: 'stock'; body: Matter.Body; born: number; dead: boolean };

export type MoneyBall = Extract<Ball, { kind: 'money' }>;

export type MergeEvent = { from: number; ball: MoneyBall };

export type World = {
  readonly engine: Matter.Engine;
  /** 物理の時計（ミリ秒） */
  now(): number;
  /** 今ある玉（消えたものを除く） */
  balls(): Ball[];
  /** お金の玉を作る。tier は段の番号（0 = 1円玉）。一番上の段では oku＝億の数 */
  addMoney(tier: number, x: number, y: number, oku?: number): MoneyBall;
  addStock(x: number, y: number): Ball;
  /** 物理を dt ミリ秒進め、たまった合体を処理する。起きた合体を返す */
  step(dt: number): MergeEvent[];
  /** お金の玉の金額 */
  valueOf(ball: MoneyBall): number;
  /** 段 tier（一番上の段では億の数 oku）の玉の半径 */
  radiusOf(tier: number, oku?: number): number;
};

export function createWorld(cfg: Config, cur: Currency): World {
  const engine = Engine.create({ enableSleeping: false });
  engine.gravity.y = cfg.physics.gravity;
  const W = cfg.box.width;
  const H = cfg.box.height;
  const T = 40;
  Composite.add(engine.world, [
    Bodies.rectangle(W / 2, H + T / 2, W + 2 * T, T, { isStatic: true }),
    Bodies.rectangle(-T / 2, H / 2 - 200, T, H + 400, { isStatic: true }),
    Bodies.rectangle(W + T / 2, H / 2 - 200, T, H + 400, { isStatic: true }),
  ]);

  const tiers = cur.tiers;
  const TOP = tiers.length - 1;
  const byBody = new Map<number, Ball>();
  const pending: [MoneyBall, MoneyBall][] = [];

  Events.on(engine, 'collisionStart', (ev) => {
    for (const { bodyA, bodyB } of ev.pairs) {
      const a = byBody.get(bodyA.id);
      const b = byBody.get(bodyB.id);
      if (a?.kind === 'money' && b?.kind === 'money' && a.tier === b.tier && !a.dead && !b.dead) {
        a.dead = b.dead = true;
        pending.push([a, b]);
      }
    }
  });

  const bodyOptions = {
    restitution: cfg.physics.restitution,
    friction: cfg.physics.friction,
    density: cfg.physics.density,
  };

  const radiusOf = (tier: number, oku = 1) =>
    tier === TOP ? okuRadius(oku, tiers[TOP]!.radius, cur.topTier) : tiers[tier]!.radius;

  function addMoney(tier: number, x: number, y: number, oku = 1): MoneyBall {
    const body = Bodies.circle(x, y, radiusOf(tier, oku), bodyOptions);
    const ball: MoneyBall = { kind: 'money', body, tier, oku: tier === TOP ? oku : 0, born: engine.timing.timestamp, dead: false };
    byBody.set(body.id, ball);
    Composite.add(engine.world, body);
    return ball;
  }

  function addStock(x: number, y: number): Ball {
    const body = Bodies.circle(x, y, cfg.stock.radius, bodyOptions);
    const ball: Ball = { kind: 'stock', body, born: engine.timing.timestamp, dead: false };
    byBody.set(body.id, ball);
    Composite.add(engine.world, body);
    return ball;
  }

  function remove(ball: Ball): void {
    byBody.delete(ball.body.id);
    Composite.remove(engine.world, ball.body);
  }

  function processMerges(): MergeEvent[] {
    const out: MergeEvent[] = [];
    while (pending.length) {
      const [a, b] = pending.shift()!;
      remove(a);
      remove(b);
      const mx = (a.body.position.x + b.body.position.x) / 2;
      const my = (a.body.position.y + b.body.position.y) / 2;
      const ball = a.tier === TOP ? addMoney(TOP, mx, my, a.oku + b.oku) : addMoney(a.tier + 1, mx, my);
      out.push({ from: a.tier, ball });
    }
    return out;
  }

  return {
    engine,
    now: () => engine.timing.timestamp,
    balls: () => [...byBody.values()].filter((b) => !b.dead),
    addMoney,
    addStock,
    step(dt) {
      Engine.update(engine, dt);
      return processMerges();
    },
    valueOf: (ball) => (ball.tier === TOP ? ball.oku * tiers[TOP]!.value : tiers[ball.tier]!.value),
    radiusOf,
  };
}

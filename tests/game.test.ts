// T-04 株を買う／T-06 終わり／T-07 点数（と、落とす・億り人の流れ）
import { describe, expect, it } from 'vitest';
import { config, currency } from '../src/data';
import { createGame, type GameEvent } from '../src/core/game';
import { cfgWith, tierIndex } from './helpers';

const H = config.box.height;
const moneyCount = (g: ReturnType<typeof createGame>) => g.world.balls().filter((b) => b.kind === 'money').length;
const stockCount = (g: ReturnType<typeof createGame>) => g.world.balls().filter((b) => b.kind === 'stock').length;

describe('T-04 株を買う', () => {
  it('現金が株価より少ないときは買えない', () => {
    const g = createGame(config, currency, 1);
    g.world.addMoney(tierIndex('y1000'), 100, H - 44);
    expect(g.cash()).toBe(1000);
    expect(g.price()).toBe(10000);
    expect(g.canBuy()).toBe(false);
    expect(g.buy()).toBe(false);
    expect(stockCount(g)).toBe(0);
  });

  it('買うと現金が株価ぶん減り、株数+1、株の玉が1つ増える。お金の玉の数は変わらない', () => {
    const g = createGame(config, currency, 1);
    const events: GameEvent[] = [];
    g.onEvent((e) => events.push(e));
    g.world.addMoney(tierIndex('y10000'), 60, H - 52);
    g.world.addMoney(tierIndex('y1000'), 180, H - 44);
    expect(g.cash()).toBe(11000);
    const moneyBefore = moneyCount(g);

    expect(g.canBuy()).toBe(true);
    expect(g.buy()).toBe(true);
    expect(g.cash()).toBe(1000);
    expect(g.play().shares).toBe(1);
    expect(g.play().spent).toBe(10000);
    expect(stockCount(g)).toBe(0); // かぶは時間が進んでから降る（チャートを閉じたら）
    g.update(20);
    expect(stockCount(g)).toBe(1);
    expect(moneyCount(g)).toBe(moneyBefore);
    expect(events).toContainEqual({ type: 'buy', price: 10000, shares: 1, cash: 1000 });
    expect(g.canBuy()).toBe(false);
  });

  it('株の玉は落とす位置から降る', () => {
    const g = createGame(config, currency, 1);
    g.world.addMoney(tierIndex('y10000'), 60, H - 52);
    g.setDropX(250);
    g.buy();
    g.update(1); // 1/60 秒に満たないので、まだ物理は進まない
    expect(stockCount(g)).toBe(0);
    g.update(20);
    const stock = g.world.balls().find((b) => b.kind === 'stock')!;
    expect(stock.body.position.x).toBe(250);
    expect(stock.body.position.y).toBeLessThan(config.box.dropY + 2);
    expect(stock.body.circleRadius).toBe(config.stock.radius);
  });

  it('続けて買うと、かぶは間をあけて1つずつ降る。時間を進めなければ（チャートを開いている間）降らない', () => {
    const g = createGame(config, currency, 1);
    g.world.addMoney(tierIndex('y100k'), 180, H - 63);
    for (let i = 0; i < 3; i++) expect(g.buy()).toBe(true);
    expect(g.play().shares).toBe(3);
    expect(stockCount(g)).toBe(0);
    g.update(20);
    expect(stockCount(g)).toBe(1);
    g.update(config.stock.buy.spawnIntervalMs + 20);
    expect(stockCount(g)).toBe(2);
    g.update(config.stock.buy.spawnIntervalMs + 20);
    expect(stockCount(g)).toBe(3);
  });

  it('平均取得価額＝株に使った額 ÷ 株数', () => {
    const g = createGame(config, currency, 1);
    expect(g.avgCost()).toBe(0);
    g.world.addMoney(tierIndex('y100k'), 180, H - 63);
    g.buy();
    g.buy();
    expect(g.avgCost()).toBe(10000);
  });

  it('合体でお金が増えると現金も増える（1円＋1円 → 5円で +3円）', () => {
    const g = createGame(config, currency, 1);
    g.world.addMoney(tierIndex('y10000'), 60, H - 52);
    g.buy();
    g.world.addMoney(0, 280, H - 13);
    g.world.addMoney(0, 304, H - 13);
    expect(g.cash()).toBe(2);
    g.update(300);
    expect(g.cash()).toBe(5);
  });
});

describe('落とす', () => {
  it('落とした後0.5秒は次を落とせない', () => {
    const g = createGame(config, currency, 1);
    expect(g.drop(180)).toBe(true);
    g.update(config.box.dropCooldownMs - 50);
    expect(g.canDrop()).toBe(false);
    expect(g.drop(180)).toBe(false);
    g.update(100);
    expect(g.drop(180)).toBe(true);
    expect(g.play().drops).toBe(2);
  });

  it('お金は箱からはみ出さない位置に落ちる', () => {
    const g = createGame(config, currency, 1);
    const tier = g.heldTier;
    g.drop(-500);
    const b = g.world.balls()[0]!;
    expect(b.body.position.x).toBe(currency.tiers[tier]!.radius + 1);
  });
});

describe('T-06 終わり', () => {
  // 危険な線を床の近くに下げ、床で止まった玉が「線より上」になるようにして確かめる
  const low = cfgWith((c) => (c.box.dangerLineY = H - 20));

  it('線より上に1.5秒残ったら終わり。落とした直後（1.5秒）の玉は数えない', () => {
    const g = createGame(low, currency, 1);
    const events: GameEvent[] = [];
    g.onEvent((e) => events.push(e));
    g.drop(180);
    g.update(1400);
    expect(g.overMs).toBe(0); // 落とした直後なので数えない
    g.update(1500);
    expect(g.over).toBe(false); // まだ 1.5 秒たっていない
    g.update(600);
    expect(g.over).toBe(true);
    expect(events.filter((e) => e.type === 'over')).toHaveLength(1);
    expect(g.drop(180)).toBe(false);
    expect(g.buy()).toBe(false);
  });

  it('線より下に収まっていれば終わらない', () => {
    const g = createGame(config, currency, 1);
    g.drop(180);
    g.update(5000);
    expect(g.over).toBe(false);
    expect(g.overMs).toBe(0);
  });
});

describe('T-07 点数', () => {
  it('合計＝現金＋株数×株価（落として株価が動いても）', () => {
    const g = createGame(config, currency, 9);
    g.world.addMoney(tierIndex('y10000'), 60, H - 52);
    g.world.addMoney(tierIndex('y10000'), 300, H - 52);
    g.buy();
    for (let i = 0; i < 20; i++) {
      g.update(config.box.dropCooldownMs + 50);
      g.drop(80 + ((i * 37) % 200));
    }
    const r = g.result();
    expect(g.play().shares).toBe(1);
    expect(r.stock).toBe(r.shares * g.price());
    expect(r.total).toBe(r.cash + r.shares * g.price());
    expect(r.stockGain).toBe(r.stock - 10000);
    expect(r.drops).toBe(20);
  });

  it('合計が初めて1億円を超えたら「億り人」の知らせが1回だけ出る', () => {
    const g = createGame(config, currency, 1);
    const events: GameEvent[] = [];
    g.onEvent((e) => events.push(e));
    g.world.addMoney(currency.tiers.length - 1, 180, H - 104, 1);
    g.update(100);
    g.update(100);
    expect(events.filter((e) => e.type === 'oku')).toHaveLength(1);
    expect(g.play().reachedOku).toBe(true);
    expect(g.result().title).toBe('t_oku'); // 株なしでも億が先
    expect(g.result().maxOku).toBe(0); // 置いた玉は合体でできたものではない
  });
});

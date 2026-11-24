// テスト用の道具：本物のデータを写して一部だけ変える

import { config, currency } from '../src/data';
import type { Config, Currency } from '../src/core/types';

export const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o)) as T;

export function cfgWith(change: (c: Config) => void = () => {}): Config {
  const c = clone(config);
  change(c);
  return c;
}

export function curWith(change: (c: Currency) => void = () => {}): Currency {
  const c = clone(currency);
  change(c);
  return c;
}

/** 段の番号（y1 → 0 など） */
export const tierIndex = (id: string): number => currency.tiers.findIndex((t) => t.id === id);

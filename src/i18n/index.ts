// 文言の取り出し（共通の決まり C7）。言語は起動時に1回だけ決める。公開時は常に ja

import { messagesByLocale } from '../data';
import type { Locale, MessageKey } from './types';

let locale: Locale = 'ja';

export function setLocale(next: Locale): void {
  locale = next;
  if (typeof document !== 'undefined') document.documentElement.lang = next;
}

export function getLocale(): Locale {
  return locale;
}

export type Vars = Record<string, string | number>;

/** {name} の形の差し込みを置き換える。値がない差し込みはそのまま残す */
export function format(template: string, vars: Vars = {}): string {
  return template.replace(/\{(\w+)\}/g, (all, name: string) => (name in vars ? String(vars[name]) : all));
}

/** 「title.start」のような点区切りのキーで文言を引く。見つからなければキーをそのまま返す */
export function t(key: MessageKey, vars?: Vars): string {
  let node: unknown = messagesByLocale[locale];
  for (const part of key.split('.')) node = (node as Record<string, unknown> | undefined)?.[part];
  return typeof node === 'string' ? format(node, vars) : key;
}

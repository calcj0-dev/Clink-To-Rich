// 文言のキーの型（共通の決まり C7）。日本語の JSON の形から「title.start」のような点区切りのキーを作る

import type jaJson from '../data/i18n/ja.json';

type Paths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Paths<T[K], `${P}${K}.`>;
}[keyof T & string];

export type Locale = 'ja';
export type MessageKey = Paths<typeof jaJson>;

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { t } from '../src/i18n';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8')) as { version: string };

describe('バージョン表示（共通の決まり C1）', () => {
  it('0.1.0 から始まる', () => {
    expect(pkg.version).toBe('0.1.0');
  });
  it('タイトルの表示は v＋package.json のバージョン', () => {
    expect(t('title.version', { version: pkg.version })).toBe('v0.1.0');
  });
});

describe('文言（共通の決まり C7）', () => {
  it('点区切りのキーで引ける', () => {
    expect(t('meta.name')).toBe('億までチャリン');
  });
  it('差し込みを置き換える', () => {
    expect(t('buy.done', { yen: '1万円' })).toBe('1株買った！（現金 −1万円）');
  });
});

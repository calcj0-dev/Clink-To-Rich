import { defineConfig } from 'vitest/config';

// バランスの試作（balance/）専用。普段のテスト（npm test）には入らない
export default defineConfig({
  test: {
    include: ['balance/_gen/**/*.bal.ts'],
    testTimeout: 3_600_000,
  },
});

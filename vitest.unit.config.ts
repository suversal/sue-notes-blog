import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/blog/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});

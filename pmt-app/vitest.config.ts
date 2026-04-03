import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node', // for testing logic
    globals: true,
  },
});

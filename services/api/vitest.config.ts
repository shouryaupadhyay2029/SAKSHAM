import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    // Resolve .js extension imports (TypeScript NodeNext style) to .ts sources
    alias: {
      // vitest + tsx handles .js → .ts resolution automatically via tsx
    },
  },
  esbuild: {
    // treat .ts files with tsx for proper compilation
    target: 'node18',
  },
});

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        // CLI entry points are thin wrappers - covered via core function tests
        'src/cli/index.ts',
        'src/cli/commands/**',
        'src/cli/utils/logger.ts',
        'src/cli/utils/prompts.ts',
        'src/cli/utils/next-command.ts',
        'src/cli/utils/retry-handler.ts',
        'src/cli/utils/index.ts',
        // Root exports
        'src/index.ts',
        // Config files
        '*.config.ts',
      ],
      thresholds: {
        lines: 70,
        branches: 60,
      },
    },
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
});

import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    passWithNoTests: true,
    include: ['**/*.{test,spec}.ts'],
    exclude: [
      ...configDefaults.exclude,
      '**/*.slow.test.ts',
      '.worktrees/**',
      '.references/**',
      '.agents/**',
      '.claude/**',
    ],
    coverage: {
      provider: 'v8',
    },
  },
});

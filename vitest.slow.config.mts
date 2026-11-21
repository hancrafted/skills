import path from 'node:path';
import { configDefaults, defineConfig } from 'vitest/config';

// Disk-read inputs rerun the whole slow lane; Vitest matches these against absolute paths.
const TRIGGERS = [
  'package-lock.json',
  'package.json',
  'skills/**',
  'docs/learnings/**',
  'tests/skills-frontmatter/**',
  'eslint.config.mjs',
  'tools/lint/**',
  'tools/references/**',
  'docs/agents/reference-repos.md',
  'vitest.slow.config.mts',
];

export default defineConfig({
  test: {
    passWithNoTests: false,
    include: ['**/*.slow.test.ts'],
    exclude: [...configDefaults.exclude, '.worktrees/**', '.references/**', '.agents/**', '.claude/**'],
    globalSetup: ['tests/slow-fence/strip-git-env.setup.ts'],
    testTimeout: 60_000,
    forceRerunTriggers: [
      ...configDefaults.forceRerunTriggers,
      ...TRIGGERS.map((glob) => path.join(import.meta.dirname, glob)),
    ],
  },
});

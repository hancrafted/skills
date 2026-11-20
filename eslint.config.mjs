import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import path from 'node:path';
import tseslint from 'typescript-eslint';
import { NAMING_FILES, UNIT_SUFFIXES } from './tools/lint/unit-suffixes.ts';

// Resolve relative imports before comparing skill identities, including nested scripts and type-only edges.
const crossSkillScripts = {
  meta: { type: 'problem', schema: [], messages: { cross: 'Scripts cannot import another skill’s scripts.' } },
  create(context) {
    const root = import.meta.dirname;
    const from = path.relative(root, context.filename).replaceAll(path.sep, '/');
    const owner = /^skills\/([^/]+)\/scripts\//.exec(from)?.[1];
    function check(node) {
      const source = node.source ?? node.arguments?.[0];
      if (!owner || typeof source?.value !== 'string' || !source.value.startsWith('.')) return;
      const target = path.relative(root, path.resolve(path.dirname(context.filename), source.value));
      const other = /^skills\/([^/]+)\/scripts\//.exec(target.replaceAll(path.sep, '/'))?.[1];
      if (other && other !== owner) context.report({ node: source, messageId: 'cross' });
    }
    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
      ImportExpression: check,
      'CallExpression[callee.name="require"]': check,
    };
  },
};

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '.archgate/**',
      '.worktrees/**',
      '.references/**',
      '.agents/**',
      '.claude/**',
    ],
  },
  {
    files: ['**/*.{ts,mts}'],
    extends: [js.configs.recommended, tseslint.configs.recommended, tseslint.configs.stylistic],
    rules: {
      complexity: ['error', 7],
      'max-lines-per-function': ['error', 30],
      'max-params': ['error', 3],
      'max-depth': ['error', 3],
      'max-lines': ['error', 250],
    },
  },
  {
    files: ['**/*.test.ts'],
    rules: { 'max-lines-per-function': 'off', 'max-lines': 'off' },
  },
  {
    files: ['skills/*/scripts/**/*.ts'],
    plugins: { skills: { rules: { 'no-cross-skill-scripts': crossSkillScripts } } },
    rules: { 'skills/no-cross-skill-scripts': 'error' },
  },
  {
    files: ['skills/*/scripts/**/*.pure.ts', 'tools/**/*.pure.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex:
                '^(node:)?(fs|child_process|net|http|https|http2|dns|dgram|tls|worker_threads|cluster|readline|process|os|perf_hooks|crypto)(/|$)',
              message: 'Pure modules perform no Node I/O; pass inputs to pure logic from a process adapter.',
            },
          ],
        },
      ],
    },
  },
  {
    files: NAMING_FILES,
    rules: { 'no-restricted-syntax': ['error', ...UNIT_SUFFIXES] },
  },
  eslintConfigPrettier,
);

import { describe, expect, it } from 'vitest';
import { parseConfig } from '../core/index.ts';
import {
  addLearningsCheck,
  decisionDocGlobs,
  detectEnforcers,
  detectPackageManager,
  installCommands,
  learningsCheckCommand,
  updateProjectConfig,
} from './setup.pure.ts';
import { REVIEW_STUB } from './stubs.pure.ts';
const FACTS = {
  baseBranch: 'trunk',
  harnessCap: 20,
  install: ['npm ci'],
  driveEntry: 'skills/drive/scripts/drive.ts',
  decisionDocs: ['docs/decision-records/**'],
};
const COMMAND = 'mh check --root docs/drive/learnings --config x.yaml && node d.ts learnings check';

describe('success cases', () => {
  describe('detectEnforcers', () => {
    it('lists an ADR checker, scripts by what they run, and hooks, and skips builds, staged-file runners and rewriting formatters', () => {
      // ARRANGE
      const facts = {
        scripts: {
          build: 'bundle',
          lint: 'oxlint',
          'lint-staged': 'lint-staged',
          typecheck: 'tsc --noEmit',
          test: 'vitest run',
          'test:slow': 'run-slow',
          format: 'oxfmt',
          'format:check': 'oxfmt --check',
          'check:docs': 'mh check',
          'check:skills': 'run --test-files',
          'test:watch': 'vitest watch',
        },
        packageManager: 'npm' as const,
        hooks: ['.husky/pre-push', '.husky/pre-commit'],
        adrChecker: true,
      };
      // ACT
      const found = detectEnforcers(facts).map(({ kind, name }) => `${kind}:${name}`);
      // ASSERT
      expect(found).toEqual([
        'adr-checker:archgate',
        'check:check:docs',
        'check:check:skills',
        'formatter:format:check',
        'linter:lint',
        'test-runner:test',
        'test-runner:test:slow',
        'type-checker:typecheck',
        'hook:.husky/pre-commit',
        'hook:.husky/pre-push',
      ]);
    });
  });
  describe('installCommands and decisionDocGlobs', () => {
    it('names the install for the lockfile present, and the decision docs for the folders present', () => {
      // ARRANGE
      // ACT
      // ASSERT
      expect(installCommands(['package-lock.json', 'yarn.lock'])).toEqual(['npm ci']);
      expect(installCommands(['pnpm-lock.yaml'])).toEqual(['pnpm install --frozen-lockfile']);
      expect(installCommands(['README.md'])).toEqual([]);
      expect(decisionDocGlobs(['docs/decision-records'], true)).toEqual([
        'docs/decision-records/**',
        '**/GLOSSARY*.md',
      ]);
      expect(decisionDocGlobs([], false)).toEqual([]);
    });
  });
  describe('the package manager', () => {
    it('runs the enforcer scripts with the manager the lockfile implies', () => {
      // ARRANGE
      const scripts = { lint: 'eslint .' };
      const commands = (files: string[]) =>
        detectEnforcers({
          scripts,
          packageManager: detectPackageManager(files),
          hooks: [],
          adrChecker: false,
        }).map((found) => found.command);
      // ACT
      // ASSERT
      expect(commands(['pnpm-lock.yaml'])).toEqual(['pnpm run lint']);
      expect(commands(['yarn.lock'])).toEqual(['yarn run lint']);
      expect(commands(['bun.lockb'])).toEqual(['bun run lint']);
      expect(commands(['package-lock.json'])).toEqual(['npm run lint']);
      expect(commands([])).toEqual(['npm run lint']);
      expect(installCommands(['bun.lock'])).toEqual(['bun install --frozen-lockfile']);
    });
  });
  describe('REVIEW_STUB', () => {
    it('is an empty template naming each calibration answer a decision page needs', () => {
      // ARRANGE
      // ACT
      // ASSERT
      expect(REVIEW_STUB).toContain('# Drive review');
      for (const heading of ['Mode', 'Audience', 'Layout', 'Depth', 'Fidelity', 'Feedback route', 'Review width'])
        expect(REVIEW_STUB).toContain(`## ${heading}`);
    });
  });
  describe('updateProjectConfig', () => {
    it('seeds a missing file with the worktree, the parallel default beside the harness cap, and the decision docs', () => {
      // ARRANGE
      const expected = {
        worktree: { baseBranch: 'trunk', install: ['npm ci'] },
        parallel: { default: 3, harnessCap: 20 },
        decisionDocs: ['docs/decision-records/**'],
      };
      // ACT
      const text = updateProjectConfig(null, FACTS);
      const config = parseConfig(text, FACTS.driveEntry);
      // ASSERT
      expect(config).toMatchObject(expected);
      expect(text).toContain('never writes harness settings');
    });

    it('seeds beforeMerge empty', () => {
      // ARRANGE
      // ACT
      const text = updateProjectConfig(null, FACTS);
      // ASSERT
      expect(text).toContain('beforeMerge: []');
      expect(parseConfig(text, FACTS.driveEntry)).toMatchObject({ worktree: { beforeMerge: [] } });
    });

    it('seeds the models each tier resolves to for the claude provider', () => {
      // ARRANGE
      // ACT
      const config = parseConfig(updateProjectConfig(null, FACTS), FACTS.driveEntry);
      // ASSERT
      expect(config).toMatchObject({
        models: { claude: { mid: 'sonnet', top: 'opus' } },
      });
    });

    it('seeds an invoke that runs the CLI at its entry', () => {
      // ARRANGE
      // ACT
      const config = parseConfig(updateProjectConfig(null, FACTS), FACTS.driveEntry);
      // ASSERT
      expect(config).toMatchObject({
        worktree: { invoke: 'node skills/drive/scripts/drive.ts worktree' },
      });
    });

    it('records the harness cap it is given beside the default', () => {
      // ARRANGE
      const harnessCap = 7;
      const expected = { parallel: { default: 3, harnessCap } };
      // ACT
      const config = parseConfig(updateProjectConfig(null, { ...FACTS, harnessCap }), FACTS.driveEntry);
      // ASSERT
      expect(config).toMatchObject(expected);
    });
  });
  describe('learningsCheckCommand', () => {
    it('runs mh over the learnings store with the config the skill ships, then the drive learnings check', () => {
      // ARRANGE
      const expected =
        'mh check --root docs/drive/learnings --config skills/drive/markdown-harness.config.yaml && node skills/drive/scripts/drive.ts learnings check';
      // ACT
      const command = learningsCheckCommand('skills/drive/scripts/drive.ts');
      // ASSERT
      expect(command).toBe(expected);
    });
  });
  describe('addLearningsCheck', () => {
    it('appends the learnings check to the check:docs script and keeps every other byte', () => {
      // ARRANGE
      const manifest = '{\n  "scripts": {\n    "check:docs": "mh check",\n    "test": "vitest"\n  }\n}\n';
      const expected = `{\n  "scripts": {\n    "check:docs": "mh check && ${COMMAND}",\n    "test": "vitest"\n  }\n}\n`;
      // ACT
      const result = addLearningsCheck(manifest, COMMAND);
      // ASSERT
      expect(result).toEqual({ text: expected });
    });
  });
});

describe('failure cases', () => {
  describe('addLearningsCheck', () => {
    it('prints the command to add when the repo has no check:docs script or no package.json', () => {
      // ARRANGE
      const expected = {
        note: `! no check:docs script in package.json: add this to the docs check, so the learnings store stays Fortify-ready:\n    ${COMMAND}`,
      };
      // ACT
      const results = [
        addLearningsCheck('{ "scripts": { "test": "vitest" } }', COMMAND),
        addLearningsCheck(null, COMMAND),
      ];
      // ASSERT
      expect(results).toEqual([expected, expected]);
    });
  });
});

describe('edge cases', () => {
  describe('detectEnforcers', () => {
    it('finds nothing in an empty repo', () => {
      // ARRANGE
      // ACT
      // ASSERT
      expect(
        detectEnforcers({
          scripts: {},
          packageManager: 'npm',
          hooks: [],
          adrChecker: false,
        }),
      ).toEqual([]);
    });
  });
  describe('updateProjectConfig', () => {
    it('keeps what the file has, comments included, and adds only the sections it lacks', () => {
      // ARRANGE
      const existing = '# mine\nworktree:\n  baseBranch: dev # why\nparallel:\n  default: 5\n';
      const expected = {
        worktree: { baseBranch: 'dev', install: [] },
        parallel: { default: 5 },
        decisionDocs: ['docs/decision-records/**'],
      };
      // ACT
      const text = updateProjectConfig(existing, FACTS);
      // ASSERT
      expect(text).toContain('# mine');
      expect(text).toContain('baseBranch: dev # why');
      expect(parseConfig(text, FACTS.driveEntry)).toMatchObject(expected);
      expect(updateProjectConfig(text, FACTS)).toBe(text);
    });
  });
  describe('addLearningsCheck', () => {
    it('leaves a check:docs that already runs it alone', () => {
      // ARRANGE
      const manifest = `{ "scripts": { "check:docs": "mh check && ${COMMAND}" } }`;
      // ACT
      const result = addLearningsCheck(manifest, COMMAND);
      // ASSERT
      expect(result).toEqual({ text: manifest });
    });
  });
});

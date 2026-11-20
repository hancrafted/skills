import { describe, expect, it } from 'vitest';
import {
  CONFIG_PATH,
  defaultsFor,
  DRIVE_FOLDER,
  harnessCapFrom,
  PARALLEL_DEFAULTS,
  parseConfig,
} from './config.pure.ts';
const ENTRY = 'skills/drive/scripts/drive.ts';

describe('success cases', () => {
  describe('parseConfig', () => {
    it('reads every worktree key', () => {
      // ARRANGE
      const text = [
        'worktree:',
        '  dir: .wt',
        '  baseBranch: trunk',
        '  remote: upstream',
        '  invoke: make wt',
        '  install: [setup]',
        '  preflight: check-health',
        '  lock: locks/mutex.ts',
        '  beforeMerge: [build]',
        '  beforeRemove: [stop]',
        '  afterMerge: [report]',
        '  afterRemove: [tidy]',
        'parallel: { default: 2, harnessCap: 8 }',
        'decisionDocs: [docs/words.md]',
        'grill: { format: docs/grilling.md }',
      ].join('\n');
      const expected = {
        worktree: {
          dir: '.wt',
          baseBranch: 'trunk',
          remote: 'upstream',
          invoke: 'make wt',
          install: ['setup'],
          preflight: 'check-health',
          lock: 'locks/mutex.ts',
          beforeMerge: ['build'],
          beforeRemove: ['stop'],
          afterMerge: ['report'],
          afterRemove: ['tidy'],
        },
        parallel: { default: 2, harnessCap: 8 },
        models: {},
        decisionDocs: ['docs/words.md'],
        grill: { format: 'docs/grilling.md' },
      };
      // ACT
      const config = parseConfig(text, ENTRY);
      // ASSERT
      expect(config).toEqual(expected);
    });

    it('reads no hooks before the merge when beforeMerge is absent', () => {
      // ARRANGE
      // ACT
      const config = parseConfig('worktree: {}', ENTRY);
      // ASSERT
      expect(config).toMatchObject({ worktree: { beforeMerge: [] } });
    });

    it('reads the models each provider gives the tiers', () => {
      // ARRANGE
      const text = 'models:\n  claude: { mid: sonnet, top: opus }\n  gemini: { mid: flash, top: pro }';
      // ACT
      const config = parseConfig(text, ENTRY);
      // ASSERT
      expect(config).toMatchObject({
        models: {
          claude: { mid: 'sonnet', top: 'opus' },
          gemini: { mid: 'flash', top: 'pro' },
        },
      });
    });

    it('defaults invoke to a command that runs the CLI at the entry it is given', () => {
      // ARRANGE
      // ACT
      const config = parseConfig('', 'tools/drive/scripts/drive.ts');
      // ASSERT
      expect(config).toMatchObject({
        worktree: { invoke: 'node tools/drive/scripts/drive.ts worktree' },
      });
    });

    it('fills the defaults for an empty file, a missing section and missing keys', () => {
      // ARRANGE
      const texts = ['', 'other: 1', 'worktree: {}'];
      // ACT
      const configs = texts.map((text) => parseConfig(text, ENTRY));
      // ASSERT
      expect(configs).toEqual(
        texts.map(() => ({
          worktree: defaultsFor(ENTRY),
          parallel: PARALLEL_DEFAULTS,
          models: {},
          decisionDocs: [],
          grill: { format: null },
        })),
      );
    });
  });
  describe('DRIVE_FOLDER', () => {
    it('is the folder that holds the project config', () => {
      // ARRANGE
      const expected = 'docs/drive';
      // ACT
      const folder = DRIVE_FOLDER;
      // ASSERT
      expect(folder).toBe(expected);
      expect(CONFIG_PATH).toMatch(new RegExp(`^${folder}/`));
    });
  });
});

describe('failure cases', () => {
  describe('parseConfig', () => {
    it('names the key that has the wrong type or is unknown', () => {
      // ARRANGE
      const texts = [
        'worktree:\n  install: setup',
        'worktree:\n  dir: 3',
        'worktree:\n  instal: []',
        '- a',
        'a: [',
        'parallel: { default: 0 }',
        'parallel: { cap: 3 }',
        'decisionDocs: x',
        'models: x',
        'models:\n  claude: { mid: sonnet }',
        'models:\n  claude: { mid: sonnet, top: opus, low: haiku }',
        'grill: { format: 3 }',
        'grill: { style: x }',
        'grill: x',
      ];
      // ACT
      const errors = texts.map((text) => parseConfig(text, ENTRY));
      // ASSERT
      expect(errors.every((config) => 'error' in config)).toBe(true);
      expect(errors.map((config) => ('error' in config ? config.error : ''))).toEqual([
        'worktree.install must be a list of shell commands',
        'worktree.dir must be a non-empty string',
        "unknown worktree key 'instal'; expected dir, baseBranch, remote, invoke, install, preflight, lock, beforeMerge, beforeRemove, afterMerge, afterRemove",
        'docs/drive/project.yml must be a mapping',
        expect.stringContaining('not valid YAML'),
        'parallel.default must be a whole number of at least 1',
        "unknown parallel key 'cap'; expected default, harnessCap",
        'decisionDocs must be a list of paths',
        'models in docs/drive/project.yml must be a mapping of provider to tiers',
        'models.claude.top must be a non-empty string',
        "unknown tier 'low' in models.claude; expected mid, top",
        'grill.format must be a non-empty path',
        "unknown grill key 'style'; expected format",
        'grill in docs/drive/project.yml must be a mapping',
      ]);
    });
  });
});

describe('edge cases', () => {
  describe('harnessCapFrom', () => {
    it('reads the harness cap from its environment variable, else the default', () => {
      // ARRANGE
      const set = { CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: '6' };
      const bad = { CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: 'many' };
      const expected = [6, PARALLEL_DEFAULTS.harnessCap, PARALLEL_DEFAULTS.harnessCap];
      // ACT
      const caps = [set, bad, {}].map(harnessCapFrom);
      // ASSERT
      expect(caps).toEqual(expected);
    });
  });
});

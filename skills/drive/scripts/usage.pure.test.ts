import { describe, expect, it } from 'vitest';
import { DRIVE_USAGE } from './usage.pure.ts';

describe('success cases', () => {
  describe('DRIVE_USAGE', () => {
    it('names every group and the verbs and flags the merged CLI added', () => {
      // ARRANGE
      const named = [
        'worktree',
        'push [--spec <epic>]',
        'pr <watch',
        '[--integration]',
        'ready <number>',
        'dispatch check',
        'transcript',
        'status <topic>',
        'setup [--check]',
        'guard',
      ];
      // ACT
      const missing = named.filter((part) => !DRIVE_USAGE.includes(part));
      // ASSERT
      expect(missing).toEqual([]);
    });
  });
});

describe('failure cases', () => {
  describe('DRIVE_USAGE', () => {
    it('advertises no --help flag, which the CLI rejects as an unknown group', () => {
      // ARRANGE
      const helpFlag = '--help';
      // ACT
      const advertised = DRIVE_USAGE.includes(helpFlag);
      // ASSERT
      expect(advertised).toBe(false);
    });
  });
});

describe('edge cases', () => {
  describe('DRIVE_USAGE', () => {
    it('is one line, so the unknown-group error that carries it is one line', () => {
      // ARRANGE
      const lineBreak = '\n';
      // ACT
      const lines = DRIVE_USAGE.split(lineBreak);
      // ASSERT
      expect(lines).toEqual([DRIVE_USAGE]);
    });
  });
});

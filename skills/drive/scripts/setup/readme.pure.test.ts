import { describe, expect, it } from 'vitest';
import { LEARNINGS_INSTALL, readRecordedVersion, renderHomeReadme } from './readme.pure.ts';

const DATE = '2026-11-20';
const VERSION = '1.1.0';
const RECORDED = 'drive@1.1.0';

describe('success cases', () => {
  describe('renderHomeReadme', () => {
    it('records the writer version and date in OKF generated on a new README', () => {
      // ARRANGE
      const generated = 'generated:\n  by: drive@1.1.0\n  at: 2026-11-20';
      // ACT
      const readme = renderHomeReadme(null, VERSION, DATE);
      // ASSERT
      expect(readme).toContain('type: readme');
      expect(readme).toContain(generated);
      expect(readRecordedVersion(readme)).toBe(RECORDED);
    });
    it('updates only generated and keeps the body an Operator edited', () => {
      // ARRANGE
      const old = renderHomeReadme(null, '1.0.0', '2026-01-01').replace('# Drive', '# Drive, my notes');
      // ACT
      const readme = renderHomeReadme(old, VERSION, DATE);
      // ASSERT
      expect(readme).toContain('# Drive, my notes');
      expect(readRecordedVersion(readme)).toBe(RECORDED);
    });
  });
  describe('LEARNINGS_INSTALL', () => {
    it('is the command the Entry check names', () => {
      // ARRANGE
      const expected = 'npx skills add hancrafted/skills --skill learnings';
      // ACT
      const command = LEARNINGS_INSTALL;
      // ASSERT
      expect(command).toBe(expected);
    });
  });
});

describe('failure cases', () => {
  describe('readRecordedVersion', () => {
    it('reads null when there is no README', () => {
      // ARRANGE
      const readme = null;
      // ACT
      const version = readRecordedVersion(readme);
      // ASSERT
      expect(version).toBeNull();
    });
    it('reads null when the front matter carries no record', () => {
      // ARRANGE
      const readme = '---\ntype: readme\n---\n# Drive\n';
      // ACT
      const version = readRecordedVersion(readme);
      // ASSERT
      expect(version).toBeNull();
    });
  });
});

describe('edge cases', () => {
  describe('renderHomeReadme', () => {
    it('adds the record to a README that has no front matter and keeps its text', () => {
      // ARRANGE
      const plain = '# Drive\n\nmine\n';
      // ACT
      const readme = renderHomeReadme(plain, VERSION, DATE);
      // ASSERT
      expect(readme).toContain('mine');
      expect(readRecordedVersion(readme)).toBe(RECORDED);
    });
  });
});

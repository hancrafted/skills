import { describe, expect, it } from 'vitest';
import type { FailureMode } from './learnings.pure.ts';
import { openTicketUrls, pickFailure, renderIssue, sourceOfLock } from './upstream.pure.ts';

const mode = (slug: string, status: FailureMode['status']): FailureMode => ({
  slug,
  title: `Title of ${slug}`,
  heading: `Title of ${slug}`,
  enforcer: 'test-runner: test',
  status,
  ticket: null,
  fixedBy: null,
  fixedOn: null,
  reason: null,
});
const row = (slug: string, count: number, status: FailureMode['status']) => ({
  slug,
  count,
  status,
  regressed: false,
});
const LOCK = JSON.stringify({
  version: 2,
  skills: { commit: { source: 'owner/repo', sourceType: 'github' }, bare: { sourceType: 'github' } },
});

describe('success cases', () => {
  describe('sourceOfLock', () => {
    it('reads the source repo of a skill from skills-lock.json', () => {
      // ARRANGE
      const expected = 'owner/repo';
      // ACT
      const source = sourceOfLock(LOCK, 'commit');
      // ASSERT
      expect(source).toBe(expected);
    });
  });

  describe('openTicketUrls', () => {
    it('lists the URLs gh printed for the open issues', () => {
      // ARRANGE
      const json = JSON.stringify([
        { url: 'https://github.com/o/r/issues/1' },
        { url: 'https://github.com/o/r/issues/2' },
      ]);
      const expected = ['https://github.com/o/r/issues/1', 'https://github.com/o/r/issues/2'];
      // ACT
      const urls = openTicketUrls(json);
      // ASSERT
      expect(urls).toEqual(expected);
    });
  });

  describe('pickFailure', () => {
    it('names the most cited proposed failure mode at a count of three or more', () => {
      // ARRANGE
      const rows = [row('a', 4, 'ticket'), row('b', 3, 'proposed'), row('c', 3, 'proposed')];
      const expected = { slug: 'b' };
      // ACT
      const picked = pickFailure(rows, null);
      // ASSERT
      expect(picked).toEqual(expected);
    });

    it('takes the failure mode the Operator names, whatever its count', () => {
      // ARRANGE
      const rows = [row('a', 1, 'proposed')];
      const expected = { slug: 'a' };
      // ACT
      const picked = pickFailure(rows, 'a');
      // ASSERT
      expect(picked).toEqual(expected);
    });
  });

  describe('renderIssue', () => {
    it('titles the failure mode and lists its count, Enforcer and evidence', () => {
      // ARRANGE
      const lines = ['2026-11-19-sweep.md: **Evidence:** push exited 0'];
      const expectedBody = [
        'Skill: commit. Cited by 3 records.',
        '',
        'Enforcer proposed: test-runner: test',
        '',
        '- 2026-11-19-sweep.md: **Evidence:** push exited 0',
        '',
      ].join('\n');
      // ACT
      const issue = renderIssue({ skill: 'commit', mode: mode('x', 'proposed'), count: 3, evidence: lines });
      // ASSERT
      expect(issue).toEqual({ title: 'Title of x', body: expectedBody });
    });
  });
});

describe('failure cases', () => {
  describe('sourceOfLock', () => {
    it('gives null for a skill the lock lacks, one with no source, and a lock that is not JSON', () => {
      // ARRANGE
      const expected = [null, null, null];
      // ACT
      const sources = [sourceOfLock(LOCK, 'drive'), sourceOfLock(LOCK, 'bare'), sourceOfLock('{', 'commit')];
      // ASSERT
      expect(sources).toEqual(expected);
    });
  });

  describe('pickFailure', () => {
    it('gives an error when no smell is open and none is named, or the named one is unknown', () => {
      // ARRANGE
      const rows = [row('a', 2, 'proposed'), row('b', 5, 'fixed')];
      const expected = [
        { error: 'no smell to file (a proposed failure mode cited 3 or more times): name one with --failure <slug>' },
        { error: 'no failure mode "zzz"' },
      ];
      // ACT
      const picked = [pickFailure(rows, null), pickFailure(rows, 'zzz')];
      // ASSERT
      expect(picked).toEqual(expected);
    });
  });
});

describe('edge cases', () => {
  describe('openTicketUrls', () => {
    it('lists none for empty output or output that is not a list', () => {
      // ARRANGE
      const expected = [[], []];
      // ACT
      const urls = [openTicketUrls(''), openTicketUrls('{"a":1}')];
      // ASSERT
      expect(urls).toEqual(expected);
    });
  });
});

import { describe, expect, it } from 'vitest';
import {
  baseAheadProblem,
  intentDriftProblem,
  notIntegrationBranch,
  quoteRefusal,
  readyProblem,
  topicOf,
} from './ready.pure.ts';

describe('success cases', () => {
  describe('baseAheadProblem', () => {
    it('passes when the base branch is not ahead', () => {
      // ARRANGE
      const ahead = 0;
      // ACT
      const problem = baseAheadProblem('main', 'feat/x', ahead);
      // ASSERT
      expect(problem).toBeNull();
    });
  });
  describe('quoteRefusal', () => {
    it('passes when no quote problem was found', () => {
      // ARRANGE
      const problems: string[] = [];
      // ACT
      const refusal = quoteRefusal('sweep', problems);
      // ASSERT
      expect(refusal).toBeNull();
    });
  });
  describe('readyProblem', () => {
    it('passes once review.md exists', () => {
      // ARRANGE
      const reviewExists = true;
      // ACT
      const problem = readyProblem('sweep', reviewExists);
      // ASSERT
      expect(problem).toBeNull();
    });
  });
  describe('intentDriftProblem', () => {
    it.each([
      ['## Intent drift\n\nnone\n'],
      ['## Summary\n\nx\n\n## Intent drift\n\nThe grill cut scope.\n\n## Tests\n'],
      ['## Intent drift'],
    ])('passes a body with the section: %j', (body) => {
      // ARRANGE
      // ACT
      const problem = intentDriftProblem(body);
      // ASSERT
      expect(problem).toBeNull();
    });
  });
});

describe('failure cases', () => {
  describe('intentDriftProblem', () => {
    it.each([[''], ['## Summary\n\nx\n'], ['Intent drift: none'], ['### Intent drift\n']])(
      'refuses a body without the section and names the fix: %j',
      (body) => {
        // ARRANGE
        const expected =
          'the PR body has no `## Intent drift` section: add one (say "none" if the Workflow held its intent) before marking the PR ready';
        // ACT
        const problem = intentDriftProblem(body);
        // ASSERT
        expect(problem).toBe(expected);
      },
    );
  });
  describe('baseAheadProblem', () => {
    it('refuses with the count and says to sync then push', () => {
      // ARRANGE
      const expected = [
        'origin/main has 3 commits origin/feat/x lacks: run drive worktree sync, then drive push',
        'origin/main has 1 commit origin/feat/x lacks: run drive worktree sync, then drive push',
      ];
      // ACT
      const problems = [3, 1].map((ahead) => baseAheadProblem('main', 'feat/x', ahead));
      // ASSERT
      expect(problems).toEqual(expected);
    });
  });
  describe('quoteRefusal', () => {
    it('names the file and lists each bad quote on its own line', () => {
      // ARRANGE
      const problems = ['file not found: a.md', 'quote not on b.md:2: "x"'];
      const expected =
        '.scratch/sweep/review.md has contradiction quotes that do not check out (drive review quotes):\n- file not found: a.md\n- quote not on b.md:2: "x"';
      // ACT
      const refusal = quoteRefusal('sweep', problems);
      // ASSERT
      expect(refusal).toBe(expected);
    });
  });
  describe('readyProblem', () => {
    it('refuses without review.md and names the file', () => {
      // ARRANGE
      const expected =
        '.scratch/sweep/review.md does not exist: run the review (references/review.md) and log its verdicts before marking the PR ready';
      // ACT
      const problem = readyProblem('sweep', false);
      // ASSERT
      expect(problem).toBe(expected);
    });
  });
  describe('notIntegrationBranch', () => {
    it('names the branch and says to use the Integration PR', () => {
      // ARRANGE
      const expected =
        'chore/x--1-a is not an Integration branch (<type>/<slug>); run drive pr ready on the Integration PR, not a Task branch';
      // ACT
      const message = notIntegrationBranch('chore/x--1-a');
      // ASSERT
      expect(message).toBe(expected);
    });
  });
});

describe('edge cases', () => {
  describe('topicOf', () => {
    it('is the slug of the Integration branch, and null for anything else', () => {
      // ARRANGE
      const branches = ['chore/drive-fortify-sweep', 'main', 'chore/drive-fortify-sweep--791-ac-gate', 'feat/a/b'];
      const expected = ['drive-fortify-sweep', null, null, null];
      // ACT
      const topics = branches.map(topicOf);
      // ASSERT
      expect(topics).toEqual(expected);
    });
  });
});

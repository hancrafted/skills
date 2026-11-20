import { describe, expect, it } from 'vitest';
import { notIntegrationBranch, readyProblem, topicOf } from './ready.pure.ts';

describe('success cases', () => {
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
});

describe('failure cases', () => {
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

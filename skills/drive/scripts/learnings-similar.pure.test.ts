import { describe, expect, it } from 'vitest';
import { renderSimilar, similarTitles } from './learnings-similar.pure.ts';
import type { FailureMode } from './learnings.pure.ts';
const PUSH = 'push-exits-zero';
const PUSH_TITLE = 'drive push exits 0 when the remote rejected the commit';
const mode = (slug: string, title: string): FailureMode => ({
  slug,
  title,
  heading: title,
  enforcer: 'test-runner: test',
  status: 'proposed',
  ticket: null,
  fixedBy: null,
  fixedOn: null,
  reason: null,
});
const MODES = [
  mode(PUSH, PUSH_TITLE),
  mode('guard-covers-husky-only', 'Guard wiring covers husky only'),
  mode('fortify-skipped-before-deadline', 'The Operator skips Fortify before a deadline'),
];

describe('success cases', () => {
  it('ranks the closest titles by word overlap over the union of both word sets, with scores', () => {
    // ARRANGE
    const query = 'push exits zero although the remote did not take the commit';
    const extra = mode('push-without-pr', 'push runs after the pull request merged');
    const expected = [
      { slug: PUSH, title: PUSH_TITLE, score: 0.4 },
      { slug: 'push-without-pr', title: extra.title, score: 0.08 },
    ];
    // ACT
    const matches = similarTitles(query, [...MODES, extra]);
    // ASSERT
    expect(matches).toEqual(expected);
  });

  it('prints each match as score, slug and title', () => {
    // ARRANGE
    const matches = [{ slug: PUSH, title: PUSH_TITLE, score: 0.4 }];
    const expected = `0.40  ${PUSH}  ${PUSH_TITLE}`;
    // ACT
    const text = renderSimilar(matches);
    // ASSERT
    expect(text).toBe(expected);
  });
});

describe('failure cases', () => {
  it('returns no match for text that shares only stop words with every title', () => {
    // ARRANGE
    // ACT
    const matches = similarTitles('the of and', MODES);
    // ASSERT
    expect(matches).toEqual([]);
  });
});

describe('edge cases', () => {
  it('keeps the three best of a tie, in slug order', () => {
    // ARRANGE
    const many = ['one', 'two', 'three', 'four'].map((word) => mode(`push-${word}`, `push ${word}`));
    const expected = ['push-four', 'push-one', 'push-three'];
    // ACT
    const slugs = similarTitles('push', many).map(({ slug }) => slug);
    // ASSERT
    expect(slugs).toEqual(expected);
  });
});

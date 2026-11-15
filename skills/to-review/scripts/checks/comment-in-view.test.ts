import { describe, expect, it } from 'vitest';
import type { Rect } from '../grader/viewport.pure.ts';
import { check } from './comment-in-view.ts';

const VIEWPORT = { width: 1024, height: 768 };
const field = (id: string, visual: Rect | null) => ({
  facts: { tag: 'textarea', id, item: 'store', text: '' },
  visual,
});

describe('success cases', () => {
  it('passes when every comment field keeps at least half its visual in view', () => {
    // ARRANGE
    const fields = [
      field('c-store-memory', { top: 120, left: 264, width: 680, height: 113 }),
      field('c-store', { top: -50, left: 264, width: 680, height: 113 }),
    ];

    // ACT
    const problems = check.judge({ viewport: VIEWPORT, fields });

    // ASSERT
    expect(problems).toEqual([]);
  });

  it('skips a comment field whose item has no visual', () => {
    // ARRANGE
    const fields = [field('c-expiry', null)];

    // ACT
    const problems = check.judge({ viewport: VIEWPORT, fields });

    // ASSERT
    expect(problems).toEqual([]);
  });
});

describe('failure cases', () => {
  it('fails a comment field that pushes its visual out of view', () => {
    // ARRANGE
    const fields = [field('c-store-redis', { top: -900, left: 264, width: 680, height: 113 })];
    const expected = [
      'while textarea#c-store-redis in item "store" has focus, 0% of its visual is in view; keep at least half of it beside the comment',
    ];

    // ACT
    const problems = check.judge({ viewport: VIEWPORT, fields });

    // ASSERT
    expect(problems).toEqual(expected);
  });
});

describe('edge cases', () => {
  it('fails a visual just under half in view and rounds the share down', () => {
    // ARRANGE
    const fields = [field('c-store', { top: -58, left: 264, width: 680, height: 113 })];
    const expected = [
      'while textarea#c-store in item "store" has focus, 48% of its visual is in view; keep at least half of it beside the comment',
    ];

    // ACT
    const problems = check.judge({ viewport: VIEWPORT, fields });

    // ASSERT
    expect(problems).toEqual(expected);
  });
});

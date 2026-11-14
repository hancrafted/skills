import { describe, expect, it } from 'vitest';
import { shownShare } from './viewport.pure.ts';

const VIEWPORT = { width: 1024, height: 768 };
const rect = (top: number, height: number) => ({ top, left: 0, width: 400, height });

describe('success cases', () => {
  it('is 1 for a box wholly inside the viewport', () => {
    // ARRANGE
    const box = rect(100, 200);

    // ACT
    const share = shownShare(box, VIEWPORT);

    // ASSERT
    expect(share).toBe(1);
  });

  it('measures a box taller than the viewport against the viewport, so filling the screen counts as shown', () => {
    // ARRANGE
    const box = rect(-500, 2000);

    // ACT
    const share = shownShare(box, VIEWPORT);

    // ASSERT
    expect(share).toBe(1);
  });
});

describe('failure cases', () => {
  it('is the shown fraction of a box cut by the bottom edge', () => {
    // ARRANGE
    const box = rect(668, 400);
    const expected = 0.25;

    // ACT
    const share = shownShare(box, VIEWPORT);

    // ASSERT
    expect(share).toBe(expected);
  });

  it('is 0 for a box scrolled out of view', () => {
    // ARRANGE
    const box = rect(-300, 200);

    // ACT
    const share = shownShare(box, VIEWPORT);

    // ASSERT
    expect(share).toBe(0);
  });
});

describe('edge cases', () => {
  it('multiplies the shown fractions of both axes', () => {
    // ARRANGE
    const box = { ...rect(668, 200), left: 824 };
    const expected = 0.25;

    // ACT
    const share = shownShare(box, VIEWPORT);

    // ASSERT
    expect(share).toBe(expected);
  });

  it('is 0 for a box with no area', () => {
    // ARRANGE
    const box = rect(100, 0);

    // ACT
    const share = shownShare(box, VIEWPORT);

    // ASSERT
    expect(share).toBe(0);
  });
});

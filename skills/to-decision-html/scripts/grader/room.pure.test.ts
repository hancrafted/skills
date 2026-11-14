import { describe, expect, it } from 'vitest';
import { navigationTaken, railWidth } from './room.pure.ts';

const rect = (left: number, width: number) => ({ top: 0, left, width, height: 400 });

describe('success cases', () => {
  it('is the right edge of a navigation that sits left of the content', () => {
    // ARRANGE
    const nav = rect(32, 200);
    const expected = 232;

    // ACT
    const taken = navigationTaken(nav, 264);

    // ASSERT
    expect(taken).toBe(expected);
  });

  it('is 0 when the page has no visible navigation', () => {
    // ARRANGE
    const nav = null;

    // ACT
    const taken = navigationTaken(nav, 32);

    // ASSERT
    expect(taken).toBe(0);
  });

  it('is the widest Option that sits beside the column', () => {
    // ARRANGE
    const column = rect(264, 1000);
    const options = [rect(1288, 300), rect(1288, 320)];
    const expected = 320;

    // ACT
    const width = railWidth(column, options);

    // ASSERT
    expect(width).toBe(expected);
  });
});

describe('failure cases', () => {
  it('is 0 for a navigation spanning the content, as a bar above it does', () => {
    // ARRANGE
    const nav = rect(0, 1440);

    // ACT
    const taken = navigationTaken(nav, 32);

    // ASSERT
    expect(taken).toBe(0);
  });

  it('is 0 when every Option sits under the column', () => {
    // ARRANGE
    const column = rect(264, 1000);
    const options = [rect(264, 1000)];

    // ACT
    const width = railWidth(column, options);

    // ASSERT
    expect(width).toBe(0);
  });
});

describe('edge cases', () => {
  it('tolerates a pixel of overlap', () => {
    // ARRANGE
    const nav = rect(32, 200);
    const expected = 232;

    // ACT
    const taken = navigationTaken(nav, 231);

    // ASSERT
    expect(taken).toBe(expected);
  });

  it('counts an Option starting a pixel inside the column edge as beside it', () => {
    // ARRANGE
    const column = rect(264, 1000);
    const options = [rect(1263, 300)];
    const expected = 300;

    // ACT
    const width = railWidth(column, options);

    // ASSERT
    expect(width).toBe(expected);
  });
});

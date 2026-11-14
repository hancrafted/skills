import { describe, expect, it } from 'vitest';
import { check } from './item-nav.ts';

const VIEWPORT = { width: 1440, height: 900 };
const SHOWN = { top: 16, left: 32, width: 200, height: 120 };
const GONE = { top: -700, left: 32, width: 200, height: 120 };

describe('success cases', () => {
  it('passes a navigation that links every item and stays in view at every scroll position', () => {
    // ARRANGE
    const observation = {
      viewport: VIEWPORT,
      unlinked: [],
      positions: [
        { at: 'the top of the page', nav: SHOWN },
        { at: 'item "store"', nav: SHOWN },
        { at: 'the end of the page', nav: SHOWN },
      ],
    };

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual([]);
  });
});

describe('failure cases', () => {
  it('fails a page without item navigation', () => {
    // ARRANGE
    const observation = { viewport: VIEWPORT, unlinked: ['store'], positions: null };
    const expected = ['the page has no item navigation; add a <nav> that links to every item'];

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails a navigation that scrolls away with the page', () => {
    // ARRANGE
    const observation = {
      viewport: VIEWPORT,
      unlinked: [],
      positions: [
        { at: 'the top of the page', nav: SHOWN },
        { at: 'item "expiry"', nav: GONE },
        { at: 'the end of the page', nav: GONE },
      ],
    };
    const expected = [
      'the item navigation leaves the viewport at item "expiry", the end of the page; make it sticky or fixed',
    ];

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual(expected);
  });
});

describe('edge cases', () => {
  it('fails items the navigation does not link to', () => {
    // ARRANGE
    const observation = {
      viewport: VIEWPORT,
      unlinked: ['expiry'],
      positions: [{ at: 'the top of the page', nav: SHOWN }],
    };
    const expected = ['the item navigation has no link to item "expiry"'];

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('counts a navigation under half shown as out of view', () => {
    // ARRANGE
    const observation = {
      viewport: VIEWPORT,
      unlinked: [],
      positions: [{ at: 'item "store"', nav: { top: -70, left: 32, width: 200, height: 120 } }],
    };
    const expected = ['the item navigation leaves the viewport at item "store"; make it sticky or fixed'];

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual(expected);
  });
});

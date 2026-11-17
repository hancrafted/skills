import { describe, expect, it } from 'vitest';
import type { NavigationState } from '../grader/layout.ts';
import type { Rect } from '../grader/viewport.pure.ts';
import { check } from './laptop-room.ts';

const VIEWPORT = { width: 1440, height: 900 };
const rect = (left: number, width: number): Rect => ({ top: 100, left, width, height: 300 });
interface Item {
  id: string;
  left: number;
  column: Rect | null;
  options: { id: string; rect: Rect; visual: Rect | null }[];
}
const item = (id: string, overrides: Partial<Item> = {}): Item => ({
  id,
  left: 32,
  column: rect(48, 1020),
  options: [{ id: 'a', rect: rect(1092, 300), visual: null }],
  ...overrides,
});
const observation = (overrides: { navigation?: NavigationState; nav?: Rect | null; items?: Item[] } = {}) => ({
  viewport: VIEWPORT,
  navigation: 'collapsed' as NavigationState,
  nav: null as Rect | null,
  items: [item('store'), item('expiry')],
  ...overrides,
});

describe('success cases', () => {
  it('passes a collapsed navigation, a 1000 px column and a rail beside it', () => {
    // ARRANGE
    const loaded = observation();

    // ACT
    const problems = check.judge(loaded);

    // ASSERT
    expect(problems).toEqual([]);
  });

  it('passes a page that keeps its navigation beside the content, measured as it is', () => {
    // ARRANGE
    const loaded = observation({
      navigation: 'none',
      nav: rect(32, 200),
      items: [item('store', { left: 264, column: rect(280, 1020), options: [] })],
    });

    // ACT
    const problems = check.judge(loaded);

    // ASSERT
    expect(problems).toEqual([]);
  });

  it('skips the column of an item without a visual and the rail of one without Options', () => {
    // ARRANGE
    const loaded = observation({ items: [item('expiry', { column: null, options: [] })] });

    // ACT
    const problems = check.judge(loaded);

    // ASSERT
    expect(problems).toEqual([]);
  });
});

describe('failure cases', () => {
  it('fails an Option section whose own visual is under 1000 px', () => {
    // ARRANGE
    const sectioned = item('fortify', {
      column: null,
      options: [{ id: 'bare', rect: rect(48, 1020), visual: rect(48, 640) }],
    });
    const expected = [
      'item "fortify": option "bare" has a visual 640px wide with the navigation collapsed; keep at least 1000px',
    ];

    // ACT
    const problems = check.judge(observation({ items: [sectioned] }));

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('checks a mixed item: Options with a visual by width, the others by the rail rule', () => {
    // ARRANGE
    const mixed = item('fortify', {
      column: rect(48, 1020),
      options: [
        { id: 'bare', rect: rect(48, 1020), visual: rect(48, 640) },
        { id: 'plain', rect: rect(48, 1020), visual: null },
      ],
    });
    const expected = [
      'item "fortify": option "bare" has a visual 640px wide with the navigation collapsed; keep at least 1000px',
      'item "fortify": option "plain" sits under the content column, not in a rail beside it; put the Options in a rail to its right',
    ];

    // ACT
    const problems = check.judge(observation({ items: [mixed] }));

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails an empty column left of the content after the navigation collapsed', () => {
    // ARRANGE
    const loaded = observation({ items: [item('store', { left: 152, column: rect(168, 1020), options: [] })] });
    const expected = [
      "with the navigation collapsed, the items start 152px from the left edge, leaving a 152px empty column; give the navigation's width back (a gutter is at most 48px)",
    ];

    // ACT
    const problems = check.judge(loaded);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails a content column under 1000 px', () => {
    // ARRANGE
    const loaded = observation({ items: [item('store', { column: rect(48, 868) })] });
    const expected = [
      'item "store": the content column is 868px wide with the navigation collapsed; keep at least 1000px with the rail beside it',
    ];

    // ACT
    const problems = check.judge(loaded);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails Options that sit under the content instead of in a rail beside it', () => {
    // ARRANGE
    const loaded = observation({
      items: [item('store', { options: [{ id: 'redis', rect: rect(48, 1020), visual: null }] })],
    });
    const expected = [
      'item "store": option "redis" sits under the content column, not in a rail beside it; put the Options in a rail to its right',
    ];

    // ACT
    const problems = check.judge(loaded);

    // ASSERT
    expect(problems).toEqual(expected);
  });
});

describe('edge cases', () => {
  it('passes Option sections of 1000 px visuals that sit under each other, not in a rail', () => {
    // ARRANGE
    const sectioned = item('fortify', {
      column: null,
      options: [
        { id: 'bare', rect: rect(48, 1020), visual: rect(48, 1000) },
        { id: 'phase', rect: rect(48, 1020), visual: rect(48, 1020) },
      ],
    });

    // ACT
    const problems = check.judge(observation({ items: [sectioned] }));

    // ASSERT
    expect(problems).toEqual([]);
  });

  it('accepts a start exactly one gutter from the edge and a column of exactly 1000 px', () => {
    // ARRANGE
    const loaded = observation({ items: [item('store', { left: 48, column: rect(48, 1000) })] });

    // ACT
    const problems = check.judge(loaded);

    // ASSERT
    expect(problems).toEqual([]);
  });

  it('measures the empty column from the navigation when the page has no collapsible one', () => {
    // ARRANGE
    const loaded = observation({
      navigation: 'none',
      nav: rect(32, 200),
      items: [item('store', { left: 340, column: rect(356, 1020), options: [] })],
    });
    const expected = [
      "as the page stands, the items start 340px from the left edge, leaving a 108px empty column; give the navigation's width back (a gutter is at most 48px)",
    ];

    // ACT
    const problems = check.judge(loaded);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('names a navigation that did not collapse as open', () => {
    // ARRANGE
    const loaded = observation({
      navigation: 'open',
      nav: rect(32, 200),
      items: [item('store', { left: 264, column: rect(280, 900), options: [] })],
    });
    const expected = [
      'item "store": the content column is 900px wide with the navigation open; keep at least 1000px with the rail beside it',
    ];

    // ACT
    const problems = check.judge(loaded);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('passes a page with no item', () => {
    // ARRANGE
    const loaded = observation({ items: [] });

    // ACT
    const problems = check.judge(loaded);

    // ASSERT
    expect(problems).toEqual([]);
  });
});

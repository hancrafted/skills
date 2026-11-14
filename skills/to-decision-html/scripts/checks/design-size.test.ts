import { describe, expect, it } from 'vitest';
import type { NavigationState } from '../grader/layout.ts';
import type { Rect } from '../grader/viewport.pure.ts';
import { check } from './design-size.ts';

const VIEWPORT = { width: 2560, height: 1440 };
const rect = (left: number, width: number): Rect => ({ top: 100, left, width, height: 600 });
interface Visual {
  item: string;
  design: string;
  rect: Rect;
  options: { id: string; rect: Rect }[];
}
/** A visual declaring a 1920 px design width, rendered at `width`, with a 300 px rail beside it. */
const visual = (width: number, overrides: Partial<Visual> = {}): Visual => ({
  item: 'store',
  design: '1920',
  rect: rect(48, width),
  options: [{ id: 'a', rect: rect(48 + width + 24, 300) }],
  ...overrides,
});
const observation = (visuals: Visual[], overrides: { navigation?: NavigationState; nav?: Rect | null } = {}) => ({
  viewport: VIEWPORT,
  navigation: 'collapsed' as NavigationState,
  nav: null as Rect | null,
  visuals,
  ...overrides,
});

describe('success cases', () => {
  it('passes a visual that grows to its design width', () => {
    // ARRANGE
    const loaded = observation([visual(1920)]);

    // ACT
    const problems = check.judge(loaded);

    // ASSERT
    expect(problems).toEqual([]);
  });

  it('passes a page whose visuals declare no design width', () => {
    // ARRANGE
    const loaded = observation([]);

    // ACT
    const problems = check.judge(loaded);

    // ASSERT
    expect(problems).toEqual([]);
  });

  it('asks only for the room that is left when the design width does not fit beside the rail', () => {
    // ARRANGE
    const loaded = observation([visual(2116, { design: '2400' })]);

    // ACT
    const problems = check.judge(loaded);

    // ASSERT
    expect(problems).toEqual([]);
  });
});

describe('failure cases', () => {
  it('fails a visual capped well under its design width', () => {
    // ARRANGE
    const loaded = observation([visual(1192)]);
    const expected = [
      'item "store": its visual declares a design width of 1920px but renders 1192px wide at 2560 × 1440 with the navigation collapsed; let it grow to at least 1920px',
    ];

    // ACT
    const problems = check.judge(loaded);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails a design width that is not a positive integer', () => {
    // ARRANGE
    const loaded = observation([visual(1920, { design: 'full' })]);
    const expected = ['item "store": data-design-width is "full"; expected a positive integer such as 1920'];

    // ACT
    const problems = check.judge(loaded);

    // ASSERT
    expect(problems).toEqual(expected);
  });
});

describe('edge cases', () => {
  it('subtracts the rail and three gutters from the screen when the design width is larger', () => {
    // ARRANGE: 2560 - 0 - 300 - 3 * 48 = 2116, so 2115 is one pixel short.
    const loaded = observation([visual(2115, { design: '3840' })]);
    const expected = [
      'item "store": its visual declares a design width of 3840px but renders 2115px wide at 2560 × 1440 with the navigation collapsed; let it grow to at least 2116px',
    ];

    // ACT
    const problems = check.judge(loaded);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('subtracts a navigation that stays beside the content', () => {
    // ARRANGE: 2560 - 232 - 300 - 144 = 1884, below the design width of 1920.
    const loaded = observation(
      [visual(1884, { rect: rect(264, 1884), options: [{ id: 'a', rect: rect(2172, 300) }] })],
      {
        navigation: 'none',
        nav: rect(32, 200),
      },
    );

    // ACT
    const problems = check.judge(loaded);

    // ASSERT
    expect(problems).toEqual([]);
  });

  it('counts a visual with no rail beside it against the whole width', () => {
    // ARRANGE
    const loaded = observation([visual(1500, { options: [{ id: 'a', rect: rect(48, 1500) }] })]);
    const expected = [
      'item "store": its visual declares a design width of 1920px but renders 1500px wide at 2560 × 1440 with the navigation collapsed; let it grow to at least 1920px',
    ];

    // ACT
    const problems = check.judge(loaded);

    // ASSERT
    expect(problems).toEqual(expected);
  });
});

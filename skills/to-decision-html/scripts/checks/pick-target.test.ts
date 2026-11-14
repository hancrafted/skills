import { describe, expect, it } from 'vitest';
import { check } from './pick-target.ts';

const control = (width: number, height: number, label = 'Pick A') => ({
  facts: { tag: 'input', id: '', item: 'store', text: label },
  width,
  height,
  label,
});
const option = (id: string, controls: ReturnType<typeof control>[]) => ({ item: 'store', option: id, controls });

describe('success cases', () => {
  it('passes Options whose pick control is at least 44 by 44 px with a visible label', () => {
    // ARRANGE
    const options = [option('memory', [control(120, 44)]), option('redis', [control(300, 60, 'Pick B')])];

    // ACT
    const problems = check.judge({ options });

    // ASSERT
    expect(problems).toEqual([]);
  });

  it('passes a page with no Option to pick', () => {
    // ARRANGE
    const options: never[] = [];

    // ACT
    const problems = check.judge({ options });

    // ASSERT
    expect(problems).toEqual([]);
  });

  it('passes an Option when one of its controls is large and labelled, however small the others are', () => {
    // ARRANGE
    const options = [option('memory', [control(13, 13, ''), control(200, 48)])];

    // ACT
    const problems = check.judge({ options });

    // ASSERT
    expect(problems).toEqual([]);
  });

  it('skips an Option that is not shown, as one inside a closed detail layer', () => {
    // ARRANGE
    const options = [{ ...option('redis', []), hidden: true }];

    // ACT
    const problems = check.judge({ options });

    // ASSERT
    expect(problems).toEqual([]);
  });
});

describe('failure cases', () => {
  it('fails an Option without a pick control', () => {
    // ARRANGE
    const options = [option('redis', [])];
    const expected = [
      'option "redis" in item "store" has no pick control; give it a radio, checkbox, select or button[aria-pressed] inside it, or one whose value is "redis"',
    ];

    // ACT
    const problems = check.judge({ options });

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails a pick control with a small hit area', () => {
    // ARRANGE
    const options = [option('memory', [control(70, 24)])];
    const expected = [
      'option "memory" in item "store": its pick control input "Pick A" in item "store" has a 70 × 24 px hit area; make it at least 44 × 44 px',
    ];

    // ACT
    const problems = check.judge({ options });

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails a pick control with no visible text label', () => {
    // ARRANGE
    const options = [option('memory', [control(60, 60, '')])];
    const expected = [
      'option "memory" in item "store": its pick control input "" in item "store" shows no text label; an aria-label is not shown, so add visible text',
    ];

    // ACT
    const problems = check.judge({ options });

    // ASSERT
    expect(problems).toEqual(expected);
  });
});

describe('edge cases', () => {
  it('accepts exactly 44 px and rounds a fractional size down before judging', () => {
    // ARRANGE
    const options = [option('memory', [control(44, 44)]), option('redis', [control(44, 43.6, 'Pick B')])];
    const expected = [
      'option "redis" in item "store": its pick control input "Pick B" in item "store" has a 44 × 43 px hit area; make it at least 44 × 44 px',
    ];

    // ACT
    const problems = check.judge({ options });

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('reports both faults of the largest control when no control is good', () => {
    // ARRANGE
    const options = [option('memory', [control(13, 13, ''), control(50, 20, '  ')])];
    const expected = [
      'option "memory" in item "store": its pick control input "" in item "store" has a 50 × 20 px hit area; make it at least 44 × 44 px',
      'option "memory" in item "store": its pick control input "" in item "store" shows no text label; an aria-label is not shown, so add visible text',
    ];

    // ACT
    const problems = check.judge({ options });

    // ASSERT
    expect(problems).toEqual(expected);
  });
});

import { describe, expect, it } from 'vitest';
import { check } from './visible-focus.ts';

const PLAIN = {
  outlineStyle: 'none',
  outlineWidth: 0,
  outlineColor: 'rgb(0, 0, 0)',
  outlineAlpha: 1,
  boxShadow: 'none',
  border: '1px solid rgb(217, 213, 204)',
  background: 'rgb(255, 255, 255)',
  textDecoration: 'none',
};
const RING = { ...PLAIN, outlineStyle: 'solid', outlineWidth: 3, outlineColor: 'rgb(179, 71, 14)' };
const facts = (id: string) => ({ tag: 'textarea', id, item: 'store', text: '' });

describe('success cases', () => {
  it('passes controls that gain an outline, a shadow, a new border or the browser ring when focused', () => {
    // ARRANGE
    const reached = [
      { facts: facts('a'), before: PLAIN, focused: RING },
      { facts: facts('b'), before: PLAIN, focused: { ...PLAIN, boxShadow: 'rgb(31, 95, 174) 0px 0px 0px 3px' } },
      { facts: facts('c'), before: PLAIN, focused: { ...PLAIN, border: '2px solid rgb(31, 95, 174)' } },
      { facts: facts('d'), before: PLAIN, focused: { ...PLAIN, outlineStyle: 'auto', outlineWidth: 1 } },
    ];

    // ACT
    const problems = check.judge({ controls: 4, reached });

    // ASSERT
    expect(problems).toEqual([]);
  });
});

describe('failure cases', () => {
  it('fails a control that looks the same focused and unfocused', () => {
    // ARRANGE
    const reached = [{ facts: facts('c-store'), before: PLAIN, focused: PLAIN }];
    const expected = [
      'textarea#c-store in item "store" shows no focus indicator when Tab reaches it; style :focus-visible with an outline',
    ];

    // ACT
    const problems = check.judge({ controls: 1, reached });

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails a page whose controls Tab never reaches', () => {
    // ARRANGE
    const observation = { controls: 4, reached: [] };
    const expected = ['Tab reaches none of the page’s 4 controls; keep them in the keyboard order'];

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual(expected);
  });
});

describe('edge cases', () => {
  it('does not count an outline the control already had, nor a transparent one', () => {
    // ARRANGE
    const reached = [
      { facts: facts('kept'), before: RING, focused: RING },
      {
        facts: facts('clear'),
        before: PLAIN,
        focused: { ...RING, outlineColor: 'rgba(0, 0, 0, 0)', outlineAlpha: 0 },
      },
    ];
    const expected = [
      'textarea#kept in item "store" shows no focus indicator when Tab reaches it; style :focus-visible with an outline',
      'textarea#clear in item "store" shows no focus indicator when Tab reaches it; style :focus-visible with an outline',
    ];

    // ACT
    const problems = check.judge({ controls: 2, reached });

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('passes a page with no controls', () => {
    // ARRANGE
    const observation = { controls: 0, reached: [] };

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual([]);
  });
});

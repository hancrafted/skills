import { describe, expect, it } from 'vitest';
import { fixturePage } from '../grader/fixtures.ts';
import { check } from './decide-controls.ts';

const REFLECTION = '<div data-reflection><p>What breaks first?</p></div>';
const NEXT = '<div data-next-action><select><option>Approve</option></select></div>';
const item = (options: string): string => `<section data-item="a">${options}</section>`;
const option = (id: string, recommended: boolean): string =>
  `<div data-option="${id}" data-recommended="${recommended}"></div>`;

describe('success cases', () => {
  it('passes the valid decide page', () => {
    // ARRANGE
    const html = fixturePage('valid-decide');

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual([]);
  });

  it('passes a Next action offered as radio inputs and an item without Options', () => {
    // ARRANGE
    const next = '<fieldset data-next-action><input type="radio" name="n" checked /></fieldset>';
    const html = `${item('')}${REFLECTION}${next}`;

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual([]);
  });
});

describe('failure cases', () => {
  it('fails an item recommending two Options', () => {
    // ARRANGE
    const html = fixturePage('decide-controls--two-recommended');
    const expected = ['item "store" recommends 2 Options; mark exactly one data-recommended="true"'];

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails a page without a Next action', () => {
    // ARRANGE
    const html = fixturePage('decide-controls--no-next-action');
    const expected = ['the page has 0 [data-next-action]; expected exactly one'];

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails a page without the reflection block', () => {
    // ARRANGE
    const html = fixturePage('decide-controls--no-reflection');
    const expected = ['the page has 0 [data-reflection]; expected exactly one'];

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual(expected);
  });
});

describe('edge cases', () => {
  it('fails an item recommending none, a Next action without choices and an unordered reflection', () => {
    // ARRANGE
    const html = `${item(option('x', false) + option('y', false))}<div data-next-action></div>${REFLECTION}`;
    const expected = [
      'item "a" recommends 0 Options; mark exactly one data-recommended="true"',
      '[data-next-action] holds no <select> or radio input to choose the action',
      '[data-reflection] sits below [data-next-action]; put it above',
    ];

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails a reflection block that asks no question', () => {
    // ARRANGE
    const html = `${item(option('x', true))}<div data-reflection><p>Consider security.</p></div>${NEXT}`;
    const expected = ['[data-reflection] asks no open question; expected prompts ending in "?"'];

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('applies to decide pages only', () => {
    // ARRANGE
    const expected = ['decide'];

    // ACT
    const modes = check.modes;

    // ASSERT
    expect(modes).toEqual(expected);
  });
});

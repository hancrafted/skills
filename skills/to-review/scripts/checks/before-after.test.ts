import { describe, expect, it } from 'vitest';
import { fixturePage } from '../grader/fixtures.ts';
import { check } from './before-after.ts';

const SVG = '<svg role="img"></svg>';
const STEPS = '<ol><li>one</li><li>two</li></ol>';
const option = (before: string, after: string): string => `<article data-option="a">${before}${after}</article>`;

describe('success cases', () => {
  it('passes the valid decide page, whose Options change nothing existing', () => {
    // ARRANGE
    const html = fixturePage('valid-decide');

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual([]);
  });

  it('passes a pair holding an svg and a list of steps', () => {
    // ARRANGE
    const html = option(`<div data-before>${SVG}</div>`, `<div data-after>${STEPS}</div>`);

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual([]);
  });

  it('passes a pair set directly on img and canvas elements', () => {
    // ARRANGE
    const html = option('<img data-before src="b.png" alt="" />', '<canvas data-after></canvas>');

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual([]);
  });
});

describe('failure cases', () => {
  it('fails an Option with data-before and no data-after', () => {
    // ARRANGE
    const html = fixturePage('before-after--missing-after');
    const expected = ['Option "memory" has data-before but no data-after; give both or neither'];

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails a pair that holds only prose', () => {
    // ARRANGE
    const html = fixturePage('before-after--prose-pair');
    const expected = [
      'Option "memory" data-before holds no visual; use an svg, img, canvas or at least two steps',
      'Option "memory" data-after holds no visual; use an svg, img, canvas or at least two steps',
    ];

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual(expected);
  });
});

describe('edge cases', () => {
  it('fails a data-after alone and a one-step list', () => {
    // ARRANGE
    const html = option('', `<div data-after><ul><li>only</li></ul></div>`);
    const expected = [
      'Option "a" has data-after but no data-before; give both or neither',
      'Option "a" data-after holds no visual; use an svg, img, canvas or at least two steps',
    ];

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('passes a flow of div steps', () => {
    // ARRANGE
    const flow = '<div class="flow"><div>one</div><div>two</div></div>';
    const html = option(`<div data-before>${flow}</div>`, `<div data-after>${STEPS}</div>`);

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual([]);
  });

  it('fails one step that nests a list of two', () => {
    // ARRANGE
    const nested = '<ul><li>one<ul><li>a</li><li>b</li></ul></li></ul>';
    const html = option(`<div data-before>${nested}</div>`, `<div data-after>${STEPS}</div>`);
    const expected = ['Option "a" data-before holds no visual; use an svg, img, canvas or at least two steps'];

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('applies to both modes', () => {
    // ARRANGE
    const expected = undefined;

    // ACT
    const modes = check.modes;

    // ASSERT
    expect(modes).toBe(expected);
  });
});

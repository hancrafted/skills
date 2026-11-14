import { describe, expect, it } from 'vitest';
import { fixturePage } from '../grader/fixtures.ts';
import { check } from './explain-controls.ts';

describe('success cases', () => {
  it('passes the valid explain page', () => {
    // ARRANGE
    const html = fixturePage('valid-explain');

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual([]);
  });
});

describe('failure cases', () => {
  it('fails an explain page that offers pick controls', () => {
    // ARRANGE
    const html = fixturePage('explain-controls--pick-controls');
    const expected = [
      'the page offers pick controls (2 input[type="radio"]); an explain page renders settled decisions without picks',
    ];

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails an explain page without reflection prompts', () => {
    // ARRANGE
    const html = fixturePage('explain-controls--no-reflection');
    const expected = ['the page has 0 [data-reflection]; expected exactly one'];

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails an explain page whose Questions block has no comment field', () => {
    // ARRANGE
    const html = fixturePage('explain-controls--no-questions');
    const expected = ["[data-questions] holds no editable <textarea> for the reader's questions"];

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual(expected);
  });
});

describe('edge cases', () => {
  it('counts Options, a Next action, selects and checkboxes as pick controls', () => {
    // ARRANGE
    const html = `<section data-item="a"><article data-option="x" data-recommended="true"></article>
        <input type="checkbox" /></section><div data-reflection><p>Who notices first?</p></div>
        <div data-questions><textarea></textarea></div><div data-next-action><select></select></div>`;
    const expected = [
      'the page offers pick controls (1 input[type="checkbox"], 1 select, 1 [data-option], 1 [data-next-action]); an explain page renders settled decisions without picks',
    ];

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('passes reviewer tools: a theme select outside the items and a show/hide toggle naming what it controls', () => {
    // ARRANGE
    const html = `<header><label for="theme">Theme</label><select id="theme"><option>System</option></select></header>
        <section data-item="a"><label><input type="checkbox" aria-controls="a-analogy" /> Show analogy</label>
        <p id="a-analogy" hidden>A queue is like a ticket line.</p></section>
        <div data-reflection><p>Who notices first?</p></div><div data-questions><textarea></textarea></div>`;

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual([]);
  });

  it('fails a reflection block that asks no question', () => {
    // ARRANGE
    const html = `<section data-item="a"></section><div data-reflection><p>Consider security.</p></div>
        <div data-questions><textarea></textarea></div>`;
    const expected = ['[data-reflection] asks no open question; expected prompts ending in "?"'];

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('applies to explain pages only, so a decide page keeps its own mode checks', () => {
    // ARRANGE
    const expected = ['explain'];

    // ACT
    const modes = check.modes;

    // ASSERT
    expect(modes).toEqual(expected);
  });
});

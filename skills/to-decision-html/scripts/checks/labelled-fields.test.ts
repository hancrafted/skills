import { describe, expect, it } from 'vitest';
import { fixturePage } from '../grader/fixtures.ts';
import { check } from './labelled-fields.ts';

describe('success cases', () => {
  it('passes the valid decide page', () => {
    // ARRANGE
    const html = fixturePage('valid-decide');

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual([]);
  });

  it('accepts aria-label, aria-labelledby, a wrapping label, title and button text as names', () => {
    // ARRANGE
    const html = `
        <textarea aria-label="Comment"></textarea>
        <span id="n">Next action</span><select aria-labelledby="n"></select>
        <label><input type="checkbox" /> Keep it</label>
        <input type="text" title="Search" />
        <button type="button">Reset item</button>
        <input type="submit" value="Save" />
        <input type="hidden" name="token" />`;

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual([]);
  });
});

describe('failure cases', () => {
  it('fails a comment field whose caption is not tied to it', () => {
    // ARRANGE
    const html = fixturePage('labelled-fields--unlabelled-comment');
    const expected = ['textarea#c-expiry has no accessible name; tie a <label for> to it or give it aria-label'];

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails an icon-only button', () => {
    // ARRANGE
    const html = '<button type="button"><svg viewBox="0 0 8 8"></svg></button>';
    const expected = ['button (1st) has no accessible name; give it visible text or aria-label'];

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual(expected);
  });
});

describe('edge cases', () => {
  it('fails empty labels and aria-labelledby pointing at nothing', () => {
    // ARRANGE
    const html = `
        <label for="a"> </label><textarea id="a"></textarea>
        <select name="pick" aria-labelledby="missing"></select>`;
    const expected = [
      'textarea#a has no accessible name; tie a <label for> to it or give it aria-label',
      'select[name="pick"] has no accessible name; tie a <label for> to it or give it aria-label',
    ];

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('skips fields hidden from everyone', () => {
    // ARRANGE
    const html = '<div hidden><textarea></textarea></div><textarea hidden></textarea>';

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual([]);
  });
});

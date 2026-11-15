import { describe, expect, it } from 'vitest';
import { fixturePage } from '../grader/fixtures.ts';
import { check } from './header.ts';

describe('success cases', () => {
  it('passes the valid decide page', () => {
    // ARRANGE
    const html = fixturePage('valid-decide');

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual([]);
  });

  it('passes a role="banner" landmark holding the title and its purpose', () => {
    // ARRANGE
    const html = '<div role="banner"><h1>Search</h1><p>Pick how search ranks results.</p></div><main></main>';

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual([]);
  });
});

describe('failure cases', () => {
  it('fails a page whose title sits outside any header', () => {
    // ARRANGE
    const html = fixturePage('header--no-header');
    const expected = [
      'the page has no banner <header>; put the <h1> and a sentence of purpose in a <header> at the top',
    ];

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails a header with a title but no purpose', () => {
    // ARRANGE
    const html = '<header><h1>Cache layer</h1></header><main></main>';
    const expected = ['the header states no purpose; add a sentence beside the <h1> saying what the page is for'];

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual(expected);
  });
});

describe('edge cases', () => {
  it('ignores a header inside an item, which is no banner', () => {
    // ARRANGE
    const html =
      '<main><section data-item="a"><header><h1>A</h1><p>What the page is for.</p></header></section></main>';
    const expected = [
      'the page has no banner <header>; put the <h1> and a sentence of purpose in a <header> at the top',
    ];

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails a banner without an <h1>', () => {
    // ARRANGE
    const html = '<header><h2>Cache layer</h2><p>Decide where cached responses live.</p></header>';
    const expected = ['the header holds no <h1>; title the page there'];

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual(expected);
  });
});

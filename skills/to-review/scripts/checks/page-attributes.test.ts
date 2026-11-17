import { describe, expect, it } from 'vitest';
import { fixturePage } from '../grader/fixtures.ts';
import { check } from './page-attributes.ts';

const page = (htmlAttributes: string, body: string): string =>
  `<!doctype html><html ${htmlAttributes}><body>${body}</body></html>`;
const ROOT = 'data-page-id="p" data-revision="1" data-mode="decide"';
const ITEM = '<section data-item="a" data-fidelity="mock" data-depth="both">';

describe('success cases', () => {
  it('passes the valid decide page', () => {
    // ARRANGE
    const html = fixturePage('valid-decide');

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual([]);
  });

  it('passes a page marked partial-offline', () => {
    // ARRANGE
    const html = page(`${ROOT} data-offline="partial"`, `${ITEM}</section>`);

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual([]);
  });
});

describe('failure cases', () => {
  it('fails a page without data-page-id', () => {
    // ARRANGE
    const html = fixturePage('page-attributes--no-page-id');
    const expected = ['<html> data-page-id is missing; expected a lowercase slug such as cache-layer'];

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails an item whose fidelity is off the ladder', () => {
    // ARRANGE
    const html = fixturePage('page-attributes--unknown-fidelity');
    const expected = ['item "expiry": data-fidelity is "sketchy"; expected one of diagram, wireframe, mock, prototype'];

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails an Option without data-recommended', () => {
    // ARRANGE
    const html = fixturePage('page-attributes--option-without-recommended');
    const expected = ['option "redis" in item "store": data-recommended is missing; expected one of true, false'];

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails a page without items, revision or a known mode', () => {
    // ARRANGE
    const html = page('data-page-id="p" data-mode="judge"', '');
    const expected = [
      '<html> data-revision is missing; expected a positive integer such as 1',
      '<html> data-mode is "judge"; expected one of decide, explain',
      'the page has no [data-item]',
    ];

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual(expected);
  });
});

describe('edge cases', () => {
  it('fails duplicate ids, an Option outside every item and an unnamed diagram', () => {
    // ARRANGE
    const option = '<div data-option="x" data-recommended="false"></div>';
    const body = `${ITEM}${option}${option}</section>${ITEM}</section>${option}<script type="text/x-mermaid"></script>`;
    const html = page(`${ROOT} data-offline="full"`, body);
    const expected = [
      '<html> data-offline is "full"; expected one of partial',
      'item id "a" is used 2 times',
      'option id "x" is used 2 times in item "a"',
      'option "x" sits outside every [data-item]',
      'a <script type="text/x-mermaid"> has no data-diagram',
    ];

    // ACT
    const problems = check.judge(html);

    // ASSERT
    expect(problems).toEqual(expected);
  });
});

import { describe, expect, it } from 'vitest';
import { check } from './overflow.ts';

const PAGE = { scrollWidth: 1440, clientWidth: 1440 };
const facts = (id: string) => ({ tag: 'p', id, item: 'store', text: '' });
const box = (id: string, overrides: object) => ({
  facts: facts(id),
  overflowX: 'visible',
  overflowY: 'visible',
  scrollWidth: 300,
  clientWidth: 300,
  scrollHeight: 40,
  clientHeight: 40,
  ...overrides,
});

describe('success cases', () => {
  it('passes a page as wide as its viewport with no overflowing box', () => {
    // ARRANGE
    const observation = { page: PAGE, boxes: [], brokenWords: [] };

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual([]);
  });

  it('passes a box made to scroll its own content', () => {
    // ARRANGE
    const boxes = [box('code', { overflowX: 'auto', scrollWidth: 900 })];

    // ACT
    const problems = check.judge({ page: PAGE, boxes, brokenWords: [] });

    // ASSERT
    expect(problems).toEqual([]);
  });
});

describe('failure cases', () => {
  it('fails a page that scrolls sideways', () => {
    // ARRANGE
    const observation = { page: { scrollWidth: 1700, clientWidth: 1440 }, boxes: [], brokenWords: [] };
    const expected = ['the page scrolls sideways: its content is 1700px wide in a 1440px viewport'];

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails text a box clips or lets spill, in either direction', () => {
    // ARRANGE
    const boxes = [
      box('a', { overflowX: 'hidden', scrollWidth: 420 }),
      box('b', { scrollWidth: 350 }),
      box('c', { overflowY: 'clip', scrollHeight: 90 }),
      box('d', { scrollHeight: 70 }),
    ];
    const expected = [
      'p#a in item "store" hides 120px of its content sideways; wrap at word boundaries by giving the column room or shortening the text',
      'p#b in item "store" spills 50px of its content past its box sideways; wrap at word boundaries by giving the column room or shortening the text',
      'p#c in item "store" hides 50px of its content below its box; let the box grow',
      'p#d in item "store" spills 30px of its content below its box; let the box grow',
    ];

    // ACT
    const problems = check.judge({ page: PAGE, boxes, brokenWords: [] });

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails a word that spans two line boxes and names the word and its element', () => {
    // ARRANGE
    const brokenWords = [{ facts: { tag: 'code', id: '', item: 'store', text: 'learnings.md' }, word: 'learnings.md' }];
    const expected = [
      'code "learnings.md" in item "store" breaks the word "learnings.md" across two lines; wrap at word boundaries by giving the column room or shortening the text',
    ];

    // ACT
    const problems = check.judge({ page: PAGE, boxes: [], brokenWords });

    // ASSERT
    expect(problems).toEqual(expected);
  });
});

describe('edge cases', () => {
  it('allows one pixel of rounding', () => {
    // ARRANGE
    const observation = {
      page: { scrollWidth: 1441, clientWidth: 1440 },
      boxes: [box('a', { overflowX: 'hidden', scrollWidth: 301, scrollHeight: 41 })],
      brokenWords: [],
    };

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual([]);
  });
});

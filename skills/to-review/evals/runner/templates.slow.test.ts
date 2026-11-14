import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { judgePrompt } from './judge.pure.ts';
import { pairwiseItems, pairwisePrompt } from './pairwise.pure.ts';
import { probePrompt, type ProbeQuestion } from './probe.pure.ts';

const template = (file: string): string => readFileSync(path.join(import.meta.dirname, '../judge', file), 'utf8');

describe('success cases', () => {
  it('asks the judge every checklist item about the files it can read', () => {
    // ARRANGE
    const files = ['1-load.png', '2-pick.png', 'page.txt'];
    const items = [
      { id: 'bar decision', question: 'Does every item state its decision in one sentence?' },
      { id: 'case three-approaches', question: 'Does it compare all three approaches?' },
    ];
    const expected = [
      '- `bar decision`: Does every item state its decision in one sentence?',
      '- `case three-approaches`: Does it compare all three approaches?',
      '- `2-pick.png`',
    ];
    const unfilled = '{{';

    // ACT
    const prompt = judgePrompt(template('judge.md'), items, files);

    // ASSERT
    for (const line of expected) expect(prompt).toContain(line);
    expect(prompt).not.toContain(unfilled);
  });
});

describe('failure cases', () => {
  it('asks the reader every question with its choices, and never shows the key or its source', () => {
    // ARRANGE
    const files = ['1-load.png', 'page.txt'];
    const source = { file: 'handoff.md', quote: 'from the frozen input' };
    const questions: ProbeQuestion[] = [
      {
        id: 'anchor',
        question: 'Where is a pool anchored?',
        choices: { a: 'At the card centre', b: 'At the nearest point of the rounded border' },
        answer: ['b'],
        source,
      },
      {
        id: 'next-actions',
        question: 'Which Next actions does the page offer?',
        choices: { a: 'Revise this page', b: 'Ship it', c: 'Stop here' },
        answer: ['a', 'c'],
        source,
      },
    ];
    const expected = [
      '- `anchor`: Where is a pool anchored?',
      '  - `a`: At the card centre',
      '  - `b`: At the nearest point of the rounded border',
      '- `next-actions`: Which Next actions does the page offer?',
      '- `1-load.png`',
      '- `page.txt`',
    ];
    const unfilled = '{{';

    // ACT
    const prompt = probePrompt(template('probe.md'), questions, files);

    // ASSERT
    for (const line of expected) expect(prompt).toContain(line);
    expect(prompt).not.toContain(source.quote);
    expect(prompt).not.toContain(unfilled);
  });
});

describe('edge cases', () => {
  it('names each page and its views in the prompt, with every item', () => {
    // ARRANGE
    const first = ['1-load.png', '3-detail.png', 'page.txt'];
    const second = ['1-load.png', '2-pick.png', 'page.txt'];
    const source = { file: 'calibration.md', quote: 'diagram' };
    const items = pairwiseItems([
      { id: 'principle-altitude', question: 'Does each Option name its principle?', source },
      { id: 'scannable', question: 'Can each item be judged at a glance?', source },
    ]);
    const expected = [
      '- `page-1-1-load.png`: Page 1, the page as it opens, at desktop width',
      '- `page-2-2-pick.png`: Page 2, the page after a pick in its first item with choices',
      "- `page-1.txt`: Page 1, the page's visible text, with its detail opened",
      '- `principle-altitude`: Does each Option name its principle?',
      '- `overall`: Which page lets the reader decide faster and with more confidence?',
    ];
    const unfilled = '{{';

    // ACT
    const prompt = pairwisePrompt(template('pairwise.md'), items, { first, second });

    // ASSERT
    for (const line of expected) expect(prompt).toContain(line);
    expect(prompt).not.toContain(unfilled);
  });
});

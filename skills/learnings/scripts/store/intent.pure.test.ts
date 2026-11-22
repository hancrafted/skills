import { describe, expect, it } from 'vitest';
import { intentProblems, splitIntent } from './intent.pure.ts';

const RECORD_PATH = 'records/2026-11-19-demo.md';
const TURNS = '**Turns:** 5';

describe('success cases', () => {
  it('splits the Intent section from the citations and notes how many failure modes precede it', () => {
    // ARRANGE
    const sections = [
      { text: 'Intent', lines: ['', `- ${TURNS}`, '- **Outcome:** confirmed'] },
      { text: 'a-mode', lines: ['- **Evidence:** e'] },
    ];
    const expected = {
      citations: [{ slug: 'a-mode', bullets: ['**Evidence:** e'] }],
      intents: [{ position: 0, bullets: [TURNS, '**Outcome:** confirmed'] }],
    };
    // ACT
    const split = splitIntent(sections);
    // ASSERT
    expect(split).toEqual(expected);
  });

  it('reports nothing for one Intent section first with labelled bullets, or for none', () => {
    // ARRANGE
    const first = [{ position: 0, bullets: [TURNS, '**Drift:** none'] }];
    // ACT
    const problems = [intentProblems(RECORD_PATH, first), intentProblems(RECORD_PATH, [])];
    // ASSERT
    expect(problems).toEqual([[], []]);
  });
});

describe('failure cases', () => {
  it('names a second Intent section, a misplaced one and an unlabelled bullet', () => {
    // ARRANGE
    const intents = [
      { position: 0, bullets: ['plain text'] },
      { position: 2, bullets: [TURNS] },
    ];
    const where = `${RECORD_PATH}: ## Intent`;
    const expected = [
      `${where} appears twice; keep one Intent section per record`,
      `${where} comes after a failure mode; place it first, right after the title`,
      `${where} has a bullet that opens with none of **Turns:**, **Moved:**, **Outcome:**, **Drift:**`,
    ];
    // ACT
    const problems = intentProblems(RECORD_PATH, intents);
    // ASSERT
    expect(problems).toEqual(expected);
  });
});

describe('edge cases', () => {
  it('keeps a lowercase intent slug as a citation, not an Intent section', () => {
    // ARRANGE
    const sections = [{ text: 'intent', lines: ['- **Evidence:** e'] }];
    const expected = { citations: [{ slug: 'intent', bullets: ['**Evidence:** e'] }], intents: [] };
    // ACT
    const split = splitIntent(sections);
    // ASSERT
    expect(split).toEqual(expected);
  });
});

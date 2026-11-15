// The checklist judge's own pure parts: the checklist a page is judged on (the confidence bar for the case's mode, then
// the case's own items) and how the judge's answers become grading.json expectations. Unknown counts as fail.
import type { Mode } from '../../scripts/grader/check.ts';
import bar from '../judge/confidence-bar.json' with { type: 'json' };
import type { Expectation } from './grading.pure.ts';
import { fillPrompt, quoted, type Ruling, type Source } from './quality.pure.ts';

/** One yes/no question of a case's checklist.json. */
export interface CaseItem {
  readonly id: string;
  readonly question: string;
  readonly source: Source | Ruling;
}

/** One question the judge answers; the id says whether it comes from the bar or the case. */
export interface ChecklistItem {
  readonly id: string;
  readonly question: string;
}

export function checklistFor(mode: Mode, caseItems: readonly CaseItem[]): ChecklistItem[] {
  return [
    ...bar.items.filter(({ modes }) => modes.includes(mode)).map(({ id, question }) => ({ id: `bar ${id}`, question })),
    ...caseItems.map(({ id, question }) => ({ id: `case ${id}`, question })),
  ];
}

/** A judge's answer to one checklist item, with a verbatim quote from the page as evidence. */
export interface JudgeAnswer {
  readonly id: string;
  readonly answer: string;
  readonly evidence: string;
}

export function judgeExpectations(
  items: readonly ChecklistItem[],
  answers: readonly JudgeAnswer[],
  pageText: string,
): Expectation[] {
  return items.map(({ id, question }) => {
    const text = `judge ${id}: ${question}`;
    const given = answers.find((answer) => answer.id === id);
    if (given === undefined) return { text, passed: false, evidence: 'the judge gave no answer' };
    if (given.answer === 'unknown') return { text, passed: false, evidence: 'unknown, which counts as fail' };
    const quote = quoted(given.evidence, pageText);
    return {
      text,
      passed: given.answer === 'yes',
      evidence: quote === '' ? given.answer : `${given.answer}: ${quote}`,
    };
  });
}

export function judgePrompt(template: string, items: readonly ChecklistItem[], files: readonly string[]): string {
  const checklist = items.map(({ id, question }) => `- \`${id}\`: ${question}`).join('\n');
  return fillPrompt(template, files, { checklist });
}

/** The JSON schema the judge's reply must match: one answer per item id. */
export function judgeSchema(items: readonly ChecklistItem[]): object {
  return {
    type: 'object',
    properties: {
      answers: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { enum: items.map(({ id }) => id) },
            answer: { enum: ['yes', 'no', 'unknown'] },
            evidence: { type: 'string' },
          },
          required: ['id', 'answer', 'evidence'],
          additionalProperties: false,
        },
      },
    },
    required: ['answers'],
    additionalProperties: false,
  };
}

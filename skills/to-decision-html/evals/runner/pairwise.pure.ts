// The reference grader's pure parts. A run's page is compared with its case's frozen reference page: a judge sees
// both as "Page 1" and "Page 2", picks the better page per item or says `same`, and is asked twice with the order
// swapped, so a leaning towards the first page cancels. An item passes when the run is not worse in either order.
import type { Expectation } from './grading.pure.ts';
import type { CaseItem, ChecklistItem } from './judge.pure.ts';
import { aboutFile, fillPrompt, quoted } from './quality.pure.ts';

/** The item every case gets on top of its own checklist. */
export const OVERALL: ChecklistItem = {
  id: 'overall',
  question: 'Which page lets the reader decide faster and with more confidence?',
};

/** The case's own checklist items, then the overall item; the confidence bar is left to the checklist judge. */
export function pairwiseItems(caseItems: readonly CaseItem[]): ChecklistItem[] {
  return [...caseItems.map(({ id, question }) => ({ id, question })), OVERALL];
}

/** The two calls: which page the judge saw first. */
export const ORDERS = ['run-first', 'reference-first'] as const;
export type Order = (typeof ORDERS)[number];

/** A view file as named in the judge's folder, which holds both pages' views: `1-load.png` → `page-2-1-load.png`. */
export const pageFileName = (page: 1 | 2, file: string): string =>
  file === 'page.txt' ? `page-${page}.txt` : `page-${page}-${file}`;

/** The prompt for one order; `first` and `second` are the view files (as the views folders name them) of Page 1 and 2. */
export function pairwisePrompt(
  template: string,
  items: readonly ChecklistItem[],
  { first, second }: { readonly first: readonly string[]; readonly second: readonly string[] },
): string {
  const listed = (page: 1 | 2, files: readonly string[]) =>
    files.map((file) => `- \`${pageFileName(page, file)}\`: Page ${page}, ${aboutFile(file)}`);
  const checklist = items.map(({ id, question }) => `- \`${id}\`: ${question}`).join('\n');
  return fillPrompt(template, [], {
    files: [...listed(1, first), ...listed(2, second)].join('\n'),
    checklist,
  });
}

/** The JSON schema the judge's reply must match: per item, the critique first, then the verdict, then the quote. */
export function pairwiseSchema(items: readonly ChecklistItem[]): object {
  return {
    type: 'object',
    properties: {
      answers: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { enum: items.map(({ id }) => id) },
            critique: { type: 'string' },
            answer: { enum: ['1', '2', 'same'] },
            evidence: { type: 'string' },
          },
          required: ['id', 'critique', 'answer', 'evidence'],
          additionalProperties: false,
        },
      },
    },
    required: ['answers'],
    additionalProperties: false,
  };
}

/** The judge's answer to one item in one order. */
export interface PairwiseAnswer {
  readonly id: string;
  readonly critique: string;
  readonly answer: string;
  readonly evidence: string;
}

/** What one order's call gave: the answers, or why there are none. */
export interface OrderResult {
  readonly answers: readonly PairwiseAnswer[];
  readonly error: string | null;
}

export type PairwiseOutcome = Readonly<Record<Order, OrderResult>>;

const LABEL: Record<Order, string> = { 'run-first': 'run first', 'reference-first': 'reference first' };

/** Which page the run is, per order: the answer naming it means the run is better. */
const RUN_PAGE: Record<Order, string> = { 'run-first': '1', 'reference-first': '2' };

/** The item asked, and both pages' text, where a quote may be found. */
interface Asking {
  readonly id: string;
  readonly pageTexts: string;
}

interface Verdict {
  readonly notWorse: boolean;
  readonly evidence: string;
}

function verdictOf(order: Order, { answers, error }: OrderResult, { id, pageTexts }: Asking): Verdict {
  const label = LABEL[order];
  if (error !== null) return { notWorse: false, evidence: `${label}: the judge failed: ${error}` };
  const given = answers.find((answer) => answer.id === id);
  if (given === undefined) return { notWorse: false, evidence: `${label}: the judge gave no answer` };
  const quote = quoted(given.evidence, pageTexts);
  const withQuote = (verdict: string) => `${label}: ${verdict}${quote === '' ? '' : `, ${quote}`}`;
  if (given.answer === 'same') return { notWorse: true, evidence: withQuote('same') };
  if (given.answer === RUN_PAGE[order]) return { notWorse: true, evidence: withQuote('run better') };
  if (given.answer === (RUN_PAGE[order] === '1' ? '2' : '1'))
    return { notWorse: false, evidence: withQuote('reference better') };
  return { notWorse: false, evidence: `${label}: unknown, which counts as fail` };
}

/** One `vs-reference` expectation per item; `pageTexts` is both pages' text, where a quote may be found. */
export function pairwiseExpectations(
  items: readonly ChecklistItem[],
  outcome: PairwiseOutcome,
  pageTexts: string,
): Expectation[] {
  return items.map(({ id, question }) => {
    const verdicts = ORDERS.map((order) => verdictOf(order, outcome[order], { id, pageTexts }));
    return {
      text: `vs-reference ${id}: ${question}`,
      passed: verdicts.every(({ notWorse }) => notWorse),
      evidence: verdicts.map(({ evidence }) => evidence).join('; '),
    };
  });
}

/** Every item failed for one reason, such as a run that wrote no page. */
export function failAllVsReference(items: readonly ChecklistItem[], reason: string): Expectation[] {
  return items.map(({ id, question }) => ({
    text: `vs-reference ${id}: ${question}`,
    passed: false,
    evidence: reason,
  }));
}

/** `render` memoized by case id, so every run of a case shares one rendering; a failure is shared as well. */
export function oncePerCase<T>(render: (id: string) => Promise<T>): (id: string) => Promise<T> {
  const rendered = new Map<string, Promise<T>>();
  return (id) => {
    const known = rendered.get(id);
    if (known !== undefined) return known;
    const fresh = render(id);
    rendered.set(id, fresh);
    return fresh;
  };
}

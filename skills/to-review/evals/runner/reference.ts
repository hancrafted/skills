// The reference grader: a run's page against its case's frozen reference page. The reference's views are rendered
// once per grading pass and shared by every run of the case; the judge then sees both pages' views twice, in
// swapped order, so a leaning towards the first page cancels (pairwise.pure.ts).
import type { Browser } from '@playwright/test';
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { CASES, referenceOf } from './cases.ts';
import type { Expectation } from './grading.pure.ts';
import type { CaseItem } from './judge.pure.ts';
import type { CliChoice, Reply } from './model-cli.pure.ts';
import { ask } from './model-cli.ts';
import {
  failAllVsReference,
  oncePerCase,
  ORDERS,
  pageFileName,
  pairwiseExpectations,
  pairwiseItems,
  pairwisePrompt,
  pairwiseSchema,
  type Order,
  type OrderResult,
  type PairwiseAnswer,
} from './pairwise.pure.ts';
import { captureViews, type Views } from './views.ts';

/** A page's views as written into a folder. */
export interface ViewsIn {
  readonly dir: string;
  readonly views: Views;
}

/** The reference views of each case, rendered on first use; `close` removes the folders. */
export interface References {
  /** The case's reference views; null when the case has no reference. */
  readonly of: (caseId: string) => Promise<ViewsIn | null>;
  readonly close: () => void;
}

export function referencesFor(browser: Browser): References {
  const folders: string[] = [];
  const of = oncePerCase(async (caseId: string): Promise<ViewsIn | null> => {
    const reference = referenceOf(caseId);
    if (reference === null) return null;
    const dir = mkdtempSync(path.join(tmpdir(), 'decision-reference-'));
    folders.push(dir);
    return { dir, views: await captureViews(browser, path.join(CASES, reference), dir) };
  });
  return { of, close: () => folders.forEach((dir) => rmSync(dir, { recursive: true, force: true })) };
}

/** What one grading of a run against its reference recorded. */
export interface ReferenceGrading {
  readonly expectations: readonly Expectation[];
  /** For quality.json: per order, the model's raw reply or why there is none; null when nothing was asked. */
  readonly raw: Readonly<Record<Order, Asked>> | null;
  /** The model that answered, for grading.json; absent when nothing was asked. */
  readonly referenceModel?: string | null;
  readonly notes: readonly string[];
}

/** A model's reply, or why there is none. */
interface Asked {
  readonly reply: Reply | null;
  readonly error: string | null;
}

/** The grading of a case without a reference: nothing was asked, nothing is recorded. */
export const NO_REFERENCE: ReferenceGrading = { expectations: [], raw: null, notes: [] };

/** What a pairing of the run and the reference needs: who judges, what to ask and both pages' views. */
interface Pairing {
  readonly choice: CliChoice;
  readonly items: ReturnType<typeof pairwiseItems>;
  readonly template: string;
  readonly run: ViewsIn;
  readonly reference: ViewsIn;
}

/** The two pages' views in one folder, named `page-1-…` and `page-2-…`, the run first or second. */
function foldersOf(order: Order, { run, reference }: Pairing): { dir: string; first: Views; second: Views } {
  const [first, second] = order === 'run-first' ? [run, reference] : [reference, run];
  const dir = mkdtempSync(path.join(tmpdir(), 'decision-pairwise-'));
  for (const [page, shown] of [
    [1, first],
    [2, second],
  ] as const)
    for (const file of shown.views.files)
      copyFileSync(path.join(shown.dir, file), path.join(dir, pageFileName(page, file)));
  return { dir, first: first.views, second: second.views };
}

async function askOrder(order: Order, pairing: Pairing): Promise<Asked> {
  const { choice, items, template } = pairing;
  const { dir, first, second } = foldersOf(order, pairing);
  try {
    const files = [
      ...first.files.map((file) => pageFileName(1, file)),
      ...second.files.map((file) => pageFileName(2, file)),
    ];
    const prompt = pairwisePrompt(template, items, { first: first.files, second: second.files });
    return { reply: await ask(choice, { dir, files, prompt, schema: pairwiseSchema(items) }), error: null };
  } catch (error) {
    return { reply: null, error: (error as Error).message.split('\n')[0] };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const answersIn = (reply: Reply | null): PairwiseAnswer[] => {
  const answers = (reply?.value as { answers?: unknown } | null)?.answers;
  return Array.isArray(answers) ? (answers as PairwiseAnswer[]) : [];
};

const resultOf = ({ reply, error }: Asked): OrderResult => ({ answers: answersIn(reply), error });

/** Asks the judge about the run and the reference twice, in swapped order, and scores the answers. */
async function compare(pairing: Pairing): Promise<ReferenceGrading> {
  const [runFirst, referenceFirst] = await Promise.all(ORDERS.map((order) => askOrder(order, pairing)));
  const raw = { 'run-first': runFirst, 'reference-first': referenceFirst };
  const outcome = { 'run-first': resultOf(runFirst), 'reference-first': resultOf(referenceFirst) };
  const texts = `${pairing.run.views.pageText}\n${pairing.reference.views.pageText}`;
  const models = [...new Set([runFirst, referenceFirst].flatMap(({ reply }) => (reply === null ? [] : [reply.model])))];
  return {
    expectations: pairwiseExpectations(pairing.items, outcome, texts),
    raw,
    referenceModel: models.join(', ') || null,
    notes: ORDERS.flatMap((order) =>
      raw[order].error === null ? [] : [`reference grader (${order}): ${raw[order].error}`],
    ),
  };
}

/** What to grade against a case's reference: who judges, the case, its checklist items and the run's views. */
export interface ReferenceTask {
  readonly choice: CliChoice;
  readonly caseId: string;
  readonly caseItems: readonly CaseItem[];
  readonly run: ViewsIn;
  readonly references: References;
}

/**
 * The run's views against the reference's, one `vs-reference` expectation per item. A case without a reference gets
 * NO_REFERENCE; a reference that will not render fails every item.
 */
export async function gradeAgainstReference({
  choice,
  caseId,
  caseItems,
  run,
  references,
}: ReferenceTask): Promise<ReferenceGrading> {
  const items = pairwiseItems(caseItems);
  try {
    const reference = await references.of(caseId);
    if (reference === null) return NO_REFERENCE;
    const template = readFileSync(path.resolve(import.meta.dirname, '../judge/pairwise.md'), 'utf8');
    return await compare({ choice, items, template, run, reference });
  } catch (error) {
    const reason = `the reference grader failed: ${(error as Error).message.split('\n')[0]}`;
    return { expectations: failAllVsReference(items, reason), raw: null, notes: [reason] };
  }
}

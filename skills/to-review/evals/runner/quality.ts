// The quality graders: the checklist judge, the reader probe and, for a case with a reference page, the pairwise
// reference judge. The first two see only the page's views (three screenshots
// and its text) in a folder of their own; the probe's answer key never enters it. Their answers, the models that gave
// them and the cost go to quality.json in the run folder; their expectations join grading.json.
import type { Browser } from '@playwright/test';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Mode } from '../../scripts/grader/check.ts';
import { qualityKeys, referenceOf, type QualityKeys } from './cases.ts';
import type { Expectation, JudgeRecord } from './grading.pure.ts';
import {
  checklistFor,
  judgeExpectations,
  judgePrompt,
  judgeSchema,
  type ChecklistItem,
  type JudgeAnswer,
} from './judge.pure.ts';
import type { CliChoice, Reply } from './model-cli.pure.ts';
import { ask, judgeCli, type Question } from './model-cli.ts';
import { failAllVsReference, pairwiseItems } from './pairwise.pure.ts';
import { probeExpectations, probePrompt, probeSchema, type ReaderAnswer } from './probe.pure.ts';
import { failAll } from './quality.pure.ts';
import { gradeAgainstReference, type ReferenceGrading, type References } from './reference.ts';
import { captureViews, type Views } from './views.ts';

const PROMPTS = path.resolve(import.meta.dirname, '../judge');
const template = (name: string) => readFileSync(path.join(PROMPTS, name), 'utf8');

export interface Quality {
  readonly expectations: readonly Expectation[];
  readonly judge: JudgeRecord | null;
  /** For the reviewer: missing views, a model call that failed, the judge being off. */
  readonly notes: readonly string[];
}

/** What to grade: the run's largest page (undefined when it wrote none), its folder and its case. */
export interface QualityTarget {
  readonly browser: Browser;
  /** The reference views of each case, shared by every run graded in this pass. */
  readonly references: References;
  readonly page: string | undefined;
  readonly runDir: string;
  readonly record: { readonly case: string; readonly mode: Mode };
}

/** A model's reply, or why there is none; both null when the question was never asked. */
interface Asked {
  readonly reply: Reply | null;
  readonly error: string | null;
}

const NOT_ASKED: Asked = { reply: null, error: null };

async function asking(choice: CliChoice, question: Question): Promise<Asked> {
  try {
    return { reply: await ask(choice, question), error: null };
  } catch (error) {
    return { reply: null, error: (error as Error).message.split('\n')[0] };
  }
}

const answersIn = <T>({ reply }: Asked): T[] => {
  const answers = (reply?.value as { answers?: unknown } | null)?.answers;
  return Array.isArray(answers) ? (answers as T[]) : [];
};

interface Questions {
  readonly items: readonly ChecklistItem[];
  readonly keys: QualityKeys;
}

/** One grading of a page's views: who answers, the folder of views, what to ask and where the raw answers go. */
interface Session {
  readonly choice: CliChoice;
  readonly dir: string;
  readonly views: Views;
  readonly questions: Questions;
  readonly runDir: string;
  /** The run's reference grading, started alongside the judge and the reader. */
  readonly against: Promise<ReferenceGrading>;
}

/** Asks the judge and the reader at once, each from the same folder of views. */
function askBoth({ choice, dir, views: { files }, questions: { items, keys } }: Session) {
  const judge = { dir, files, prompt: judgePrompt(template('judge.md'), items, files), schema: judgeSchema(items) };
  const reader = {
    dir,
    files,
    prompt: probePrompt(template('probe.md'), keys.probe, files),
    schema: probeSchema(keys.probe),
  };
  return Promise.all([
    asking(choice, judge),
    keys.probe.length === 0 ? Promise.resolve(NOT_ASKED) : asking(choice, reader),
  ]);
}

function expectationsOf([judged, read]: readonly [Asked, Asked], { questions, views }: Session): Expectation[] {
  const { items, keys } = questions;
  const { pageText } = views;
  return [
    ...(judged.error === null
      ? judgeExpectations(items, answersIn<JudgeAnswer>(judged), pageText)
      : failAll('judge', items, `the judge failed: ${judged.error}`)),
    ...(read.error === null
      ? probeExpectations(keys.probe, answersIn<ReaderAnswer>(read), pageText)
      : failAll('probe', keys.probe, `the reader failed: ${read.error}`)),
  ];
}

async function judgeViews(session: Session) {
  const { choice, runDir, against } = session;
  const [[judged, read], referenced] = await Promise.all([askBoth(session), against]);
  const raw = { cli: choice.cli, judge: judged, probe: read, reference: referenced.raw };
  writeFileSync(path.join(runDir, 'quality.json'), `${JSON.stringify(raw, null, 2)}\n`);
  const judge: JudgeRecord = {
    cli: choice.cli,
    judgeModel: judged.reply?.model ?? null,
    readerModel: read.reply?.model ?? null,
    referenceModel: referenced.referenceModel,
    crossFamily: choice.crossFamily,
    risk: choice.risk,
  };
  const failed = [judged.error, read.error].flatMap((error) => (error === null ? [] : [`quality grader: ${error}`]));
  return {
    expectations: [...expectationsOf([judged, read], session), ...referenced.expectations],
    judge,
    notes: [...failed, ...referenced.notes],
  };
}

/** Every grader failed for one reason, such as a run that wrote no page; the reference judge only for a case with one. */
function failedForGood(questions: Questions, caseId: string, reason: string): Expectation[] {
  const { items, keys } = questions;
  return [
    ...failAll('judge', items, reason),
    ...failAll('probe', keys.probe, reason),
    ...(referenceOf(caseId) === null ? [] : failAllVsReference(pairwiseItems(keys.checklist), reason)),
  ];
}

/** Captures the views into outputs/ for the viewer, then asks the judge, the reader and the reference judge. */
export async function gradeQuality({ browser, references, page, runDir, record }: QualityTarget): Promise<Quality> {
  const keys = qualityKeys(record.case) ?? { checklist: [], probe: [] };
  const questions = { items: checklistFor(record.mode, keys.checklist), keys };
  const choice = judgeCli();
  if (page === undefined) {
    const failed = failedForGood(questions, record.case, 'the run wrote no .html page');
    return { expectations: choice === null ? [] : failed, judge: null, notes: [] };
  }
  const dir = mkdtempSync(path.join(tmpdir(), 'decision-views-'));
  try {
    const views = await captureViews(browser, page, dir);
    for (const file of views.files.filter((name) => name.endsWith('.png')))
      copyFileSync(path.join(dir, file), path.join(runDir, 'outputs', file));
    if (choice === null) return { expectations: [], judge: null, notes: [...views.notes, 'judge and probe off'] };
    const task = { choice, caseId: record.case, caseItems: keys.checklist, run: { dir, views }, references };
    const judged = await judgeViews({ choice, dir, views, questions, runDir, against: gradeAgainstReference(task) });
    return { ...judged, notes: [...views.notes, ...judged.notes] };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

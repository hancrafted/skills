// Grades one run folder into grading.json. It reads only that folder (run.json for the case, mode and workspace
// roots, tools.json, transcript.jsonl and the pages in pages/) plus the case's frozen checklist and probe. Each grader
// adds expectations in `expectationsOf`: mechanical, isolation, then the checklist judge and the reader probe.
import type { Browser } from '@playwright/test';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Asked, Check, Mode } from '../../scripts/grader/check.ts';
import { gradeFile } from '../../scripts/grader/run.ts';
import {
  gradingOf,
  isolationExpectation,
  mechanicalExpectations,
  ungradedReport,
  type Grading,
} from './grading.pure.ts';
import { isolationProblems } from './isolation.pure.ts';
import { gradeQuality } from './quality.ts';
import type { References } from './reference.ts';
import { runFacts, type ToolCall } from './transcript.pure.ts';

/** What the runner records about a run before grading; run.json. */
export interface RunRecord {
  readonly case: string;
  /** skill-creator's numeric eval id for the case. */
  readonly evalId: number;
  readonly mode: Mode;
  /** The model the agent reported; null when it never started. */
  readonly model: string | null;
  readonly arm: string;
  readonly run: number;
  /** The sandbox's spellings; tool paths must stay under one of them. */
  readonly roots: readonly string[];
  /** The skill version the arm ran, or null for the no-skill arm. */
  readonly skillDigest: string | null;
  /** What the run's calibration asked that a check compares the page with; absent in runs from before it. */
  readonly asked?: Asked;
}

const readJson = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T;

/** The run's pages, largest first: when the agent wrote several, the largest is graded and the rest noted. */
function pagesOf(pages: string): string[] {
  const found = readdirSync(pages).filter((file) => file.endsWith('.html'));
  return found.sort((a, b) => statSync(path.join(pages, b)).size - statSync(path.join(pages, a)).size);
}

interface Graders {
  readonly browser: Browser;
  readonly checks: readonly Check[];
  /** The reference views of each case, rendered once and shared by the runs of one grading pass. */
  readonly references: References;
}

/** What grading reads from a run folder, each file read once. */
interface RunFiles {
  readonly runDir: string;
  readonly record: RunRecord;
  readonly tools: readonly ToolCall[];
  /** The pages' paths, largest first. */
  readonly pages: readonly string[];
  readonly error: string | null;
}

function readRun(runDir: string): RunFiles {
  const pagesDir = path.join(runDir, 'pages');
  const { error } = runFacts(readFileSync(path.join(runDir, 'transcript.jsonl'), 'utf8').split('\n'));
  return {
    runDir,
    record: readJson<RunRecord>(path.join(runDir, 'run.json')),
    tools: readJson<ToolCall[]>(path.join(runDir, 'tools.json')),
    pages: pagesOf(pagesDir).map((page) => path.join(pagesDir, page)),
    error,
  };
}

async function mechanical({ browser, checks }: Graders, { pages: [page], record }: RunFiles) {
  const report =
    page === undefined
      ? ungradedReport(checks, 'the run wrote no .html page')
      : await gradeFile(browser, checks, { file: page, asked: record.asked });
  return mechanicalExpectations(report, record, checks);
}

async function expectationsOf(graders: Graders, run: RunFiles) {
  const mechanicalAndIsolation = [
    ...(await mechanical(graders, run)),
    isolationExpectation(isolationProblems(run.tools, run.record.roots)),
  ];
  // The quality graders write the views into outputs/: the viewer embeds text files inside a <script>, where a
  // page's own </script> would end it early, so it shows the page only as screenshots.
  const quality = await gradeQuality({
    browser: graders.browser,
    references: graders.references,
    page: run.pages[0],
    runDir: run.runDir,
    record: run.record,
  });
  return { expectations: [...mechanicalAndIsolation, ...quality.expectations], quality };
}

function notesOf({ pages, error }: RunFiles): string[] {
  const [graded, ...others] = pages.map((page) => path.basename(page));
  return [
    ...(error === null ? [] : [error]),
    ...(others.length === 0 ? [] : [`graded ${graded}; also wrote ${others.join(', ')}`]),
  ];
}

export async function gradeRun(graders: Graders, runDir: string): Promise<Grading> {
  const run = readRun(runDir);
  const { expectations, quality } = await expectationsOf(graders, run);
  const grading = gradingOf({
    expectations,
    tools: run.tools,
    outputChars: run.pages.reduce((total, page) => total + statSync(page).size, 0),
    error: run.error,
    notes: [...notesOf(run), ...quality.notes],
    judge: quality.judge,
  });
  writeFileSync(path.join(runDir, 'grading.json'), `${JSON.stringify(grading, null, 2)}\n`);
  return grading;
}

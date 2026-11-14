// Builds a run's grading.json in skill-creator's shape (references/schemas.md in the skill-creator skill): one
// expectation per grader result, then the summary and execution metrics skill-creator's aggregation reads. Each
// grader contributes expectations; the run's grading.json concatenates them, mechanical first.
import { applies, type Asked, type Check, type Mode } from '../../scripts/grader/check.ts';
import type { Report } from '../../scripts/grader/report.pure.ts';
import type { ToolCall } from './transcript.pure.ts';

export interface Expectation {
  readonly text: string;
  readonly passed: boolean;
  readonly evidence: string;
}

export interface Grading {
  readonly expectations: readonly Expectation[];
  readonly summary: { passed: number; failed: number; total: number; pass_rate: number };
  readonly execution_metrics: {
    tool_calls: Record<string, number>;
    total_tool_calls: number;
    errors_encountered: number;
    output_chars: number;
  };
  readonly user_notes_summary: { uncertainties: string[]; needs_review: string[]; workarounds: string[] };
  /** Which models judged and read the page; null when no judge ran. */
  readonly judge: JudgeRecord | null;
}

/** The checklist judge's and the reader probe's models, recorded in every run's grading.json. */
export interface JudgeRecord {
  readonly cli: 'claude' | 'gemini';
  readonly judgeModel: string | null;
  readonly readerModel: string | null;
  /** The reference grader's model; absent for a case without a reference. */
  readonly referenceModel?: string | null;
  /** True when the judge's family differs from the executor's. */
  readonly crossFamily: boolean;
  /** The self-preference risk when judge and executor share a family; null otherwise. */
  readonly risk: string | null;
}

/** A report for a run with no gradable page: every check fails with the reason. */
export function ungradedReport(checks: readonly { id: string; summary: string }[], reason: string): Report {
  return {
    page: '',
    mode: null,
    pass: false,
    checks: checks.map(({ id, summary }) => ({ id, summary, status: 'fail', problems: [reason] })),
  };
}

/** A check as the registry gives it; `modes` omitted means it applies to every page, `needs` omitted to every case. */
type Scope = Pick<Check, 'id' | 'modes' | 'needs'>;

/** What a case expects of its pages: their mode, and what its calibration asked that a check compares with. */
interface CaseExpects {
  readonly mode: Mode;
  readonly asked?: Asked;
}

/**
 * One expectation per check that applies to the case's mode and what it asked; the others are left out, so both
 * arms of a case are graded on the same checks. A check skipped although it applies means the page declared another
 * mode, and fails.
 */
export function mechanicalExpectations(
  report: Report,
  { mode: caseMode, asked = {} }: CaseExpects,
  checks: readonly Scope[],
): Expectation[] {
  const applying = new Set(checks.filter((check) => applies(check, caseMode, asked)).map((check) => check.id));
  return report.checks
    .filter(({ id }) => applying.has(id))
    .map(({ id, summary, status, problems }) => {
      const text = `mechanical ${id}: ${summary}`;
      if (status === 'pass') return { text, passed: true, evidence: 'passes at every graded width' };
      if (status === 'fail') return { text, passed: false, evidence: problems.join('; ') };
      const declared = report.mode ?? 'none';
      return {
        text,
        passed: false,
        evidence: `skipped: the page declares mode ${declared}, the case expects ${caseMode}`,
      };
    });
}

export function isolationExpectation(problems: readonly string[]): Expectation {
  const text = 'isolation: reads stay in the workspace and tool paths, writes in the workspace and temp';
  return problems.length === 0
    ? {
        text,
        passed: true,
        evidence: 'every read stays in the workspace or a tool path, every write in the workspace or temp',
      }
    : { text, passed: false, evidence: problems.join('; ') };
}

interface RunOutcome {
  readonly expectations: readonly Expectation[];
  readonly tools: readonly ToolCall[];
  /** Characters in the run's saved outputs. */
  readonly outputChars: number;
  /** Why the agent's run did not finish cleanly; null when it did. */
  readonly error: string | null;
  /** Things a reviewer should know about the run, such as which page was graded. */
  readonly notes: readonly string[];
  readonly judge?: JudgeRecord | null;
}

function countByName(tools: readonly ToolCall[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const { name } of tools) counts[name] = (counts[name] ?? 0) + 1;
  return counts;
}

/** Timing goes to timing.json, where the aggregation also finds the token count. */
const riskOf = (judge: JudgeRecord | null): string[] =>
  judge?.risk == null
    ? []
    : [`judge ${judge.judgeModel ?? 'unknown'}, reader ${judge.readerModel ?? 'unknown'}: ${judge.risk}`];

export function gradingOf({ expectations, tools, outputChars, error, notes, judge = null }: RunOutcome): Grading {
  const passed = expectations.filter((expectation) => expectation.passed).length;
  const total = expectations.length;
  return {
    expectations,
    summary: {
      passed,
      failed: total - passed,
      total,
      pass_rate: total === 0 ? 0 : Math.round((passed / total) * 10000) / 10000,
    },
    execution_metrics: {
      tool_calls: countByName(tools),
      total_tool_calls: tools.length,
      errors_encountered: error === null ? 0 : 1,
      output_chars: outputChars,
    },
    user_notes_summary: { uncertainties: riskOf(judge), needs_review: [...notes], workarounds: [] },
    judge,
  };
}

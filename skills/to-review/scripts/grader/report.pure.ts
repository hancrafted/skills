// The grader's JSON: one result per check, problems merged across viewport widths, and the rule that decides
// whether a fixture proves what its name claims.
import type { Mode } from './check.ts';
import { checkOfFixture } from './fixtures.pure.ts';

export type Status = 'pass' | 'fail' | 'skip';

/** One check at one width; `problems` is null when the check does not apply to the page's mode. */
export interface WidthResult {
  readonly width: number;
  readonly problems: readonly string[] | null;
}

export interface CheckResult {
  readonly id: string;
  readonly summary: string;
  readonly status: Status;
  readonly problems: readonly string[];
}

export interface Report {
  readonly page: string;
  /** The mode the page declared; null when it declared none it may. */
  readonly mode: Mode | null;
  readonly pass: boolean;
  readonly checks: readonly CheckResult[];
}

export interface Proof {
  readonly fixture: string;
  /** The check a broken fixture names; null for a valid fixture. */
  readonly check: string | null;
  readonly proves: boolean;
  readonly reason: string;
}

/** Merges a check's widths: a problem every width saw is listed once, any other is prefixed with its widths. */
export function combine({ id, summary }: { id: string; summary: string }, widths: readonly WidthResult[]): CheckResult {
  const ran = widths.filter((width) => width.problems !== null);
  if (ran.length === 0) return { id, summary, status: 'skip', problems: [] };
  const seen = new Map<string, Set<number>>();
  for (const { width, problems } of ran)
    for (const problem of problems ?? []) seen.set(problem, (seen.get(problem) ?? new Set()).add(width));
  const problems = [...seen].map(([problem, at]) =>
    at.size === ran.length ? problem : `at ${[...at].map((width) => `${width}px`).join(', ')}: ${problem}`,
  );
  return { id, summary, status: problems.length === 0 ? 'pass' : 'fail', problems };
}

export function toReport(page: string, mode: Mode | null, checks: readonly CheckResult[]): Report {
  return { page, mode, pass: checks.every((check) => check.status !== 'fail'), checks };
}

/** A valid fixture fails no check; a broken one fails the check it names and no other. */
export function proofOf(fixture: string, report: Report): Proof {
  const check = checkOfFixture(fixture);
  const failing = report.checks.filter((result) => result.status === 'fail').map((result) => result.id);
  const verdict = (proves: boolean, reason: string): Proof => ({ fixture, check, proves, reason });
  if (check === null) {
    return failing.length === 0
      ? verdict(true, 'no check fails')
      : verdict(false, `fails ${failing.join(', ')}; a valid fixture passes every check`);
  }
  if (!report.checks.some((result) => result.id === check))
    return verdict(false, `names check "${check}", which is not registered`);
  if (!failing.includes(check)) return verdict(false, `${check} passes it; the check cannot see the defect`);
  const others = failing.filter((id) => id !== check);
  if (others.length > 0)
    return verdict(false, `also fails ${others.join(', ')}; a broken fixture holds exactly one defect`);
  return verdict(true, `fails ${check} only`);
}

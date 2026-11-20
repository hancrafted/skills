import { type CitationRow, type FailureMode, SMELL_COUNT } from './learnings.pure.ts';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function sourceOfLock(lockText: string, skill: string): string | null {
  try {
    const lock: unknown = JSON.parse(lockText);
    const skills = isObject(lock) ? lock.skills : null;
    const entry = isObject(skills) ? skills[skill] : null;
    const source = isObject(entry) ? entry.source : null;
    return typeof source === 'string' && source !== '' ? source : null;
  } catch {
    return null;
  }
}

export function openTicketUrls(ghJson: string): string[] {
  try {
    const issues: unknown = JSON.parse(ghJson);
    if (!Array.isArray(issues)) return [];
    return issues.flatMap((issue: unknown) => (isObject(issue) && typeof issue.url === 'string' ? [issue.url] : []));
  } catch {
    return [];
  }
}

export function pickFailure(rows: readonly CitationRow[], named: string | null): { slug: string } | { error: string } {
  if (named !== null)
    return rows.some((row) => row.slug === named) ? { slug: named } : { error: `no failure mode "${named}"` };
  const smell = rows.find((row) => row.count >= SMELL_COUNT && row.status === 'proposed');
  return smell === undefined
    ? {
        error: `no smell to file (a proposed failure mode cited ${SMELL_COUNT} or more times): name one with --failure <slug>`,
      }
    : { slug: smell.slug };
}

export interface IssueFacts {
  skill: string;
  mode: FailureMode;
  count: number;
  evidence: readonly string[];
}

export function renderIssue({ skill, mode, count, evidence }: IssueFacts): { title: string; body: string } {
  const body = [
    `Skill: ${skill}. Cited by ${count} records.`,
    '',
    `Enforcer proposed: ${mode.enforcer}`,
    '',
    ...evidence.map((line) => `- ${line}`),
    '',
  ].join('\n');
  return { title: mode.title, body };
}

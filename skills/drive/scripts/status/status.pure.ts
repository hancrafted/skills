import { isIntegrationBranch, ticketOfMergeSubject, topicSlugOf } from '../core/index.ts';
import { closesIn } from '../pr/index.ts';

export type Phase = 'Define' | 'Reason' | 'Implement' | 'Verify' | 'Evolve' | 'Done' | 'Stopped';

export type FortifyState = 'pending' | 'engaged' | 'skipped';

export interface PrFact {
  number: number;
  state: 'OPEN' | 'MERGED' | 'CLOSED';
  isDraft: boolean;
}

export type InputState = 'filled' | 'missing' | 'empty';

export interface ProjectInputs {
  grillFormat: Exclude<InputState, 'empty'>;
  grillFormatPath: string | null;
  review: InputState;
  profiles: InputState;
}

export interface Facts {
  topic: string;
  epic: number | null;
  ghFailed: boolean;
  fortify: FortifyState | null;
  integrationBranch: string | null;
  pushed: boolean;
  decisionPr: PrFact | null;
  integrationPr: PrFact | null;
  tickets: readonly number[];
  mergedTickets: readonly number[];
  lastLog: { t: string; cmd: string } | null;
  inputs: ProjectInputs;
}

export interface Standing {
  phase: Phase;
  next: string;
}

const allMerged = (facts: Facts): boolean =>
  facts.tickets.length > 0 && facts.tickets.every((ticket) => facts.mergedTickets.includes(ticket));

function verifyNext(pr: PrFact | null, epic: number | null): string {
  if (pr === null) return `run \`drive push --spec ${epic ?? '<epic>'}\`: it opens the draft Integration PR`;
  if (pr.isDraft)
    return `review and triage, commit the record (references/fortify.md), then \`drive pr ready ${pr.number}\` once CI is green`;
  return `the Operator contests the triage and merges #${pr.number}`;
}

type Rule = (facts: Facts) => Standing | null;

const stopped = (kind: string, pr: PrFact | null): Standing | null =>
  pr?.state === 'CLOSED'
    ? { phase: 'Stopped', next: `${kind} PR #${pr.number} closed unmerged: tell the Operator` }
    : null;

const unmergedTickets = (facts: Facts): number[] =>
  facts.tickets.filter((ticket) => !facts.mergedTickets.includes(ticket));

const FORTIFY_QUESTION =
  'close the leftover tickets, then ask the Operator: Fortify now or skip? Record `fortify: engaged` or `skipped`';

const evolve: Rule = ({ integrationPr, fortify }) => {
  if (integrationPr?.state !== 'MERGED') return null;
  if (fortify === 'engaged')
    return { phase: 'Done', next: 'Fortify was engaged: merge its PR if still open, then clean up (`/cleanup`)' };
  if (fortify === 'skipped') return { phase: 'Done', next: 'Fortify was skipped: clean up (`/cleanup`)' };
  return { phase: 'Evolve', next: FORTIFY_QUESTION };
};

const ghDown: Rule = ({ ghFailed }) =>
  ghFailed ? { phase: 'Stopped', next: 'gh failed (auth or offline): fix it and rerun `drive status`' } : null;

const define: Rule = ({ integrationBranch, pushed }) =>
  integrationBranch === null || !pushed
    ? { phase: 'Define', next: 'create and push the Integration branch, then grill' }
    : null;

const reason: Rule = ({ decisionPr }) =>
  decisionPr?.state === 'OPEN'
    ? {
        phase: 'Reason',
        next: `the Operator passes the Decision gate: merge #${decisionPr.number} (\`drive pr watch ${decisionPr.number}\`)`,
      }
    : null;

const grilling: Rule = (facts) =>
  facts.decisionPr?.state === 'MERGED' || facts.tickets.length > 0
    ? null
    : { phase: 'Define', next: 'settle the requirements, then write the Decision docs and tickets' };

const verify: Rule = (facts) =>
  allMerged(facts) ? { phase: 'Verify', next: verifyNext(facts.integrationPr, facts.epic) } : null;

const implement: Rule = (facts) => {
  const open = unmergedTickets(facts);
  if (facts.tickets.length === 0)
    return {
      phase: 'Implement',
      next: "no tickets found in the Decision PR's `## Tickets` section; list them as `- #<n>`",
    };
  return {
    phase: 'Implement',
    next: `merge ${open.map((ticket) => `#${ticket}`).join(', ')}, then \`drive push\``,
  };
};

const RULES: readonly Rule[] = [
  ghDown,
  evolve,
  (facts) => stopped('Decision', facts.decisionPr),
  (facts) => stopped('Integration', facts.integrationPr),
  define,
  reason,
  grilling,
  verify,
  implement,
];

export function derivePhase(facts: Facts): Standing {
  for (const rule of RULES) {
    const standing = rule(facts);
    if (standing !== null) return standing;
  }
  throw new Error('unreachable: the last rule always answers');
}

const prLine = (label: string, pr: PrFact | null, ghFailed: boolean): string => {
  if (ghFailed) return `${label}: unknown (gh failed)`;
  if (pr === null) return `${label}: none`;
  return `${label}: #${pr.number} ${pr.state === 'OPEN' && pr.isDraft ? 'draft' : pr.state.toLowerCase()}`;
};

const inputLines = ({ grillFormat, grillFormatPath, review, profiles }: ProjectInputs): string[] => [
  `Grill format: ${grillFormat} (${grillFormatPath ?? 'grill.format unset'})`,
  `review.md: ${review}`,
  `profiles.md: ${profiles}`,
];

export function renderStatus(facts: Facts): string {
  const { phase, next } = derivePhase(facts);
  const branch =
    facts.integrationBranch === null
      ? 'none'
      : `${facts.integrationBranch} (${facts.pushed ? 'pushed' : 'not pushed'})`;
  const last = facts.lastLog === null ? 'no log' : `\`${facts.lastLog.cmd}\` at ${facts.lastLog.t}`;
  return [
    `Workflow ${facts.topic}: ${phase}`,
    `Integration branch: ${branch}`,
    prLine('Decision PR', facts.decisionPr, facts.ghFailed),
    prLine('Integration PR', facts.integrationPr, facts.ghFailed),
    `Tickets: ${facts.mergedTickets.filter((ticket) => facts.tickets.includes(ticket)).length}/${facts.tickets.length} merged`,
    `Last command: ${last}`,
    ...inputLines(facts.inputs),
    `Next stop: ${next}`,
  ].join('\n');
}

export function pickIntegrationBranch(branches: readonly string[], topic: string, remote: string): string | null {
  const names = branches.map((name) => (name.startsWith(`${remote}/`) ? name.slice(remote.length + 1) : name));
  return names.find((name) => isIntegrationBranch(name) && topicSlugOf(name) === topic) ?? null;
}

export function mergedTicketsOf(mergeSubjects: readonly string[], integrationBranch: string): number[] {
  const numbers = mergeSubjects.flatMap((subject) => {
    const ticket = ticketOfMergeSubject(subject, integrationBranch);
    return ticket === null ? [] : [ticket];
  });
  return [...new Set(numbers)];
}

export function ticketsOfBodies(integrationBody: string | null, decisionBody: string | null): number[] {
  const closed = closesIn(integrationBody ?? '');
  if (closed.length > 0) return closed;
  const section = /^## Tickets\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(decisionBody ?? '');
  const listed = [...(section?.[1] ?? '').matchAll(/^\s*-\s*(?:#|\S*\/issues\/)(\d+)/gm)].map((found) =>
    Number(found[1]),
  );
  return [...new Set(listed)];
}

export function lastCommand(entries: readonly { t?: string; cmd?: string }[]): { t: string; cmd: string } | null {
  const commands = entries.filter((entry) => typeof entry.cmd === 'string' && typeof entry.t === 'string');
  const last = commands.at(-1);
  return last === undefined ? null : { t: last.t as string, cmd: last.cmd as string };
}

export function specOfDecisionBody(decisionBody: string | null): number | null {
  const section = /^## Spec\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(decisionBody ?? '');
  const found = /(?:#|\/issues\/)(\d+)/.exec(section?.[1] ?? '');
  return found === null ? null : Number(found[1]);
}

export function fortifyOfRecord(text: string): FortifyState | null {
  const front = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? '';
  const found = /^fortify:\s*['"]?(pending|engaged|skipped)['"]?\s*$/m.exec(front);
  return found === null ? null : (found[1] as FortifyState);
}

export function recordFileOf(files: readonly string[], topic: string): string | null {
  const dated = (name: string): boolean =>
    /^\d{4}-\d{2}-\d{2}-$/.test(name.slice(0, 11)) && name.slice(11) === `${topic}.md`;
  return files.find((file) => dated(file.split('/').at(-1) ?? '')) ?? null;
}

export function grillFormatStateOf(configured: string | null, exists: boolean): 'filled' | 'missing' {
  return configured !== null && exists ? 'filled' : 'missing';
}

const sectionBodies = (text: string): string[] =>
  text
    .split(/^## .*$/m)
    .slice(1)
    .map((body) => body.trim());

export function reviewStateOf(text: string | null): InputState {
  if (text === null) return 'missing';
  return sectionBodies(text).some((body) => body !== '') ? 'filled' : 'empty';
}

export function profilesStateOf(text: string | null): InputState {
  if (text === null) return 'missing';
  const section = /^## Live or scheduled[ \t]*$([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(text);
  return (section?.[1] ?? '').trim() === '' ? 'empty' : 'filled';
}

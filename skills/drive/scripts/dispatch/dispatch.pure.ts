export interface Ticket {
  number: number;
  files: string[];
  describes: number[];
  adrs: string | null;
  evidence: string | null;
}

function line(body: string, label: string): string | null {
  const found = new RegExp(`^${label}:[ \\t]*(.*)$`, 'm').exec(body);
  const value = found?.[1]?.trim() ?? '';
  return value === '' ? null : value;
}

export function parseTicket(number: number, body: string): Ticket {
  const files = line(body, 'Files');
  const describes = line(body, 'Describes');
  return {
    number,
    files: (files ?? '')
      .split(',')
      .map((entry) => entry.replace(/\s*\([^)]*\)\s*$/, '').trim())
      .filter((entry) => entry !== ''),
    describes: [...(describes ?? '').matchAll(/#(\d+)/g)].map((match) => Number(match[1])),
    adrs: line(body, 'ADRs'),
    evidence: line(body, 'Evidence from'),
  };
}

function literalPrefix(glob: string): string {
  const wildcard = glob.search(/[*?[{]/);
  return wildcard === -1 ? glob : glob.slice(0, wildcard);
}

function globToRegExp(glob: string): RegExp {
  const source = glob
    .replace(/[.+^$()|\\\]}]/g, '\\$&')
    .replace(/\*\*/g, '\0')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/\0/g, '.*');
  return new RegExp(`^${source}$`);
}

export function globsOverlap(a: string, b: string): boolean {
  return a === b || globToRegExp(a).test(literalPrefix(b)) || globToRegExp(b).test(literalPrefix(a));
}

export type IsMerged = (issue: number) => boolean;

function overlapProblems(tickets: readonly Ticket[]): string[] {
  const problems: string[] = [];
  tickets.forEach((first, index) => {
    for (const second of tickets.slice(index + 1)) {
      for (const [a, b] of first.files.flatMap((a) => second.files.map((b) => [a, b] as const))) {
        if (globsOverlap(a, b))
          problems.push(`#${first.number} and #${second.number} both own ${a === b ? a : `${a} and ${b}`}`);
      }
    }
  });
  return problems;
}

export function checkTickets(tickets: readonly Ticket[], isMerged: IsMerged): string[] {
  const problems: string[] = [];
  for (const ticket of tickets) {
    const id = `#${ticket.number}`;
    if (ticket.files.length === 0) problems.push(`${id} has no Files line`);
    if (ticket.adrs === null) problems.push(`${id} has no ADRs line`);
    if (ticket.evidence === null) problems.push(`${id} has no Evidence from line`);
    for (const target of ticket.describes)
      if (!isMerged(target)) problems.push(`${id} describes #${target}, which is unmerged`);
  }
  return [...problems, ...overlapProblems(tickets)];
}

export function epicOfTickets(bodies: readonly string[]): number | null {
  const epics = bodies.map((body) => {
    const section = /^## Parent\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(body);
    const found = /#(\d+)/.exec(section?.[1] ?? '');
    return found === null ? null : Number(found[1]);
  });
  const unique = new Set(epics);
  const [only] = [...unique];
  return unique.size === 1 && only !== null && only !== undefined ? only : null;
}

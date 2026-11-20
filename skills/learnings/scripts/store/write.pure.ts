const DATE_LENGTH = 'YYYY-MM-DD'.length;

export function addMonth(date: string): string {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  const target = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, DATE_LENGTH);
}

export function renderFailureMode({
  title,
  enforcer,
  date,
}: {
  title: string;
  enforcer: string;
  date: string;
}): string {
  return [
    '---',
    'type: failure-mode',
    `stale_after: ${addMonth(date)}`,
    `title: ${title}`,
    `enforcer: '${enforcer.replaceAll("'", "''")}'`,
    'status: proposed',
    '---',
    '',
    `# ${title}`,
    '',
    '## Symptom',
    '',
    'TODO: what an Operator or reviewer observes.',
    '',
  ].join('\n');
}

export function renderRecord({ topic, date }: { topic: string; date: string }): string {
  return [
    '---',
    'type: record',
    `workflow: ${topic}`,
    `date: ${date}`,
    'fortify: pending',
    '---',
    '',
    `# ${topic}`,
    '',
  ].join('\n');
}

const BULLET_LABELS: readonly (readonly ['evidence' | 'correction' | 'regressed', string])[] = [
  ['evidence', '**Evidence:**'],
  ['correction', '**Correction:**'],
  ['regressed', '**Regressed:**'],
];

export function recordBullets(flags: Readonly<Record<string, string>>): string[] {
  return BULLET_LABELS.flatMap(([flag, label]) => {
    const text = flags[flag];
    return text === undefined ? [] : [`${label} ${text}`];
  });
}

function h2Headings(lines: readonly string[]): { at: number; text: string }[] {
  let insideFence = false;
  const found: { at: number; text: string }[] = [];
  for (const [at, line] of lines.entries()) {
    if (/^(```|~~~)/.test(line)) insideFence = !insideFence;
    if (!insideFence && line.startsWith('## ')) found.push({ at, text: line.slice('## '.length).trim() });
  }
  return found;
}

function sectionOf(lines: readonly string[], slug: string): { heading: number; end: number } | null {
  const headings = h2Headings(lines);
  const index = headings.findIndex((heading) => heading.text === slug);
  const heading = headings[index];
  if (heading === undefined) return null;
  return { heading: heading.at, end: headings[index + 1]?.at ?? lines.length };
}

export function addBullet(record: string, slug: string, bullet: string): string {
  const lines = record.split('\n');
  if (lines.at(-1) === '') lines.pop();
  const section = sectionOf(lines, slug);
  if (section === null) return `${[...lines, '', `## ${slug}`, '', `- ${bullet}`].join('\n')}\n`;
  let last = section.end;
  while (last > section.heading + 1 && lines[last - 1] === '') last -= 1;
  const gap = last === section.heading + 1 ? [''] : [];
  lines.splice(last, 0, ...gap, `- ${bullet}`);
  return `${lines.join('\n')}\n`;
}

export function markTicket(text: string, url: string, date: string): string {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (match === null) return text;
  const front = (match[1] ?? '').split('\n').flatMap((line) => {
    if (line.startsWith('status:')) return ['status: ticket', `ticket: ${url}`];
    if (line.startsWith('stale_after:')) return [`stale_after: ${addMonth(date)}`];
    return line.startsWith('ticket:') ? [] : [line];
  });
  return `---\n${front.join('\n')}\n---${text.slice(match[0].length)}`;
}

export function offSkills(readme: string): string[] {
  const names: string[] = [];
  let inside = false;
  for (const line of readme.split(/\r?\n/)) {
    if (line.startsWith('## ')) inside = line.slice('## '.length).trim() === 'Off';
    else if (inside && line.startsWith('- ')) names.push(line.slice(2).trim().replaceAll('`', ''));
  }
  return names;
}

export const LEARNINGS_README = `# Learnings

What went wrong in each skill's runs, kept so a skill that fails the same way three times can ask for a fix upstream. The \`learnings\` skill writes it; read this file, not the skill, to use the store.

- \`<skill>/records/<date>-<topic>.md\`: one append-only record per run that went wrong. Each H2 names a failure mode. Front matter: \`type: record\`, \`workflow\`, \`date\`, \`fortify\`.
- \`<skill>/failure-modes/<slug>.md\`: one per failure mode, holding its title, Enforcer and status, never a count. Front matter: \`type: failure-mode\`, \`stale_after\` (one month after the last write).

The \`learnings\` skill's \`markdown-harness.config.yaml\` is the template for both: read what it asks with \`mh query --intents <skill>/records/<file>.md --config skills/learnings/markdown-harness.config.yaml --root docs/learnings\`. Before creating a failure mode, run \`learnings similar --skill <skill> "<failure>"\` and cite the match when its Enforcer would catch this case too. \`learnings list --skill <skill>\` prints each failure mode with its computed count; \`learnings check\` runs in the docs check.

## Off

Skills whose learning is turned off, one \`- <skill>\` bullet per line. \`learnings record\` refuses them. None yet.
`;

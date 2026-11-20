import { Document, parseDocument } from 'yaml';

export const SELF = 'drive';
export const LEARNINGS_INSTALL = 'npx skills add hancrafted/skills --skill learnings';

const FRONT = /^---\n([\s\S]*?)\n---\n?/;

const BODY = `# Drive

The skill home of \`/drive\`: the project's answers to its setup, written by \`drive setup\` and read by every Workflow. Read this file, not the skill, to use the home.

- \`binding.yml\`: the Binding, each phase's skills, its Model tier and the agent type.
- \`project.yml\`: worktree, parallel, model and Decision-doc settings.
- \`profiles.md\`: the project's rules per Profile. \`review.md\`: the calibration answers for every decision page.
- \`enforcers.yml\`: generated each run; the Enforcers Fortify picks from.

The records and failure modes are not here: they live in \`docs/learnings/drive/\`, owned by \`/learnings\`.

\`generated.by\` is the version of drive that last ran setup here; a newer drive migrates this home when it differs.
`;

export function readRecordedVersion(readme: string | null): string | null {
  const front = readme === null ? undefined : FRONT.exec(readme)?.[1];
  if (front === undefined) return null;
  const by = (parseDocument(front).toJS() as { generated?: { by?: unknown } } | null)?.generated?.by;
  return typeof by === 'string' ? by : null;
}

export function renderHomeReadme(existing: string | null, version: string, date: string): string {
  const matched = existing === null ? null : FRONT.exec(existing);
  const doc = matched === null ? new Document({ type: 'readme' }) : parseDocument(matched[1] ?? '');
  doc.set('generated', doc.createNode({ by: `${SELF}@${version}`, at: date }));
  const body = existing === null ? BODY : matched === null ? existing : existing.slice(matched[0].length);
  return `---\n${doc.toString().trimEnd()}\n---\n\n${body.replace(/^\n+/, '')}`;
}

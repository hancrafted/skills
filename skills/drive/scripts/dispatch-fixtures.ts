interface TicketLines {
  skills: string;
  files: string;
  describes: string;
  adrs: string;
  evidence: string;
  what: string;
}

const EPIC = 100;

const ticketBody = (lines: TicketLines): string =>
  [
    '## Parent',
    '',
    `#${EPIC}`,
    '',
    `Skills: ${lines.skills}`,
    `Files: ${lines.files}`,
    `Describes: ${lines.describes}`,
    `ADRs: ${lines.adrs}`,
    `Evidence from: ${lines.evidence}`,
    '',
    '## What to build',
    '',
    lines.what,
    '',
    '## Blocked by',
    '',
    'None (can start immediately)',
    '',
  ].join('\n');

const CODE_RULES = 'ARCH-003-testing, GEN-006-comments, GEN-007-naming';

export const EPIC_BODIES: Readonly<Record<number, string>> = {
  101: ticketBody({
    skills: 'tdd, writing-for-agents · Review after: yes: new on-disk format every later ticket writes',
    files:
      'skills/drive/markdown-harness.config.yaml, skills/drive/scripts/learnings*.ts, skills/drive/scripts/setup*.ts, skills/drive/scripts/drive.ts, package.json, docs/drive/learnings/README.md',
    describes: 'none',
    adrs: CODE_RULES,
    evidence: 'decisions.md Q2, Q9',
    what: 'The learnings store: record files citing failure-mode files, and `drive learnings` counting from records.',
  }),
  102: ticketBody({
    skills: 'tdd · Review after: no',
    files:
      'skills/drive/scripts/worktree-merge.ts, skills/drive/scripts/report*.ts, skills/drive/references/dispatch.md (report template only), docs/drive/profiles.md',
    describes: 'none',
    adrs: CODE_RULES,
    evidence: 'decisions.md Q4',
    what: '`drive worktree done` refuses a report with an unchecked acceptance criterion and no deferral ticket.',
  }),
  103: ticketBody({
    skills: 'tdd · Review after: yes: changes how every Integration PR opens',
    files:
      'skills/drive/scripts/push*.ts, skills/drive/scripts/pr-watch*.ts, skills/drive/scripts/pr-ready*.ts, skills/drive/scripts/drive.ts',
    describes: 'none',
    adrs: CODE_RULES,
    evidence: 'decisions.md Q7, Q8',
    what: 'Pushes are verified against the remote, and the Integration PR opens as a draft with `Closes #n`.',
  }),
  104: ticketBody({
    skills: 'tdd · Review after: no',
    files: 'skills/drive/scripts/dispatch*.ts, skills/drive/scripts/drive.ts',
    describes: 'none',
    adrs: CODE_RULES,
    evidence: 'decisions.md Q6',
    what: '`drive dispatch check <issue…>` fails when queued tickets share a file.',
  }),
  105: ticketBody({
    skills: 'implement · Review after: yes: migration must reproduce every count',
    files: 'docs/drive/learnings.md (delete), docs/drive/learnings/**',
    describes: 'none',
    adrs: 'GEN-007-naming',
    evidence: 'docs/drive/learnings.md (all entries)',
    what: 'The entries of `docs/drive/learnings.md` move into the store with their counts intact.',
  }),
  106: ticketBody({
    skills: 'tdd · Review after: yes: new hook in project settings',
    files:
      'skills/drive/scripts/log*.ts, skills/drive/scripts/transcript*.ts, skills/drive/scripts/claude-adapter*.ts, skills/drive/scripts/setup*.ts, skills/drive/scripts/drive.ts, .claude/settings.json, skills/drive/scripts/fixtures/**',
    describes: 'none',
    adrs: CODE_RULES,
    evidence: 'decisions.md Q15, Q20',
    what: 'Every drive CLI command is logged to the topic log, and `drive transcript` extracts the signal.',
  }),
  107: ticketBody({
    skills: 'tdd · Review after: no',
    files: 'skills/drive/scripts/status*.ts, skills/drive/scripts/drive.ts',
    describes: 'none',
    adrs: CODE_RULES,
    evidence: 'decisions.md Q5',
    what: '`drive status <topic>` says where the Workflow stands and what the next stop is.',
  }),
  108: ticketBody({
    skills: 'tdd, diagnosing-bugs · Review after: no',
    files:
      'skills/drive/scripts/worktree.ts, skills/drive/scripts/worktree-process*.ts, skills/drive/scripts/setup*.ts, skills/drive/scripts/config*.ts, docs/drive/project.yml, tools/**/preflight*, skills/cleanup/**',
    describes: 'none',
    adrs: CODE_RULES,
    evidence: 'decisions.md Q11',
    what: 'Small CLI fixes that each remove one Operator interrupt.',
  }),
  109: ticketBody({
    skills: 'writing-for-agents · Review after: yes: the skill text every future Workflow follows',
    files: 'skills/drive/SKILL.md, skills/drive/references/**, docs/agents/grilling-format.md',
    describes: '#101, #105, #102, #104, #103, #107, #108, #106',
    adrs: 'GEN-007-naming',
    evidence: 'decisions.md Q3, Q10; Decision record 0003',
    what: 'The drive skill text describes the merged CLI.',
  }),
};

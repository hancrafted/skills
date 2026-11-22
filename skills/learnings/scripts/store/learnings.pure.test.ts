import { describe, expect, it } from 'vitest';
import {
  countCitations,
  type FailureMode,
  type LearningsRecord,
  parseFailureMode,
  parseRecord,
  renderRows,
  storeProblems,
} from './learnings.pure.ts';
const PUSH = 'push-exits-zero';
const GUARD = 'guard-covers-husky-only';
const FORTIFY = 'fortify-skipped-before-deadline';
const failureModeText = (lines: readonly string[], title = 'drive push exits 0 when the remote rejected the commit') =>
  [
    '---',
    `title: ${title}`,
    "enforcer: 'test-runner: test'",
    ...lines,
    '---',
    '',
    `# ${title}`,
    '',
    '## Symptom',
    '',
    'The push reports success and the remote never took the commit.',
    '',
  ].join('\n');
const recordText = (front: readonly string[], body: readonly string[]) =>
  ['---', ...front, '---', '', ...body, ''].join('\n');
const mode = (slug: string, title: string, extra: Partial<FailureMode> = {}): FailureMode => ({
  slug,
  title,
  heading: title,
  enforcer: 'test-runner: test',
  status: 'proposed',
  ticket: null,
  fixedBy: null,
  fixedOn: null,
  reason: null,
  ...extra,
});
const record = (date: string, workflow: string, citations: LearningsRecord['citations']): LearningsRecord => ({
  file: `${date}-${workflow}.md`,
  workflow,
  date,
  fortify: 'engaged',
  skipReason: null,
  citations,
  intents: [],
});
const intent = (position: number, ...bullets: string[]) => ({
  position,
  bullets: bullets.length === 0 ? ['**Turns:** 5'] : bullets,
});
const evidence = (slug: string, ...bullets: string[]) => ({
  slug,
  bullets: bullets.length === 0 ? ['**Evidence:** something happened'] : bullets,
});
const MODES = [
  mode(PUSH, 'drive push exits 0 when the remote rejected the commit', {
    status: 'fixed',
    ticket: 'https://github.com/o/r/issues/40',
    fixedBy: 'https://github.com/o/r/pull/68',
    fixedOn: '2026-11-18',
  }),
  mode(GUARD, 'Guard wiring covers husky only'),
  mode(FORTIFY, 'The Operator skips Fortify before a deadline', {
    status: 'ticket',
    ticket: 'https://github.com/o/r/issues/93',
  }),
];

describe('success cases', () => {
  it('reads an Intent section apart from the citations, with its place among the H2s', () => {
    // ARRANGE
    const text = recordText(
      ['workflow: demo', 'date: 2026-11-19', 'fortify: pending'],
      [
        '# demo',
        '',
        '## Intent',
        '',
        '- **Turns:** 5',
        '- **Outcome:** confirmed',
        '',
        `## ${GUARD}`,
        '',
        '- **Evidence:** e',
      ],
    );
    const expected = {
      ...record('2026-11-19', 'demo', [evidence(GUARD, '**Evidence:** e')]),
      fortify: 'pending',
      intents: [intent(0, '**Turns:** 5', '**Outcome:** confirmed')],
    };
    // ACT
    const parsed = parseRecord('2026-11-19-demo.md', text);
    // ASSERT
    expect(parsed).toEqual(expected);
  });

  it('passes a record with one Intent section first, and a record with none', () => {
    // ARRANGE
    const records = [
      { ...record('2026-11-19', 'with', [evidence(GUARD)]), intents: [intent(0, '**Turns:** 5', '**Drift:** none')] },
      record('2026-11-20', 'without', [evidence(GUARD)]),
    ];
    // ACT
    const problems = storeProblems({ modes: MODES, records, skill: 'drive', legacyFileExists: false });
    // ASSERT
    expect(problems).toEqual([]);
  });

  it('reads a failure mode with its status fields from front matter', () => {
    // ARRANGE
    const text = failureModeText([
      'status: fixed',
      'ticket: https://github.com/o/r/issues/40',
      'fixed-by: https://github.com/o/r/pull/68',
      'fixed-on: 2026-11-18',
    ]);
    const expected = MODES[0];
    // ACT
    const parsed = parseFailureMode(PUSH, text);
    // ASSERT
    expect(parsed).toEqual(expected);
  });

  it('reads a record: its front matter, each H2 as a citation and the bullets under it', () => {
    // ARRANGE
    const text = recordText(
      ['workflow: demo', 'date: 2026-11-19', 'fortify: skipped', 'skip-reason: deadline 17:30'],
      [
        '# demo',
        '',
        'One sentence about the Workflow.',
        '',
        `## ${PUSH}`,
        '',
        '- **Evidence:** f86d62a7: push printed "failed (null)"',
        '  and exited 0.',
        '- **Regressed:** #68 did not hold. (source: monitor)',
        '',
        '```markdown',
        '## not-a-heading',
        '```',
        '',
        `## ${GUARD}`,
        '',
        '- **Correction:** "why only husky?"',
      ],
    );
    const expected = {
      ...record('2026-11-19', 'demo', [
        evidence(
          PUSH,
          '**Evidence:** f86d62a7: push printed "failed (null)"',
          '**Regressed:** #68 did not hold. (source: monitor)',
        ),
        evidence(GUARD, '**Correction:** "why only husky?"'),
      ]),
      fortify: 'skipped',
      skipReason: 'deadline 17:30',
    };
    // ACT
    const parsed = parseRecord('2026-11-19-demo.md', text);
    // ASSERT
    expect(parsed).toEqual(expected);
  });

  it('counts the records citing each failure mode, most cited first, and keeps uncited ones at zero', () => {
    // ARRANGE
    const records = [
      record('2026-11-17', 'drive', [evidence(GUARD), evidence(FORTIFY)]),
      record('2026-11-18', 'pool', [evidence(FORTIFY)]),
    ];
    const expected = [
      { slug: FORTIFY, count: 2, status: 'ticket', regressed: false },
      { slug: GUARD, count: 1, status: 'proposed', regressed: false },
      { slug: PUSH, count: 0, status: 'fixed', regressed: false },
    ];
    // ACT
    const rows = countCitations(MODES, records);
    // ASSERT
    expect(rows).toEqual(expected);
  });

  it('marks a fixed failure mode regressed when a record dated after fixed-on cites it', () => {
    // ARRANGE
    const records = [record('2026-11-19', 'sweep', [evidence(PUSH, '**Regressed:** #68 did not hold')])];
    const expected = { slug: PUSH, count: 1, status: 'fixed', regressed: true };
    // ACT
    const rows = countCitations(MODES, records);
    // ASSERT
    expect(rows).toContainEqual(expected);
  });

  it('marks a fixed failure mode regressed when a same-day record carries a Regressed bullet', () => {
    // ARRANGE
    const records = [record('2026-11-18', 'same-day', [evidence(PUSH, '**Regressed:** the fix did not hold')])];
    const expected = { slug: PUSH, count: 1, status: 'fixed', regressed: true };
    // ACT
    const rows = countCitations(MODES, records);
    // ASSERT
    expect(rows).toContainEqual(expected);
  });

  it('renders one line per failure mode with its count, status and the regressed flag', () => {
    // ARRANGE
    const rows = [
      { slug: PUSH, count: 2, status: 'fixed' as const, regressed: true },
      { slug: GUARD, count: 1, status: 'proposed' as const, regressed: false },
    ];
    const expected = [
      'count  status    failure mode',
      '    2  fixed     push-exits-zero  regressed',
      '    1  proposed  guard-covers-husky-only',
    ].join('\n');
    // ACT
    const text = renderRows(rows);
    // ASSERT
    expect(text).toBe(expected);
  });

  it('finds no problem in a consistent store', () => {
    // ARRANGE
    const records = [
      record('2026-11-17', 'drive', [evidence(GUARD)]),
      {
        ...record('2026-11-19', 'sweep', [evidence(PUSH, '**Regressed:** #68 did not hold')]),
        fortify: 'skipped' as const,
        skipReason: 'deadline',
      },
    ];
    // ACT
    const problems = storeProblems({
      modes: MODES,
      records,
      skill: 'drive',
      legacyFileExists: false,
    });
    // ASSERT
    expect(problems).toEqual([]);
  });
});

describe('failure cases', () => {
  it('fails a record with two Intent sections, one placed after a failure mode, or one with an unlabelled bullet', () => {
    // ARRANGE
    const records = [
      { ...record('2026-11-19', 'twice', []), intents: [intent(0), intent(0)] },
      { ...record('2026-11-20', 'late', [evidence(GUARD)]), intents: [intent(1)] },
      { ...record('2026-11-21', 'loose', []), intents: [intent(0, 'plain text bullet')] },
    ];
    const expected = [
      'records/2026-11-19-twice.md: ## Intent appears twice; keep one Intent section per record',
      'records/2026-11-20-late.md: ## Intent comes after a failure mode; place it first, right after the title',
      'records/2026-11-21-loose.md: ## Intent has a bullet that opens with none of **Turns:**, **Moved:**, **Outcome:**, **Drift:**, **Bets:**',
    ];
    // ACT
    const problems = storeProblems({ modes: MODES, records, skill: 'drive', legacyFileExists: false });
    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('names a record H2 that has no failure-mode file, and points at learnings similar --skill', () => {
    // ARRANGE
    const records = [record('2026-11-19', 'sweep', [evidence('no-such-mode')])];
    const expected = [
      'records/2026-11-19-sweep.md: ## no-such-mode names no failure-modes/no-such-mode.md; cite an existing one (learnings similar --skill drive "<failure>") or create it',
    ];
    // ACT
    const problems = storeProblems({
      modes: MODES,
      records,
      skill: 'drive',
      legacyFileExists: false,
    });
    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails a legacy learnings.md beside a migrated store', () => {
    // ARRANGE
    const expected = [
      'docs/drive/learnings.md exists beside the learnings store: move its entries into records/ and failure-modes/, then delete it',
    ];
    // ACT
    const problems = storeProblems({
      modes: MODES,
      records: [],
      skill: 'drive',
      legacyFileExists: true,
    });
    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails a record citing a fixed failure mode after fixed-on without a Regressed bullet', () => {
    // ARRANGE
    const records = [record('2026-11-19', 'sweep', [evidence(PUSH)])];
    const expected = [
      `records/2026-11-19-sweep.md: ## ${PUSH} cites a failure mode fixed on 2026-11-18 by https://github.com/o/r/pull/68; add a **Regressed:** bullet saying why the fix did not hold`,
    ];
    // ACT
    const problems = storeProblems({
      modes: MODES,
      records,
      skill: 'drive',
      legacyFileExists: false,
    });
    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('accepts fortify pending without a skip-reason and refuses a skip-reason on it', () => {
    // ARRANGE
    const pending = {
      ...record('2026-11-19', 'sweep', [evidence(GUARD)]),
      fortify: 'pending' as const,
    };
    const withReason = { ...pending, skipReason: 'deadline' };
    const expected = ['records/2026-11-19-sweep.md: skip-reason belongs only to fortify skipped'];
    // ACT
    const accepted = storeProblems({
      modes: MODES,
      records: [pending],
      skill: 'drive',
      legacyFileExists: false,
    });
    const refused = storeProblems({
      modes: MODES,
      records: [withReason],
      skill: 'drive',
      legacyFileExists: false,
    });
    // ASSERT
    expect(accepted).toEqual([]);
    expect(refused).toEqual(expected);
  });

  it('parses fortify pending from the front matter', () => {
    // ARRANGE
    const text = ['---', 'workflow: demo', "date: '2026-11-19'", 'fortify: pending', '---', '', '# demo', ''].join(
      '\n',
    );
    const expected = 'pending';
    // ACT
    const parsed = parseRecord('2026-11-19-demo.md', text);
    // ASSERT
    expect(parsed).toMatchObject({ fortify: expected });
  });

  it('fails status fields that disagree with the status, and a title that differs from the H1', () => {
    // ARRANGE
    const modes = [
      mode('a-ticket', 'A ticket', { status: 'ticket' }),
      mode('a-fix', 'A fix', {
        status: 'fixed',
        fixedBy: 'https://example.test/pull/1',
      }),
      mode('a-wontfix', 'A wontfix', { status: 'wontfix' }),
      mode('a-title', 'A title', { heading: 'Another title' }),
    ];
    const expected = [
      'failure-modes/a-ticket.md: status ticket needs ticket',
      'failure-modes/a-fix.md: status fixed needs fixed-on',
      'failure-modes/a-wontfix.md: status wontfix needs reason',
      'failure-modes/a-title.md: the H1 "Another title" differs from title "A title"',
    ];
    // ACT
    const problems = storeProblems({
      modes,
      records: [],
      skill: 'drive',
      legacyFileExists: false,
    });
    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails a record whose name, skip reason, repeated H2 or bullet label is wrong', () => {
    // ARRANGE
    const records = [
      {
        ...record('2026-11-19', 'sweep', [evidence(GUARD), evidence(GUARD, 'plain text bullet')]),
        file: '2026-11-19-other.md',
        fortify: 'skipped' as const,
      },
      { ...record('2026-11-20', 'later', []), skipReason: 'not asked' },
    ];
    const expected = [
      'records/2026-11-19-other.md: name it 2026-11-19-sweep.md, from its date and workflow',
      'records/2026-11-19-other.md: fortify skipped needs skip-reason',
      `records/2026-11-19-other.md: ## ${GUARD} appears twice; cite a failure mode once per record`,
      `records/2026-11-19-other.md: ## ${GUARD} has a bullet that opens with none of **Evidence:**, **Correction:**, **Regressed:**`,
      'records/2026-11-20-later.md: skip-reason belongs only to fortify skipped',
    ];
    // ACT
    const problems = storeProblems({
      modes: MODES,
      records,
      skill: 'drive',
      legacyFileExists: false,
    });
    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('refuses a failure mode or record with missing front matter or an unknown status', () => {
    // ARRANGE
    const noFrontMatter = '# just a heading\n';
    const badStatus = failureModeText(['status: waiting']);
    const expected = [
      { error: 'failure-modes/x.md: no front matter' },
      {
        error: 'failure-modes/x.md: status must be proposed, ticket, fixed or wontfix',
      },
      { error: 'records/x.md: no front matter' },
    ];
    // ACT
    const results = [
      parseFailureMode('x', noFrontMatter),
      parseFailureMode('x', badStatus),
      parseRecord('x.md', noFrontMatter),
    ];
    // ASSERT
    expect(results).toEqual(expected);
  });
});

describe('edge cases', () => {
  it('keeps the legacy-file rule dormant until the store holds a failure mode', () => {
    // ARRANGE
    // ACT
    const problems = storeProblems({
      modes: [],
      records: [],
      skill: 'drive',
      legacyFileExists: true,
    });
    // ASSERT
    expect(problems).toEqual([]);
  });

  it('does not call a citation on or before fixed-on a regression', () => {
    // ARRANGE
    const records = [record('2026-11-18', 'same-day', [evidence(PUSH)])];
    const expected = {
      slug: PUSH,
      count: 1,
      status: 'fixed',
      regressed: false,
    };
    // ACT
    const rows = countCitations(MODES, records);
    const problems = storeProblems({
      modes: MODES,
      records,
      skill: 'drive',
      legacyFileExists: false,
    });
    // ASSERT
    expect(rows).toContainEqual(expected);
    expect(problems).toEqual([]);
  });

  it('counts a record once even when it cites a failure mode twice', () => {
    // ARRANGE
    const records = [record('2026-11-17', 'drive', [evidence(GUARD), evidence(GUARD)])];
    const expected = {
      slug: GUARD,
      count: 1,
      status: 'proposed',
      regressed: false,
    };
    // ACT
    const rows = countCitations(MODES, records);
    // ASSERT
    expect(rows).toContainEqual(expected);
  });
});

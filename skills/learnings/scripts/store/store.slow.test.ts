import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { USAGE } from './args.pure.ts';
import { learningsReport } from './learnings.ts';
import type { Outcome } from './process.ts';
const REPO_ROOT = path.resolve(import.meta.dirname, '../../../..');
const MARKDOWN_HARNESS = path.join(REPO_ROOT, 'node_modules/.bin/mh');
const CONFIG = path.join(import.meta.dirname, '..', '..', 'markdown-harness.config.yaml');
const FIXED = 'push-exits-zero';
const FAILURE_MODE = [
  '---',
  'type: failure-mode',
  'stale_after: 2026-12-20',
  'title: drive push exits 0 when the remote rejected the commit',
  "enforcer: 'test-runner: test'",
  'status: fixed',
  'ticket: https://github.com/o/r/issues/40',
  'fixed-by: https://github.com/o/r/pull/68',
  'fixed-on: 2026-11-18',
  '---',
  '',
  '# drive push exits 0 when the remote rejected the commit',
  '',
  '## Symptom',
  '',
  'The push reports success and the remote never took the commit.',
  '',
  '## Fix',
  '',
  '- Compare `git ls-remote` with HEAD after every push.',
  '',
].join('\n');
const VALID_RECORD = [
  '---',
  'type: record',
  'workflow: sweep',
  'date: 2026-11-19',
  'fortify: skipped',
  'skip-reason: deadline 17:30',
  '---',
  '',
  '# sweep',
  '',
  `## ${FIXED}`,
  '',
  '- **Evidence:** f86d62a7: push printed "failed (null)" and exited 0.',
  '- **Regressed:** #68 did not hold: the null exit skips ls-remote. (source: monitor)',
  '',
].join('\n');
const INVALID_RECORD = [
  '---',
  'type: record',
  'workflow: sweep',
  'date: 2026-11-19',
  'fortify: maybe',
  'count: 3',
  '---',
  '',
  '# sweep',
  '',
  '## Push Exits Zero',
  '',
  '### a nested heading',
  '',
].join('\n');
interface Violation {
  violation: string;
  field?: string;
  content?: string;
}
interface CheckReport {
  result: {
    summary: { governedFiles: number; invalidFiles: number };
    files: { modules: { violations: Violation[] }[] }[];
  };
}
function checkStore(record: string): { exit: number | null; report: CheckReport } {
  const store = realpathSync(mkdtempSync(path.join(tmpdir(), 'drive-learnings-mh-')));
  mkdirSync(path.join(store, 'failure-modes'));
  mkdirSync(path.join(store, 'records'));
  writeFileSync(path.join(store, 'failure-modes', `${FIXED}.md`), FAILURE_MODE);
  writeFileSync(path.join(store, 'records', '2026-11-19-sweep.md'), record);
  const result = spawnSync(MARKDOWN_HARNESS, ['check', '--root', store, '--config', CONFIG], { encoding: 'utf8' });
  return { exit: result.status, report: JSON.parse(result.stdout) as CheckReport };
}
const violationsOf = (report: CheckReport): string[] =>
  report.result.files.flatMap((file) =>
    file.modules.flatMap((module) =>
      module.violations.map(({ violation, field, content }) => `${violation} ${field ?? content ?? ''}`),
    ),
  );

const STORE = 'docs/learnings/drive';
const SKILL = 'drive';
const TODAY = '2026-11-20';
const NO_GH = (): Outcome => ({ status: 1, stdout: '', stderr: 'gh must not run' });
const PORTS = { gh: NO_GH, today: TODAY };
const runLearnings = (root: string, argv: readonly string[]) => learningsReport(root, argv, PORTS);
const PROPOSED = 'guard-covers-husky-only';
const FIXED_TITLE = 'drive push exits 0 when the remote rejected the commit';
const PROPOSED_TITLE = 'Guard wiring covers husky only';
const failureMode = (title: string, status: readonly string[]) =>
  [
    '---',
    'type: failure-mode',
    'stale_after: 2026-12-20',
    `title: ${title}`,
    "enforcer: 'test-runner: test'",
    ...status,
    '---',
    '',
    `# ${title}`,
    '',
    '## Symptom',
    '',
    'It goes wrong.',
    '',
  ].join('\n');
const recordFile = (workflow: string, date: string, body: readonly string[]) =>
  [
    '---',
    'type: record',
    `workflow: ${workflow}`,
    `date: ${date}`,
    'fortify: engaged',
    '---',
    '',
    `# ${workflow}`,
    '',
    ...body,
    '',
  ].join('\n');
function repo(files: Record<string, string>): string {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'drive-learnings-')));
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), text);
  }
  return root;
}
const MODES = {
  [`${STORE}/failure-modes/${FIXED}.md`]: failureMode(FIXED_TITLE, [
    'status: fixed',
    'fixed-by: https://github.com/o/r/pull/68',
    'fixed-on: 2026-11-18',
  ]),
  [`${STORE}/failure-modes/${PROPOSED}.md`]: failureMode(PROPOSED_TITLE, ['status: proposed']),
};

describe('success cases', () => {
  describe('drive learnings', () => {
    it('lists each failure mode with the count computed from the records, its status and regressed', () => {
      // ARRANGE
      const root = repo({
        ...MODES,
        [`${STORE}/records/2026-11-17-drive.md`]: recordFile('drive', '2026-11-17', [
          `## ${PROPOSED}`,
          '',
          '- **Evidence:** setup wires husky only',
          '',
          `## ${FIXED}`,
          '',
          '- **Evidence:** push exited 0',
        ]),
        [`${STORE}/records/2026-11-19-sweep.md`]: recordFile('sweep', '2026-11-19', [
          `## ${FIXED}`,
          '',
          '- **Regressed:** #68 did not hold: the null exit skips ls-remote',
        ]),
      });
      const expected = {
        output: [
          'count  status    failure mode',
          `    2  fixed     ${FIXED}  regressed`,
          `    1  proposed  ${PROPOSED}`,
        ].join('\n'),
        exit: 0,
      };
      // ACT
      const report = runLearnings(root, ['list', '--skill', SKILL]);
      // ASSERT
      expect(report).toEqual(expected);
    });

    it('prints the closest titles for similar, and a store summary for check', () => {
      // ARRANGE
      const root = repo(MODES);
      const expected = [
        { output: `0.13  ${FIXED}  ${FIXED_TITLE}`, exit: 0 },
        { output: `✔ ${STORE}: 2 failure modes, 0 records`, exit: 0 },
      ];
      // ACT
      const reports = [
        runLearnings(root, ['similar', '--skill', SKILL, 'push', 'hangs']),
        runLearnings(root, ['check', '--skill', SKILL]),
      ];
      // ASSERT
      expect(reports).toEqual(expected);
    });
  });
  describe('the skill-shipped markdown-harness config', () => {
    it('passes a well-formed record and failure mode', () => {
      // ARRANGE
      const expected = { governedFiles: 2, invalidFiles: 0 };
      // ACT
      const { exit, report } = checkStore(VALID_RECORD);
      // ASSERT
      expect(exit).toBe(0);
      expect(report.result.summary).toMatchObject(expected);
    });
  });
});

describe('failure cases', () => {
  describe('drive learnings', () => {
    it('check fails a record H2 with no failure-mode file and a learnings.md beside the store', () => {
      // ARRANGE
      const root = repo({
        ...MODES,
        'docs/drive/learnings.md': '# Drive learnings\n',
        [`${STORE}/records/2026-11-19-sweep.md`]: recordFile('sweep', '2026-11-19', [
          '## made-up-mode',
          '',
          '- **Evidence:** x',
        ]),
      });
      const expected = {
        output: [
          '✖ docs/drive/learnings.md exists beside the learnings store: move its entries into records/ and failure-modes/, then delete it',
          `✖ ${STORE}/records/2026-11-19-sweep.md: ## made-up-mode names no failure-modes/made-up-mode.md; cite an existing one (learnings similar --skill ${SKILL} "<failure>") or create it`,
        ].join('\n'),
        exit: 1,
      };
      // ACT
      const report = runLearnings(root, ['check', '--skill', SKILL]);
      // ASSERT
      expect(report).toEqual(expected);
    });

    it('names a file it cannot read, and prints the usage for an unknown verb', () => {
      // ARRANGE
      const root = repo({ [`${STORE}/records/2026-11-19-sweep.md`]: '# no front matter\n' });
      const expected = [
        { output: `✖ ${STORE}/records/2026-11-19-sweep.md: no front matter`, exit: 1 },
        { output: `✖ unknown verb "count"\n✖ ${USAGE}`, exit: 1 },
      ];
      // ACT
      const reports = [runLearnings(root, ['check', '--skill', SKILL]), runLearnings(repo({}), ['count'])];
      // ASSERT
      expect(reports).toEqual(expected);
    });
  });
  describe('the skill-shipped markdown-harness config', () => {
    it('fails a record with an unknown fortify value, a count, a heading that is no slug and a nested heading', () => {
      // ARRANGE
      const expected = [
        'FRONTMATTER__VALUE_NOT_ALLOWED fortify',
        'FRONTMATTER__UNKNOWN_KEY_FORBIDDEN count',
        'BODY_STRUCTURE__HEADING_UNDEFINED Push Exits Zero',
        'BODY_STRUCTURE__HEADING_UNDEFINED a nested heading',
      ];
      // ACT
      const { exit, report } = checkStore(INVALID_RECORD);
      // ASSERT
      expect(exit).toBe(1);
      expect(violationsOf(report)).toEqual(expected);
    });
  });
});

describe('edge cases', () => {
  describe('drive learnings', () => {
    it('keeps a learnings.md legal while the store has no failure mode, so a repo mid-migration stays green', () => {
      // ARRANGE
      const root = repo({ 'docs/drive/learnings.md': '# Drive learnings\n' });
      const expected = { output: `✔ ${STORE}: 0 failure modes, 0 records`, exit: 0 };
      // ACT
      const report = runLearnings(root, ['check', '--skill', SKILL]);
      // ASSERT
      expect(report).toEqual(expected);
    });

    it('says when no failure mode shares a word with the text', () => {
      // ARRANGE
      const root = repo(MODES);
      const expected = { output: 'no failure mode shares a word with "quota reset": create one', exit: 0 };
      // ACT
      const report = runLearnings(root, ['similar', '--skill', SKILL, 'quota reset']);
      // ASSERT
      expect(report).toEqual(expected);
    });
  });
});

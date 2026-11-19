import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { learningsReport } from './learnings.ts';
const STORE = 'docs/drive/learnings';
const FIXED = 'push-exits-zero';
const PROPOSED = 'guard-covers-husky-only';
const FIXED_TITLE = 'drive push exits 0 when the remote rejected the commit';
const PROPOSED_TITLE = 'Guard wiring covers husky only';
const failureMode = (title: string, status: readonly string[]) =>
  [
    '---',
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
      const report = learningsReport(root, []);
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
      const reports = [learningsReport(root, ['similar', 'push', 'hangs']), learningsReport(root, ['check'])];
      // ASSERT
      expect(reports).toEqual(expected);
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
          '✖ records/2026-11-19-sweep.md: ## made-up-mode names no failure-modes/made-up-mode.md; cite an existing one (drive learnings similar "<failure>") or create it',
        ].join('\n'),
        exit: 1,
      };
      // ACT
      const report = learningsReport(root, ['check']);
      // ASSERT
      expect(report).toEqual(expected);
    });

    it('names a file it cannot read, and prints the usage for an unknown verb', () => {
      // ARRANGE
      const root = repo({ [`${STORE}/records/2026-11-19-sweep.md`]: '# no front matter\n' });
      const expected = [
        { output: '✖ records/2026-11-19-sweep.md: no front matter', exit: 1 },
        { output: 'usage: drive learnings [list | similar "<failure>" | check]', exit: 1 },
      ];
      // ACT
      const reports = [learningsReport(root, ['check']), learningsReport(repo({}), ['count'])];
      // ASSERT
      expect(reports).toEqual(expected);
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
      const report = learningsReport(root, ['check']);
      // ASSERT
      expect(report).toEqual(expected);
    });

    it('says when no failure mode shares a word with the text', () => {
      // ARRANGE
      const root = repo(MODES);
      const expected = { output: 'no failure mode shares a word with "quota reset": create one', exit: 0 };
      // ACT
      const report = learningsReport(root, ['similar', 'quota reset']);
      // ASSERT
      expect(report).toEqual(expected);
    });
  });
});

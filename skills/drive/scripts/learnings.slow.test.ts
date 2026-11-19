import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');
const MARKDOWN_HARNESS = path.join(REPO_ROOT, 'node_modules/.bin/mh');
const CONFIG = path.join(import.meta.dirname, '..', 'markdown-harness.config.yaml');
const FIXED = 'push-exits-zero';
const FAILURE_MODE = [
  '---',
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

describe('success cases', () => {
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

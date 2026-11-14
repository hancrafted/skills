import type { Browser } from '@playwright/test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Check } from './check.ts';
import { FIXTURE_ASKED, fixturePage } from './fixtures.ts';
import { loadChecks } from './registry.ts';
import { gradeFile, launch } from './run.ts';

let browser: Browser;
let checks: Check[];
let dir: string;

beforeAll(async () => {
  checks = await loadChecks();
  browser = await launch();
});
afterAll(async () => browser?.close());
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'decision-grader-test-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function pageFile(name: string): string {
  const file = path.join(dir, `${name}.html`);
  writeFileSync(file, fixturePage(name));
  return file;
}

describe('success cases', () => {
  it('grades a local decision page through every real browser check at both widths', async () => {
    // ARRANGE
    const file = pageFile('valid-decide');
    const expectedMode = 'decide';

    // ACT
    const report = await gradeFile(browser, checks, { file, asked: FIXTURE_ASKED });
    const failures = report.checks.filter((check) => check.status === 'fail');

    // ASSERT
    expect(report.mode).toBe(expectedMode);
    expect(failures).toEqual([]);
    expect(report.pass).toBe(true);
    expect(report.checks).not.toEqual([]);
  });
});

describe('failure cases', () => {
  it('detects collapsed feedback through the actual Copy prompt and Save controls', async () => {
    // ARRANGE
    const file = pageFile('export--collapsed-comment');
    const expectedFailures = ['export'];

    // ACT
    const report = await gradeFile(browser, checks, { file, asked: FIXTURE_ASKED });
    const failures = report.checks.filter((check) => check.status === 'fail').map((check) => check.id);

    // ASSERT
    expect(failures).toEqual(expectedFailures);
    expect(report.pass).toBe(false);
  });
});

describe('edge cases', () => {
  it('leaves fidelity ungraded when the caller has not requested a rung', async () => {
    // ARRANGE
    const file = pageFile('valid-decide');
    const fidelity = checks.filter((check) => check.id === 'fidelity-match');
    const expected = [{ id: 'fidelity-match', status: 'skip', problems: [] }];

    // ACT
    const report = await gradeFile(browser, fidelity, { file });
    const results = report.checks.map(({ id, status, problems }) => ({ id, status, problems }));

    // ASSERT
    expect(results).toEqual(expected);
    expect(report.pass).toBe(true);
  });
});

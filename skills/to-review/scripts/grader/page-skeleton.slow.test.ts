import type { Browser } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Check } from './check.ts';
import { FIXTURE_ASKED } from './fixtures.ts';
import { loadChecks } from './registry.ts';
import { gradeFile, launch } from './run.ts';

const SKELETON = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../assets/page-skeleton.html');
const SKILL = path.resolve(path.dirname(SKELETON), '../SKILL.md');

let browser: Browser;
let checks: Check[];

beforeAll(async () => {
  checks = await loadChecks();
  browser = await launch();
});
afterAll(async () => browser?.close());

describe('success cases', () => {
  it('passes every check at both widths exactly as shipped', async () => {
    // ARRANGE
    const expectedMode = 'decide';

    // ACT
    const report = await gradeFile(browser, checks, { file: SKELETON, asked: FIXTURE_ASKED });
    const failures = report.checks.filter((check) => check.status === 'fail');

    // ASSERT
    expect(failures).toEqual([]);
    expect(report.mode).toBe(expectedMode);
    expect(report.pass).toBe(true);
  });
});

describe('failure cases', () => {
  it('carries no word-breaking override that would split an identifier mid-word', () => {
    // ARRANGE
    const forbidden = /overflow-wrap:\s*anywhere|word-break:\s*break-all/;

    // ACT
    const page = readFileSync(SKELETON, 'utf8');

    // ASSERT
    expect(page).not.toMatch(forbidden);
  });
});

describe('edge cases', () => {
  it('is named by SKILL.md step 4 so a builder copies it', () => {
    // ARRANGE
    const pointer = '[the page skeleton](assets/page-skeleton.html)';

    // ACT
    const skill = readFileSync(SKILL, 'utf8');

    // ASSERT
    expect(skill).toContain(pointer);
  });
});

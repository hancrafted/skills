import type { Browser } from '@playwright/test';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { launch } from '../../scripts/grader/run.ts';
import { CASES, referenceOf } from './cases.ts';
import { captureViews } from './views.ts';

let browser: Browser;
let dir: string;
beforeAll(async () => {
  browser = await launch();
});
afterAll(async () => browser?.close());
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'decision-views-test-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('success cases', () => {
  it.each([
    ['architecture-round', 'Software ecology: ten refactors, four ideas'],
    ['episode-spec', 'The context window is a budget'],
  ])('captures the approved %s reference offline without altering its bytes', async (id, heading) => {
    // ARRANGE
    const file = path.join(CASES, referenceOf(id)!);
    const before = readFileSync(file);
    const expectedFiles = ['1-load.png', '2-pick.png', '3-detail.png', 'page.txt'];
    const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const headerLength = pngHeader.length;

    // ACT
    const views = await captureViews(browser, file, dir);
    const after = readFileSync(file);
    const headers = views.files
      .filter((file) => file.endsWith('.png'))
      .map((file) => readFileSync(path.join(dir, file)).subarray(0, headerLength));
    const text = readFileSync(path.join(dir, 'page.txt'), 'utf8');

    // ASSERT
    expect(views.files).toEqual(expectedFiles);
    expect(views.notes).toEqual([]);
    expect(headers).toEqual([pngHeader, pngHeader, pngHeader]);
    expect(views.pageText).toContain(heading);
    expect(text).toBe(views.pageText);
    expect(after).toEqual(before);
  });
});

describe('failure cases', () => {
  it('rejects a missing page without writing views', async () => {
    // ARRANGE
    const missing = path.join(dir, 'absent.html');
    const before = readdirSync(dir);
    const expected = /ERR_FILE_NOT_FOUND/;

    // ACT
    const capture = captureViews(browser, missing, dir);

    // ASSERT
    await expect(capture).rejects.toThrow(expected);
    expect(readdirSync(dir)).toEqual(before);
  });
});

describe('edge cases', () => {
  it('records an explain page without inventing a pick view', async () => {
    // ARRANGE
    const file = path.resolve(import.meta.dirname, '../../scripts/fixtures/valid-explain.html');
    const expectedFiles = ['1-load.png', 'page.txt'];
    const expectedNotes = [
      '2-pick.png left out: no item has a choice control',
      '3-detail.png left out: no item has detail to open',
    ];

    // ACT
    const views = await captureViews(browser, file, dir);

    // ASSERT
    expect(views.files).toEqual(expectedFiles);
    expect(views.notes).toEqual(expectedNotes);
  });
});

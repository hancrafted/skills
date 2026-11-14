// What the judge and the reader see of a page, in the ArtifactsBench style: three screenshots at desktop width (on
// load, after a pick, in the detailed view) and the page's visible text. The page loads offline, as the mechanical
// grader loads it. A view the page cannot give (an explain page has nothing to pick) is left out and noted.
import type { Browser, Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { openOffline, VIEWPORTS } from '../../scripts/grader/run.ts';
import { VIEW_FILES } from './quality.pure.ts';

/** How many screenshots a page that never holds still, such as an endless script animation, gets to settle. */
const MAX_SHOTS = 10;

export interface Views {
  /** The files written into the folder, in VIEW_FILES order. */
  readonly files: readonly string[];
  readonly pageText: string;
  /** Why a view is missing. */
  readonly notes: readonly string[];
}

/**
 * Picks in the first item that has a choice control, preferring its recommended Option, the way a reviewer accepting
 * the recommendation would. Returns false when no item has one.
 */
function pick(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    // A pick is a radio, checkbox, select or toggle button (aria-pressed). A reviewer tool names what it changes with
    // aria-controls and picks nothing (checks/explain-controls.ts).
    const controls =
      ':is(input[type="radio"], input[type="checkbox"], select, button[aria-pressed]):not([aria-controls])';
    const item = [...document.querySelectorAll('[data-item]')].find((candidate) => candidate.querySelector(controls));
    if (item === undefined) return false;
    const control =
      item.querySelector<HTMLElement>(`[data-option][data-recommended="true"] :is(${controls})`) ??
      item.querySelector<HTMLElement>(controls)!;
    if (control instanceof HTMLSelectElement) {
      const choice = [...control.options].find((option) => option.value !== '' && !option.selected);
      if (choice !== undefined) control.value = choice.value;
      control.dispatchEvent(new Event('change', { bubbles: true }));
    } else control.click();
    item.scrollIntoView({ block: 'start', behavior: 'instant' });
    return true;
  });
}

/** Opens every depth toggle and disclosure, then scrolls to the first item with detail. False when none has any. */
function openDetail(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    for (const toggle of document.querySelectorAll<HTMLElement>('[data-depth-toggle]')) toggle.click();
    for (const details of document.querySelectorAll('details')) details.open = true;
    const detailed =
      document.querySelector('[data-depth="both"], [data-depth="detailed"]') ?? document.querySelector('details');
    detailed?.scrollIntoView({ block: 'start', behavior: 'instant' });
    return detailed !== null;
  });
}

/**
 * A screenshot of the page at rest: CSS and Web Animations jump to their end, and script-driven motion, which they do
 * not cover, has stopped once two shots in a row match.
 */
async function stillShot(page: Page): Promise<Buffer> {
  let last = await page.screenshot({ animations: 'disabled' });
  for (let shot = 1; shot < MAX_SHOTS; shot++) {
    const next = await page.screenshot({ animations: 'disabled' });
    if (next.equals(last)) break;
    last = next;
  }
  return last;
}

/** Writes the views of `pageFile` into `dir`. */
export async function captureViews(browser: Browser, pageFile: string, dir: string): Promise<Views> {
  const { page } = await openOffline(browser, pageFile, VIEWPORTS[0]);
  const files: string[] = [];
  const notes: string[] = [];
  const shoot = async (file: string) => {
    writeFileSync(path.join(dir, file), await stillShot(page));
    files.push(file);
  };
  try {
    await shoot(VIEW_FILES.load.file);
    if (await pick(page)) await shoot(VIEW_FILES.pick.file);
    else notes.push(`${VIEW_FILES.pick.file} left out: no item has a choice control`);
    if (await openDetail(page)) await shoot(VIEW_FILES.detail.file);
    else notes.push(`${VIEW_FILES.detail.file} left out: no item has detail to open`);
    const pageText = await page.evaluate(() => document.body.innerText);
    writeFileSync(path.join(dir, VIEW_FILES.text.file), pageText);
    files.push(VIEW_FILES.text.file);
    return { files, pageText, notes };
  } finally {
    await page.context().close();
  }
}

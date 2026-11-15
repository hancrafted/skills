// Browser steps the feedback checks share: find and type the comment, stand in for the clipboard, press Save.
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { COMMENT, COMMENT_MARK } from './feedback.pure.ts';

/**
 * The comment the checks type into: the first editable one on an item, usually an Option's comment, or the Questions
 * field of an explain page.
 */
export const COMMENT_FIELD = ':is([data-item], [data-questions]) textarea:not([readonly], [disabled])';
/**
 * The ceiling for a control to show its outcome. Every wait below ends as soon as the outcome shows (a clipboard
 * write, a download, a status message); only a page that never shows one waits this long.
 */
const OUTCOME_TIMEOUT_MS = 1500;

export interface Identity {
  readonly pageId: string;
  readonly revision: string;
}

export const identityOf = (page: Page): Promise<Identity> =>
  page.evaluate(() => ({
    pageId: document.documentElement.getAttribute('data-page-id') ?? '',
    revision: document.documentElement.getAttribute('data-revision') ?? '',
  }));

export const countOf = (page: Page, selector: string): Promise<number> => page.locator(selector).count();

export const commentField = (page: Page) => page.locator(COMMENT_FIELD).first();

/** Types the comment key by key, as a reviewer would; returns what the field then holds, or null with no field. */
export async function typeComment(page: Page): Promise<string | null> {
  const field = commentField(page);
  if ((await field.count()) === 0) return null;
  await field.click();
  await field.pressSequentially(COMMENT);
  return field.inputValue();
}

/**
 * Replaces the clipboard: `accept` keeps what the page writes in `window.__graderClipboard`; `reject` refuses every
 * write, as a browser that denies clipboard access does, the legacy `execCommand('copy')` route included.
 */
export async function standInClipboard(page: Page, outcome: 'accept' | 'reject'): Promise<void> {
  await page.evaluate((accept) => {
    const writeText = async (text: string): Promise<void> => {
      if (!accept) throw new DOMException('The grader denied clipboard access', 'NotAllowedError');
      (window as unknown as { __graderClipboard?: string }).__graderClipboard = text;
    };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    if (!accept) document.execCommand = () => false;
  }, outcome === 'accept');
}

/** Clicks Copy prompt; returns what reached the stand-in clipboard, or null when nothing did. */
export async function copyPrompt(page: Page): Promise<string | null> {
  await page.locator('[data-copy-prompt]').click();
  try {
    const written = await page.waitForFunction(
      () => (window as unknown as { __graderClipboard?: string }).__graderClipboard,
      undefined,
      { timeout: OUTCOME_TIMEOUT_MS },
    );
    return (await written.jsonValue()) as string;
  } catch {
    return null;
  }
}

export interface Download {
  readonly filename: string;
  readonly text: string;
}

/** Clicks Save; returns the download it started, read as UTF-8, or null when none started. */
export async function save(page: Page): Promise<Download | null> {
  try {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: OUTCOME_TIMEOUT_MS }),
      page.locator('[data-save]').click(),
    ]);
    return { filename: download.suggestedFilename(), text: await readFile(await download.path(), 'utf8') };
  } catch {
    return null;
  }
}

/** Where the page reports outcomes. */
export const STATUS = '[role="status"], [role="alert"], [aria-live]';

/** Empties every status message, so the next one read is the page's answer to the next action. */
export async function clearStatus(page: Page): Promise<void> {
  await page.evaluate((selector) => {
    for (const region of document.querySelectorAll(selector)) region.textContent = '';
  }, STATUS);
}

/** The status the page shows once it reports something, or '' when it reports nothing in time. */
export async function awaitStatus(page: Page): Promise<string> {
  const read = (selector: string): string =>
    [...document.querySelectorAll(selector)]
      .map((region) => region.textContent?.trim() ?? '')
      .filter(Boolean)
      .join(' ');
  try {
    await page.waitForFunction(read, STATUS, { timeout: OUTCOME_TIMEOUT_MS });
  } catch {
    return '';
  }
  return page.evaluate(read, STATUS);
}

/** True when the comment field still holds the typed comment. */
export const fieldKept = async (page: Page): Promise<boolean> => (await commentField(page).inputValue()) === COMMENT;

/** Puts the comment back when a path lost it, so each path starts from the same input. */
export async function restoreComment(page: Page): Promise<void> {
  if (!(await fieldKept(page))) await commentField(page).fill(COMMENT);
}

/** True when a localStorage entry whose key names the page id holds the comment. */
export const draftKept = (page: Page, pageId: string): Promise<boolean> =>
  page.evaluate(
    ({ pageId, comment }) => {
      const encoded = JSON.stringify(comment).slice(1, -1);
      try {
        return Object.keys(localStorage)
          .filter((key) => key.includes(pageId))
          .some((key) => {
            const value = localStorage.getItem(key) ?? '';
            return value.includes(comment) || value.includes(encoded);
          });
      } catch {
        return false;
      }
    },
    { pageId, comment: COMMENT },
  );

/** True when a visible field or block other than the comment shows the handoff, for copying by hand. */
export const fallbackShown = (page: Page): Promise<boolean> =>
  page.evaluate(
    ({ mark, field }) => {
      const typedInto = document.querySelector(field);
      return [...document.querySelectorAll<HTMLElement>('textarea, pre, output, [contenteditable]')]
        .filter((element) => element !== typedInto && element.checkVisibility())
        .map((element) => (element instanceof HTMLTextAreaElement ? element.value : (element.textContent ?? '')))
        .some((text) => text.includes(mark));
    },
    { mark: COMMENT_MARK, field: COMMENT_FIELD },
  );

/** Makes building a download fail, as a browser that refuses it would. */
export async function breakSave(page: Page): Promise<void> {
  await page.evaluate(() => {
    URL.createObjectURL = () => {
      throw new DOMException('The grader refused the download', 'SecurityError');
    };
  });
}

/** Clicks Reset all and answers its confirm() with `accept`; true when the page asked. */
export async function resetAll(page: Page, accept: boolean): Promise<boolean> {
  let asked = false;
  page.once('dialog', (dialog) => {
    asked = true;
    void (accept ? dialog.accept() : dialog.dismiss());
  });
  await page.locator('[data-reset-all]').click();
  return asked;
}

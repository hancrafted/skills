// Failure never costs input or tells a false success. With a comment typed, a denied clipboard, a refused download
// and, on a decide page, a cancelled Reset all each leave the field and its draft intact, and each failure reports
// something other than that control's success message. A failed copy or save also shows the prompt for copying by
// hand. An explain page has no Reset all, because it has no picks or Next action to restore.
import type { Page } from '@playwright/test';
import type { Check } from '../grader/check.ts';
import { controlProblem } from '../grader/feedback.pure.ts';
import {
  awaitStatus,
  breakSave,
  clearStatus,
  commentField,
  copyPrompt,
  countOf,
  draftKept,
  fallbackShown,
  fieldKept,
  identityOf,
  resetAll,
  restoreComment,
  save,
  standInClipboard,
  STATUS,
  typeComment,
} from '../grader/feedback.ts';

/** What one failure left behind. */
export interface FailedPath {
  readonly fieldKept: boolean;
  readonly draftKept: boolean;
  /** The status the failure reported; '' when it reported nothing. */
  readonly status: string;
  /** Whether the prompt is shown for copying by hand. */
  readonly fallback: boolean;
}

export interface FailuresObservation {
  readonly controls: {
    /** Without a comment field there is no input to keep; export and explain-controls report it. */
    readonly comment: boolean;
    readonly copy: number;
    readonly save: number;
    /** null on an explain page. */
    readonly resetAll: number | null;
    readonly status: number;
  };
  /** Whether typing the comment stored a draft under a key naming the page id. */
  readonly draftStored: boolean;
  /** Each path also records the status its success reported, to tell a failure apart from a false success. */
  readonly copy: FailedPath & { readonly success: string };
  readonly save: FailedPath & { readonly success: string; readonly downloaded: boolean };
  /** null on an explain page. */
  readonly reset:
    (FailedPath & { readonly success: string; readonly asked: boolean; readonly clearedOnConfirm: boolean }) | null;
}

/** Clears the status, runs the failing action, and records what it left behind. */
async function afterFailure(page: Page, pageId: string, fail: () => Promise<unknown>): Promise<FailedPath> {
  await restoreComment(page);
  await clearStatus(page);
  await fail();
  return {
    status: await awaitStatus(page),
    fieldKept: await fieldKept(page),
    draftKept: await draftKept(page, pageId),
    fallback: await fallbackShown(page),
  };
}

/** Runs the action that should succeed and returns the status it reported. */
async function afterSuccess(page: Page, succeed: () => Promise<unknown>): Promise<string> {
  await restoreComment(page);
  await clearStatus(page);
  await succeed();
  return awaitStatus(page);
}

type Observed = Omit<FailuresObservation, 'controls'>;

async function copyPath(page: Page, pageId: string): Promise<Observed['copy']> {
  await standInClipboard(page, 'accept');
  const success = await afterSuccess(page, () => copyPrompt(page));
  await standInClipboard(page, 'reject');
  return { ...(await afterFailure(page, pageId, () => page.locator('[data-copy-prompt]').click())), success };
}

async function savePath(page: Page, pageId: string): Promise<Observed['save']> {
  const success = await afterSuccess(page, () => save(page));
  await breakSave(page);
  // A download starts on the click itself, so listening while the status settles is enough; no timeout to wait out.
  let downloaded = false;
  const onDownload = (): void => void (downloaded = true);
  page.on('download', onDownload);
  const failed = await afterFailure(page, pageId, () => page.locator('[data-save]').click());
  page.off('download', onDownload);
  return { ...failed, success, downloaded };
}

async function resetPath(page: Page, pageId: string): Promise<NonNullable<Observed['reset']>> {
  let asked = false;
  const failed = await afterFailure(page, pageId, async () => (asked = await resetAll(page, false)));
  const success = await afterSuccess(page, () => resetAll(page, true));
  return { ...failed, success, asked, clearedOnConfirm: !(await fieldKept(page)) };
}

async function observePaths(page: Page, pageId: string, decide: boolean): Promise<Observed> {
  await typeComment(page);
  const draftStored = await draftKept(page, pageId);
  const copy = await copyPath(page, pageId);
  const saved = await savePath(page, pageId);
  return { draftStored, copy, save: saved, reset: decide ? await resetPath(page, pageId) : null };
}

const BLANK: FailedPath & { success: string } = {
  fieldKept: false,
  draftKept: false,
  status: '',
  fallback: false,
  success: '',
};

/** What a page without the controls to exercise yields; `judge` then reports only the missing controls. */
const unexercised = (decide: boolean): Observed => ({
  draftStored: false,
  copy: BLANK,
  save: { ...BLANK, downloaded: false },
  reset: decide ? { ...BLANK, asked: false, clearedOnConfirm: false } : null,
});

function controlProblems({ controls }: FailuresObservation): string[] {
  return [
    ...controlProblem('[data-copy-prompt]', controls.copy),
    ...controlProblem('[data-save]', controls.save),
    ...(controls.resetAll === null ? [] : controlProblem('[data-reset-all]', controls.resetAll)),
    ...(controls.status > 0 ? [] : ['no status message: expected an element with role="status" or aria-live']),
  ];
}

/** A failure may stay silent (when `silentAllowed`), but never repeat its success message. */
function statusProblems(
  name: string,
  { status, success }: { status: string; success: string },
  silentAllowed: boolean,
) {
  if (status === '') return silentAllowed ? [] : [`${name} reported nothing; say that it failed`];
  return status === success ? [`${name} reported the success message "${success}"`] : [];
}

/** What a failure of `name` must not do: lose input, or report nothing or success. */
function pathProblems(name: string, path: FailedPath & { success: string }, silentAllowed = false): string[] {
  return [
    ...(path.fieldKept ? [] : [`after ${name} the comment field lost its text`]),
    ...(path.draftKept ? [] : [`after ${name} the draft lost the comment`]),
    ...statusProblems(name, path, silentAllowed),
  ];
}

function resetProblems(reset: NonNullable<FailuresObservation['reset']>): string[] {
  return [
    ...(reset.asked ? [] : ['Reset all asked for no confirmation; ask with confirm() first']),
    ...pathProblems('a cancelled Reset all', reset, true),
    ...(reset.clearedOnConfirm ? [] : ['a confirmed Reset all left the comment in place']),
  ];
}

const fallbackProblem = (name: string, path: FailedPath): string[] =>
  path.fallback ? [] : [`after ${name} the page shows no prompt to copy by hand`];

export const check: Check<FailuresObservation> = {
  id: 'failures',
  summary:
    'A denied copy, a refused save and a cancelled Reset all keep the comment and its draft and report no false success.',
  async observe({ page, mode }) {
    const { pageId } = await identityOf(page);
    const decide = mode !== 'explain';
    const controls = {
      comment: (await commentField(page).count()) > 0,
      copy: await countOf(page, '[data-copy-prompt]'),
      save: await countOf(page, '[data-save]'),
      resetAll: decide ? await countOf(page, '[data-reset-all]') : null,
      status: await countOf(page, STATUS),
    };
    const ready =
      controls.comment && [controls.copy, controls.save, controls.status, controls.resetAll].every((n) => n !== 0);
    return { controls, ...(ready ? await observePaths(page, pageId, decide) : unexercised(decide)) };
  },
  judge(observation) {
    const controls = controlProblems(observation);
    if (controls.length > 0 || !observation.controls.comment) return controls;
    const { draftStored, copy, save, reset } = observation;
    return [
      ...(draftStored
        ? []
        : ['the typed comment was not kept as a draft in localStorage under a key naming the page id']),
      ...pathProblems('a failed copy', copy),
      ...fallbackProblem('a failed copy', copy),
      ...pathProblems('a failed save', save),
      ...fallbackProblem('a failed save', save),
      ...(save.downloaded
        ? ['Save still downloaded when URL.createObjectURL threw; build the file as a Blob behind an object URL']
        : []),
      ...(reset === null ? [] : resetProblems(reset)),
    ];
  },
};

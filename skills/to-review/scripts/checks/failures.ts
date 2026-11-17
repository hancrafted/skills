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

export interface FailedPath {
  readonly fieldKept: boolean;
  readonly draftKept: boolean;
  readonly status: string;
  readonly fallback: boolean;
}

export interface FailuresObservation {
  readonly controls: {
    readonly comment: boolean;
    readonly copy: number;
    readonly save: number;
    readonly resetAll: number | null;
    readonly status: number;
  };
  readonly draftStored: boolean;
  readonly copy: FailedPath & { readonly success: string };
  readonly save: FailedPath & { readonly success: string; readonly downloaded: boolean };
  readonly reset:
    (FailedPath & { readonly success: string; readonly asked: boolean; readonly clearedOnConfirm: boolean }) | null;
}

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

function statusProblems(
  name: string,
  { status, success }: { status: string; success: string },
  silentAllowed: boolean,
) {
  if (status === '') return silentAllowed ? [] : [`${name} reported nothing; say that it failed`];
  return status === success ? [`${name} reported the success message "${success}"`] : [];
}

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

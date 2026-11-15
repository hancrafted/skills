// A comment survives the round trip: typed into the page (an item's comment, or explain's Questions field), it comes
// back byte-identical through Copy prompt and through the Save download, which is named `<page-id>-r<N>-feedback.md`,
// and both carry the same handoff. Applies to both modes; nothing here needs a Next action.
import type { Check } from '../grader/check.ts';
import { carriesComment, COMMENT, controlProblem, feedbackFilename } from '../grader/feedback.pure.ts';
import {
  commentField,
  copyPrompt,
  countOf,
  identityOf,
  save,
  standInClipboard,
  typeComment,
  type Download,
} from '../grader/feedback.ts';

export interface ExportObservation {
  readonly mode: string | null;
  readonly pageId: string;
  readonly revision: string;
  readonly controls: { readonly comment: boolean; readonly copy: number; readonly save: number };
  /** What the comment field held after typing; null without a field. */
  readonly typed: string | null;
  /** What Copy prompt wrote to the clipboard; null when it wrote nothing. */
  readonly copied: string | null;
  /** What Save downloaded; null when no download started. */
  readonly download: Download | null;
}

/** On an explain page explain-controls reports a missing Questions field; here it only ends the check. */
function controlProblems({ controls, mode }: ExportObservation): string[] {
  return [
    ...(controls.comment || mode === 'explain'
      ? []
      : ['no comment field: expected an editable <textarea> inside a [data-item] or [data-questions]']),
    ...controlProblem('[data-copy-prompt]', controls.copy),
    ...controlProblem('[data-save]', controls.save),
  ];
}

function copyProblems(copied: string | null): string[] {
  if (copied === null) return ['Copy prompt wrote nothing to the clipboard'];
  return carriesComment(copied) ? [] : ['Copy prompt did not carry the typed comment byte-identical'];
}

/** `expectedName` is null without a page id, which page-attributes reports. */
function saveProblems(download: Download | null, expectedName: string | null): string[] {
  if (download === null) return ['Save started no download'];
  return [
    ...(expectedName === null || download.filename === expectedName
      ? []
      : [`Save downloaded "${download.filename}"; expected "${expectedName}"`]),
    ...(carriesComment(download.text) ? [] : ['the Save download did not carry the typed comment byte-identical']),
  ];
}

function handoffProblems({ pageId, copied, download }: ExportObservation): string[] {
  if (copied === null || download === null) return [];
  if (copied !== download.text) return ['Copy prompt and Save carry different text; both must carry the same handoff'];
  return pageId === '' || copied.includes(pageId) ? [] : [`the handoff does not name the page id "${pageId}"`];
}

export const check: Check<ExportObservation> = {
  id: 'export',
  summary:
    'A multiline non-ASCII comment comes back byte-identical through Copy prompt and the Save download, which is named <page-id>-r<N>-feedback.md.',
  async observe({ page, mode }) {
    const { pageId, revision } = await identityOf(page);
    const controls = {
      comment: (await commentField(page).count()) > 0,
      copy: await countOf(page, '[data-copy-prompt]'),
      save: await countOf(page, '[data-save]'),
    };
    if (!controls.comment || controls.copy !== 1 || controls.save !== 1)
      return { mode, pageId, revision, controls, typed: null, copied: null, download: null };
    await standInClipboard(page, 'accept');
    const typed = await typeComment(page);
    return { mode, pageId, revision, controls, typed, copied: await copyPrompt(page), download: await save(page) };
  },
  judge(observation) {
    const controls = controlProblems(observation);
    if (controls.length > 0 || !observation.controls.comment) return controls;
    const { pageId, revision, typed, copied, download } = observation;
    return [
      ...(typed === COMMENT ? [] : ['the comment field holds different text from what was typed into it']),
      ...copyProblems(copied),
      ...saveProblems(download, pageId === '' ? null : feedbackFilename(pageId, revision)),
      ...handoffProblems(observation),
    ];
  },
};

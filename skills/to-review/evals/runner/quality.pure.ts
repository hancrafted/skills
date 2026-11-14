// What the checklist judge and the reader probe share: the views both see, how a prompt template is filled, how a
// quoted piece of evidence is checked against the page text, and how a grader that never answered fails its items.
import type { Expectation } from './grading.pure.ts';

/** Where in a frozen case input an item or answer key comes from: the file and a verbatim quote of it. */
export interface Source {
  readonly file: string;
  readonly quote: string;
}

/**
 * A checklist item's source when it is a rule a person set in a session rather than text a run sees: the session, the
 * feedback round and a verbatim quote of the person's words, held in the case's `rounds.md`, which a run never sees.
 */
export interface Ruling {
  readonly session: string;
  readonly round: number;
  readonly quote: string;
}

/** What the judge and the reader see of a page: three screenshots and its text, named as they are in their folder. */
export const VIEW_FILES = {
  load: { file: '1-load.png', about: 'the page as it opens, at desktop width' },
  pick: { file: '2-pick.png', about: 'the page after a pick in its first item with choices' },
  detail: { file: '3-detail.png', about: 'the detailed view: depth toggles and disclosures opened' },
  text: { file: 'page.txt', about: "the page's visible text, with its detail opened" },
} as const;

/** What a view file shows, in a sentence that completes "the file holds ...". */
export const aboutFile = (file: string) =>
  Object.values(VIEW_FILES).find((view) => view.file === file)?.about ?? 'part of the page';

/** Fills a prompt template's `{{name}}` slots, `{{files}}` with the file list; an unfilled slot throws. */
export function fillPrompt(
  template: string,
  files: readonly string[],
  slots: Readonly<Record<string, string>>,
): string {
  const values: Record<string, string> = {
    files: files.map((file) => `- \`${file}\`: ${aboutFile(file)}`).join('\n'),
    ...slots,
  };
  return template.replace(/\{\{(\w+)\}\}/g, (slot, name: string) => {
    if (!(name in values)) throw new Error(`the prompt template has no value for ${slot}`);
    return values[name];
  });
}

const squash = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * The quote as evidence, flagged when the page text does not hold it: it may come from a screenshot (SVG or
 * canvas text), or be invented. The flag informs; it never changes a verdict.
 */
export function quoted(quote: string, pageText: string): string {
  if (quote.trim() === '') return '';
  const found = squash(pageText).includes(squash(quote));
  return `"${quote}"${found ? '' : ' (not in the page text; seen in a screenshot or invented)'}`;
}

/** Every item failed for one reason, such as a judge that never answered; `kind` is `judge` or `probe`. */
export function failAll(
  kind: 'judge' | 'probe',
  items: readonly { id: string; question: string }[],
  reason: string,
): Expectation[] {
  return items.map(({ id, question }) => ({ text: `${kind} ${id}: ${question}`, passed: false, evidence: reason }));
}

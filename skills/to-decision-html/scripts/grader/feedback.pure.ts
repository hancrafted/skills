// What the feedback checks type and look for: one fixed comment, and whether a handoff carries it unchanged.

/**
 * The comment the feedback checks type: several lines, indentation, quotes, markup, a code fence and text outside
 * ASCII, so any trimming, escaping or re-encoding on the way to the handoff shows. Only `\n` line breaks, because a
 * <textarea> normalizes every other one to `\n`.
 */
export const COMMENT = [
  'Zeile 1: „Grüße" — naïve café, 日本語, ½ & <b>markup</b>',
  "  indented line with `backticks` and 'single' quotes",
  '```',
  'a fence inside the comment',
  '```',
  'last line 🙂',
].join('\n');

/** A run of the comment that no escaping or whitespace change alters: where it shows, the handoff shows. */
export const COMMENT_MARK = 'naïve café, 日本語';

/** True when the text holds the comment byte-identical: verbatim, or as a JSON string written by JSON.stringify. */
export const carriesComment = (text: string): boolean =>
  text.includes(COMMENT) || text.includes(JSON.stringify(COMMENT).slice(1, -1));

/** The fixed name Save downloads under. */
export const feedbackFilename = (pageId: string, revision: string): string => `${pageId}-r${revision}-feedback.md`;

/** One problem when a feedback control is not on the page exactly once. */
export function controlProblem(selector: string, count: number): string[] {
  return count === 1 ? [] : [`the page has ${count} ${selector}; expected exactly one`];
}

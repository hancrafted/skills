export const COMMENT = [
  'Zeile 1: „Grüße" — naïve café, 日本語, ½ & <b>markup</b>',
  "  indented line with `backticks` and 'single' quotes",
  '```',
  'a fence inside the comment',
  '```',
  'last line 🙂',
].join('\n');

export const COMMENT_MARK = 'naïve café, 日本語';

export const carriesComment = (text: string): boolean =>
  text.includes(COMMENT) || text.includes(JSON.stringify(COMMENT).slice(1, -1));

export const feedbackFilename = (pageId: string, revision: string): string => `${pageId}-r${revision}-feedback.md`;

export function controlProblem(selector: string, count: number): string[] {
  return count === 1 ? [] : [`the page has ${count} ${selector}; expected exactly one`];
}

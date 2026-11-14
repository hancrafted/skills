// An explain page's controls: settled decisions rendered without pick controls, though reviewer tools may stay, with
// open reflection prompts and a "Questions?" comment field.
import { load, type CheerioAPI } from 'cheerio';
import type { Check } from '../grader/check.ts';

/** The decide page's hooks for choosing: an Option, and the Next action. Present at all, they offer a pick. */
const PICK_HOOKS = ['[data-option]', '[data-next-action]'] as const;
const CHOICE_INPUTS = ['input[type="radio"]', 'input[type="checkbox"]', 'select'] as const;
/**
 * A choice input is a pick when it answers an item: it sits inside one and names no element it changes. A reviewer
 * tool (a theme select in the header, a show/hide toggle with `aria-controls`) changes the view and answers nothing.
 */
const RESPONSE_SCOPE = ':is([data-item], [data-option], [data-next-action]) ';
const RESPONSE = ':not([aria-controls])';

function pickProblems($: CheerioAPI): string[] {
  const counted = [
    ...CHOICE_INPUTS.map((input) => [input, $(`${RESPONSE_SCOPE}${input}${RESPONSE}`).length] as const),
    ...PICK_HOOKS.map((hook) => [hook, $(hook).length] as const),
  ];
  const found = counted.filter(([, count]) => count > 0).map(([selector, count]) => `${count} ${selector}`);
  return found.length === 0
    ? []
    : [`the page offers pick controls (${found.join(', ')}); an explain page renders settled decisions without picks`];
}

function exactlyOne($: CheerioAPI, selector: string): string[] {
  const count = $(selector).length;
  return count === 1 ? [] : [`the page has ${count} ${selector}; expected exactly one`];
}

function reflectionProblems($: CheerioAPI): string[] {
  const reflection = $('[data-reflection]');
  if (reflection.length !== 1) return exactlyOne($, '[data-reflection]');
  const asks = reflection
    .find('*')
    .addBack()
    .toArray()
    .some((node) => $(node).text().trim().endsWith('?'));
  return asks ? [] : ['[data-reflection] asks no open question; expected prompts ending in "?"'];
}

function questionsProblems($: CheerioAPI): string[] {
  const questions = $('[data-questions]');
  if (questions.length !== 1) return exactlyOne($, '[data-questions]');
  const editable = questions.find('textarea:not([readonly]):not([disabled])').length;
  return editable > 0 ? [] : ["[data-questions] holds no editable <textarea> for the reader's questions"];
}

export const check: Check<string> = {
  id: 'explain-controls',
  summary: 'The page offers no pick controls and has one reflection block of open questions and one Questions field.',
  modes: ['explain'],
  observe: (loaded) => loaded.html,
  judge(html) {
    const $ = load(html);
    return [...pickProblems($), ...reflectionProblems($), ...questionsProblems($)];
  },
};

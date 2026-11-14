// A decide page's controls: one recommended Option per item with Options, a Next action to choose, and a
// "Before you approve" reflection block of open questions above it.
import { load, type CheerioAPI } from 'cheerio';
import type { Check } from '../grader/check.ts';

function recommendationProblems($: CheerioAPI): string[] {
  return $('[data-item]')
    .toArray()
    .filter((item) => $(item).find('[data-option]').length > 0)
    .map((item) => [$(item).attr('data-item'), $(item).find('[data-option][data-recommended="true"]').length] as const)
    .filter(([, recommended]) => recommended !== 1)
    .map(
      ([id, recommended]) => `item "${id}" recommends ${recommended} Options; mark exactly one data-recommended="true"`,
    );
}

function exactlyOne($: CheerioAPI, selector: string): string[] {
  const count = $(selector).length;
  return count === 1 ? [] : [`the page has ${count} ${selector}; expected exactly one`];
}

function nextActionProblems($: CheerioAPI): string[] {
  const next = $('[data-next-action]');
  if (next.length !== 1) return exactlyOne($, '[data-next-action]');
  const choices = next.find('select, input[type="radio"]').addBack('select').length;
  return choices > 0 ? [] : ['[data-next-action] holds no <select> or radio input to choose the action'];
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

/** The reflection block must come before the Next action in reading order. */
function orderProblems($: CheerioAPI): string[] {
  const [reflection, next] = [$('[data-reflection]'), $('[data-next-action]')];
  if (reflection.length !== 1 || next.length !== 1) return [];
  const all = $('*').toArray();
  return all.indexOf(reflection[0]) < all.indexOf(next[0])
    ? []
    : ['[data-reflection] sits below [data-next-action]; put it above'];
}

export const check: Check<string> = {
  id: 'decide-controls',
  summary:
    'Each item with Options recommends exactly one; the page has one Next action with a "Before you approve" reflection block above it.',
  modes: ['decide'],
  observe: (loaded) => loaded.html,
  judge(html) {
    const $ = load(html);
    return [...recommendationProblems($), ...nextActionProblems($), ...reflectionProblems($), ...orderProblems($)];
  },
};

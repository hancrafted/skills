import { load, type CheerioAPI } from 'cheerio';
import type { Check } from '../grader/check.ts';

type Selection = ReturnType<CheerioAPI>;

const VISUAL_SELECTOR = 'svg, img, canvas';
const MINIMUM_STEPS_COUNT = 2;
const SIDES = ['before', 'after'] as const;
const WRAPPERS = 'ol, ul, div, section';

type Side = (typeof SIDES)[number];

function stepsOf(side: Selection): Selection {
  let steps = side.children();
  while (steps.length === 1 && steps.is(WRAPPERS)) steps = steps.children();
  return steps;
}

const holdsVisual = (side: Selection): boolean =>
  side.is(VISUAL_SELECTOR) || side.find(VISUAL_SELECTOR).length > 0 || stepsOf(side).length >= MINIMUM_STEPS_COUNT;

function optionProblems(option: Selection): string[] {
  const id = option.attr('data-option');
  const found = (side: Side): Selection => option.find(`[data-${side}]`).addBack(`[data-${side}]`);
  return SIDES.flatMap((side) => {
    const other = SIDES.find((candidate) => candidate !== side) as Side;
    const marked = found(side);
    if (marked.length > 0 && found(other).length === 0)
      return [`Option "${id}" has data-${side} but no data-${other}; give both or neither`];
    return [];
  }).concat(
    SIDES.flatMap((side) => {
      const marked = found(side);
      return marked.length > 0 && !holdsVisual(marked)
        ? [`Option "${id}" data-${side} holds no visual; use an svg, img, canvas or at least two steps`]
        : [];
    }),
  );
}

export const check: Check<string> = {
  id: 'before-after',
  summary:
    'An Option with data-before or data-after has both, and each holds an svg, img, canvas or at least two steps.',
  observe: (loaded) => loaded.html,
  judge(html) {
    const $ = load(html);
    return $('[data-option]')
      .toArray()
      .flatMap((option) => optionProblems($(option)));
  },
};

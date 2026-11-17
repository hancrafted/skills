import { load, type CheerioAPI } from 'cheerio';
import type { Check } from '../grader/check.ts';

type Selection = ReturnType<CheerioAPI>;

const VISUAL_SELECTOR = 'svg, img, canvas';
const STEP_SELECTOR = 'li';
const MINIMUM_STEPS_COUNT = 2;
const SIDES = ['before', 'after'] as const;

const holdsVisual = (side: Selection): boolean =>
  side.is(VISUAL_SELECTOR) ||
  side.find(VISUAL_SELECTOR).length > 0 ||
  side.find(STEP_SELECTOR).length >= MINIMUM_STEPS_COUNT;

function optionProblems(option: Selection): string[] {
  const id = option.attr('data-option');
  const found = (side: (typeof SIDES)[number]): Selection => option.find(`[data-${side}]`).addBack(`[data-${side}]`);
  const [before, after] = [found('before'), found('after')];
  const pairing: string[] = [];
  if (before.length > 0 && after.length === 0)
    pairing.push(`Option "${id}" has data-before but no data-after; give both or neither`);
  if (after.length > 0 && before.length === 0)
    pairing.push(`Option "${id}" has data-after but no data-before; give both or neither`);
  const visuals = SIDES.flatMap((side) => {
    const marked = found(side);
    return marked.length > 0 && !holdsVisual(marked)
      ? [`Option "${id}" data-${side} holds no visual; use an svg, img, canvas or at least two steps`]
      : [];
  });
  return [...pairing, ...visuals];
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

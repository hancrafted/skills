// No horizontal scroll and no text overflow: the page is no wider than its viewport, and no box hides or spills
// its text. A box made to scroll its own content (overflow auto or scroll) is a deliberate choice and passes.
import type { Check } from '../grader/check.ts';
import { describeElement, type ElementFacts } from '../grader/element.pure.ts';
import { inPage, type Kit } from '../grader/in-page.ts';

interface Box {
  readonly facts: ElementFacts;
  readonly overflowX: string;
  readonly overflowY: string;
  readonly scrollWidth: number;
  readonly clientWidth: number;
  readonly scrollHeight: number;
  readonly clientHeight: number;
}

interface Observation {
  readonly page: { readonly scrollWidth: number; readonly clientWidth: number };
  /** The innermost text-bearing boxes whose content is larger than the box, in document order. */
  readonly boxes: readonly Box[];
}

/** Sub-pixel layout rounds; a pixel of excess is noise, not overflow. */
const TOLERANCE = 1;
const SCROLLS = new Set(['auto', 'scroll']);
const HIDES = new Set(['hidden', 'clip']);

function sideways({ facts, overflowX, scrollWidth, clientWidth }: Box): string | null {
  const excess = scrollWidth - clientWidth;
  if (excess <= TOLERANCE || SCROLLS.has(overflowX)) return null;
  const how = HIDES.has(overflowX) ? 'hides' : 'spills';
  const where = HIDES.has(overflowX) ? 'sideways' : 'past its box sideways';
  return `${describeElement(facts)} ${how} ${excess}px of its content ${where}; let it wrap`;
}

function downwards({ facts, overflowY, scrollHeight, clientHeight }: Box): string | null {
  const excess = scrollHeight - clientHeight;
  if (excess <= TOLERANCE || SCROLLS.has(overflowY)) return null;
  const how = HIDES.has(overflowY) ? 'hides' : 'spills';
  return `${describeElement(facts)} ${how} ${excess}px of its content below its box; let the box grow`;
}

/** Runs in the page: every rendered box holding text whose content outgrows it, innermost only. */
function overflowingBoxes(kit: Kit): Box[] {
  const SKIP = 'html, body, svg, svg *, textarea, input, select, option, script, style, [hidden]';
  const over = (el: Element) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
  const candidates = [...document.querySelectorAll('body *')].filter((el) => {
    if (el.matches(SKIP) || !el.textContent?.trim()) return false;
    // An unrendered, collapsed or visually-hidden (1px) box shows no text to overflow.
    if (el.clientWidth <= 1 || el.clientHeight <= 1) return false;
    return over(el);
  });
  return candidates
    .filter((el) => !candidates.some((other) => other !== el && el.contains(other)))
    .map((el) => {
      const style = getComputedStyle(el);
      return {
        facts: kit.facts(el),
        overflowX: style.overflowX,
        overflowY: style.overflowY,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
      };
    });
}

export const check: Check<Observation> = {
  id: 'overflow',
  summary: 'The page never scrolls sideways, and no box hides or spills its text.',
  async observe({ page }) {
    const [pageWidth, boxes] = await Promise.all([
      page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      })),
      inPage(page, overflowingBoxes, null),
    ]);
    return { page: pageWidth, boxes };
  },
  judge({ page, boxes }) {
    const pageProblem =
      page.scrollWidth - page.clientWidth > TOLERANCE
        ? [`the page scrolls sideways: its content is ${page.scrollWidth}px wide in a ${page.clientWidth}px viewport`]
        : [];
    const boxProblems = boxes.flatMap((box) => [sideways(box), downwards(box)]);
    return [...pageProblem, ...boxProblems.filter((problem): problem is string => problem !== null)];
  },
};

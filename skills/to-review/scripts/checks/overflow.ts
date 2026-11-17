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
  readonly boxes: readonly Box[];
  readonly brokenWords: readonly BrokenWord[];
}

interface BrokenWord {
  readonly facts: ElementFacts;
  readonly word: string;
}

const TOLERANCE = 1;
const SCROLLS = new Set(['auto', 'scroll']);
const HIDES = new Set(['hidden', 'clip']);

function sideways({ facts, overflowX, scrollWidth, clientWidth }: Box): string | null {
  const excess = scrollWidth - clientWidth;
  if (excess <= TOLERANCE || SCROLLS.has(overflowX)) return null;
  const how = HIDES.has(overflowX) ? 'hides' : 'spills';
  const where = HIDES.has(overflowX) ? 'sideways' : 'past its box sideways';
  return `${describeElement(facts)} ${how} ${excess}px of its content ${where}; wrap at word boundaries by giving the column room or shortening the text`;
}

function downwards({ facts, overflowY, scrollHeight, clientHeight }: Box): string | null {
  const excess = scrollHeight - clientHeight;
  if (excess <= TOLERANCE || SCROLLS.has(overflowY)) return null;
  const how = HIDES.has(overflowY) ? 'hides' : 'spills';
  return `${describeElement(facts)} ${how} ${excess}px of its content below its box; let the box grow`;
}

function overflowingBoxes(kit: Kit): Box[] {
  const SKIP = 'html, body, svg, svg *, textarea, input, select, option, script, style, [hidden]';
  const over = (el: Element) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
  const candidates = [...document.querySelectorAll('body *')].filter((el) => {
    if (el.matches(SKIP) || !el.textContent?.trim()) return false;
    const unrenderedCollapsedOrVisuallyHiddenOnePixelBox = el.clientWidth <= 1 || el.clientHeight <= 1;
    if (unrenderedCollapsedOrVisuallyHiddenOnePixelBox) return false;
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

function brokenWords(kit: Kit): BrokenWord[] {
  const SKIP = 'svg, textarea, input, select, option, script, style, [hidden], [aria-hidden="true"]';
  const rendered = (parent: Element | null): parent is Element =>
    parent !== null &&
    parent.closest(SKIP) === null &&
    kit.shown(parent) &&
    getComputedStyle(parent).visibility !== 'hidden';
  const splitsLines = (node: Node, start: number, end: number): boolean => {
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, end);
    const rects = [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0);
    return rects.some((rect) => Math.abs(rect.top - rects[0].top) > rect.height / 2);
  };
  const found: BrokenWord[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (!rendered(parent)) continue;
    for (const match of (node.textContent ?? '').matchAll(/[^\s\-\u2010-\u2015/]{2,}/g)) {
      if (splitsLines(node, match.index, match.index + match[0].length)) {
        found.push({ facts: kit.facts(parent), word: match[0] });
      }
    }
  }
  return found;
}

export const check: Check<Observation> = {
  id: 'overflow',
  summary: 'The page never scrolls sideways, and no box hides or spills its text, and no word breaks across lines.',
  async observe({ page }) {
    const [pageWidth, boxes, words] = await Promise.all([
      page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      })),
      inPage(page, overflowingBoxes, null),
      inPage(page, brokenWords, null),
    ]);
    return { page: pageWidth, boxes, brokenWords: words };
  },
  judge({ page, boxes, brokenWords: split }) {
    const pageProblem =
      page.scrollWidth - page.clientWidth > TOLERANCE
        ? [`the page scrolls sideways: its content is ${page.scrollWidth}px wide in a ${page.clientWidth}px viewport`]
        : [];
    const boxProblems = boxes.flatMap((box) => [sideways(box), downwards(box)]);
    const wordProblems = split.map(
      ({ facts, word }) =>
        `${describeElement(facts)} breaks the word "${word}" across two lines; wrap at word boundaries by giving the column room or shortening the text`,
    );
    return [...pageProblem, ...boxProblems.filter((problem): problem is string => problem !== null), ...wordProblems];
  },
};

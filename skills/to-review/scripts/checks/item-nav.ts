import type { Page } from '@playwright/test';
import type { Check } from '../grader/check.ts';
import { shownShare, type Rect, type Viewport } from '../grader/viewport.pure.ts';

interface Position {
  readonly at: string;
  readonly nav: Rect;
}

interface Observation {
  readonly viewport: Viewport;
  readonly unlinked: readonly string[];
  readonly positions: readonly Position[] | null;
}

const NAVS = 'nav, [role="navigation"]';
const MIN_SHOWN = 0.5;

function navigation(navs: string): { index: number; unlinked: string[] } {
  const items = [...document.querySelectorAll('[data-item]')];
  const reached = (nav: Element) =>
    new Set(
      [...nav.querySelectorAll('a[href^="#"]')]
        .map((link) => document.getElementById(decodeURIComponent(link.getAttribute('href')!.slice(1))))
        .map((target) => items.find((item) => target !== null && item.contains(target)))
        .filter((item) => item !== undefined),
    );
  const scored = [...document.querySelectorAll(navs)].map((nav, index) => ({ index, reached: reached(nav) }));
  const best = scored.sort((a, b) => b.reached.size - a.reached.size)[0];
  if (best === undefined || best.reached.size === 0) return { index: -1, unlinked: [] };
  return {
    index: best.index,
    unlinked: items.filter((item) => !best.reached.has(item)).map((item) => item.getAttribute('data-item') ?? ''),
  };
}

async function scrollTo(page: Page, target: number | 'end'): Promise<void> {
  await page.evaluate((to) => {
    if (to === 'end') window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
    else document.querySelectorAll('[data-item]')[to].scrollIntoView({ block: 'start', behavior: 'instant' });
  }, target);
}

async function positions(page: Page, index: number): Promise<Position[]> {
  const nav = page.locator(NAVS).nth(index);
  const rect = async (): Promise<Rect> =>
    (await nav.evaluate((element) => element.getBoundingClientRect().toJSON())) as Rect;
  const measured: Position[] = [{ at: 'the top of the page', nav: await rect() }];
  const items = await page
    .locator('[data-item]')
    .evaluateAll((all) => all.map((item) => item.getAttribute('data-item')));
  for (const [position, id] of items.entries()) {
    await scrollTo(page, position);
    measured.push({ at: `item "${id}"`, nav: await rect() });
  }
  await scrollTo(page, 'end');
  measured.push({ at: 'the end of the page', nav: await rect() });
  return measured;
}

export const check: Check<Observation> = {
  id: 'item-nav',
  summary: 'A <nav> links to every item and stays at least half in view from the top of the page to its end.',
  async observe({ page }) {
    const viewport = page.viewportSize() ?? { width: 0, height: 0 };
    const { index, unlinked } = await page.evaluate(navigation, NAVS);
    return { viewport, unlinked, positions: index === -1 ? null : await positions(page, index) };
  },
  judge({ viewport, unlinked, positions }) {
    if (positions === null) return ['the page has no item navigation; add a <nav> that links to every item'];
    const lost = positions.filter(({ nav }) => shownShare(nav, viewport) < MIN_SHOWN).map(({ at }) => at);
    return [
      ...unlinked.map((id) => `the item navigation has no link to item "${id}"`),
      ...(lost.length > 0
        ? [`the item navigation leaves the viewport at ${lost.join(', ')}; make it sticky or fixed`]
        : []),
    ];
  },
};

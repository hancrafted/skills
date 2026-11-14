// Depth: an item with depth "both" carries exactly one [data-depth-toggle], starts on its simple view and reveals
// more when the toggle is activated; a "simple" or "detailed" item has no toggle.
import type { Page } from '@playwright/test';
import type { Check } from '../grader/check.ts';

interface ItemDepth {
  readonly id: string;
  readonly depth: string;
  readonly toggles: number;
  /** For a "both" item with a toggle: whether activating it showed more text. Null when not tried. */
  readonly revealed: boolean | null;
}

const TOGGLE = '[data-depth-toggle]';

const textLength = (page: Page, item: string): Promise<number> =>
  page.locator(item).evaluate((element) => (element as HTMLElement).innerText.length);

async function observeItem(page: Page, index: number): Promise<ItemDepth> {
  const item = page.locator('[data-item]').nth(index);
  const [id, depth, toggles] = await Promise.all([
    item.getAttribute('data-item'),
    item.getAttribute('data-depth'),
    item.locator(TOGGLE).count(),
  ]);
  const selector = `[data-item=${JSON.stringify(id ?? '')}]`;
  if (depth !== 'both' || toggles === 0) return { id: id ?? '', depth: depth ?? '', toggles, revealed: null };
  const before = await textLength(page, selector);
  await item.locator(TOGGLE).first().click();
  return { id: id ?? '', depth, toggles, revealed: (await textLength(page, selector)) > before };
}

function problemOf({ id, depth, toggles, revealed }: ItemDepth): string | null {
  if (depth !== 'both')
    return toggles === 0 ? null : `item "${id}" has depth "${depth}" but a ${TOGGLE}; only "both" items toggle`;
  if (toggles !== 1)
    return `item "${id}" has depth "both" but ${toggles} ${TOGGLE}; give it exactly one, starting on the simple view`;
  return revealed === false
    ? `item "${id}": activating its ${TOGGLE} shows no more text; start on the simple view and reveal the detail`
    : null;
}

export const check: Check<readonly ItemDepth[]> = {
  id: 'depth-toggle',
  summary:
    'Only items with depth "both" carry a [data-depth-toggle], exactly one each, which starts simple and reveals the detail.',
  async observe({ page }) {
    const items: ItemDepth[] = [];
    const count = await page.locator('[data-item]').count();
    for (let index = 0; index < count; index++) items.push(await observeItem(page, index));
    return items;
  },
  judge: (items) => items.map(problemOf).filter((problem): problem is string => problem !== null),
};

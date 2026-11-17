import type { Page } from '@playwright/test';
import type { Check } from '../grader/check.ts';
import { describeElement, type ElementFacts } from '../grader/element.pure.ts';
import { inPage, type Kit } from '../grader/in-page.ts';
import { shownShare, type Rect, type Viewport } from '../grader/viewport.pure.ts';

interface Field {
  readonly facts: ElementFacts;
  readonly visual: Rect | null;
}

interface Observation {
  readonly viewport: Viewport;
  readonly fields: readonly Field[];
}

const FIELDS = '[data-item] textarea';
const MIN_SHOWN = 0.5;
const COMMENT = Array.from({ length: 12 }, (_, line) => `Zeile ${line + 1}: die Grafik oben zeigt „genau“ das.`).join(
  '\n',
);

function measure(kit: Kit, { selector, index }: { selector: string; index: number }): Field {
  const field = document.querySelectorAll(selector)[index];
  const visual = kit.largestVisual(field.closest('[data-option]')) ?? kit.largestVisual(field.closest('[data-item]'));
  return { facts: kit.facts(field), visual: (visual?.getBoundingClientRect().toJSON() as Rect | undefined) ?? null };
}

async function commentOn(page: Page, index: number): Promise<Field> {
  const field = page.locator(FIELDS).nth(index);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await field.click();
  await page.keyboard.insertText(COMMENT);
  const measured = await inPage(page, measure, { selector: FIELDS, index });
  await field.fill('');
  return measured;
}

export const check: Check<Observation> = {
  id: 'comment-in-view',
  summary: 'While a long comment is typed into an item or Option field, at least half of its visual stays in view.',
  async observe({ page }) {
    const viewport = page.viewportSize() ?? { width: 0, height: 0 };
    const fields: Field[] = [];
    const all = page.locator(FIELDS);
    for (let index = 0; index < (await all.count()); index++)
      if (await all.nth(index).isVisible()) fields.push(await commentOn(page, index));
    return { viewport, fields };
  },
  judge: ({ viewport, fields }) =>
    fields
      .filter((field): field is Field & { visual: Rect } => field.visual !== null)
      .map(({ facts, visual }) => ({ facts, share: shownShare(visual, viewport) }))
      .filter(({ share }) => share < MIN_SHOWN)
      .map(
        ({ facts, share }) =>
          `while ${describeElement(facts)} has focus, ${Math.floor(share * 100)}% of its visual is in view; keep at least half of it beside the comment`,
      ),
};

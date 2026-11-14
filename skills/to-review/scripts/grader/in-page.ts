// Browser-side helpers the layout checks share. Playwright ships a function to the page as its source text, so any
// helper it calls must travel with it: `inPage` sends these helpers along as the function's first argument.
import type { Page } from '@playwright/test';
import type { ElementFacts } from './element.pure.ts';

/** Runs in the page: what describeElement needs to name the element in a problem. */
function facts(element: Element): ElementFacts {
  const label = (element as HTMLInputElement).labels?.[0]?.textContent;
  return {
    tag: element.tagName.toLowerCase(),
    id: element.id,
    item: element.closest('[data-item]')?.getAttribute('data-item') ?? null,
    text: label ?? element.textContent ?? '',
  };
}

/** Runs in the page: any CSS colour as sRGB red, green and blue 0–255 and alpha 0–1, oklch and color() included. */
function rgba(color: string): number[] {
  const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
  return [red, green, blue, alpha / 255];
}

/**
 * Runs in the page: the visual a comment or a layout rule is about inside `scope`: the largest `[data-visual]`, else
 * the largest svg, img, canvas, video or iframe that has a box. An icon inside a button or label is a control's
 * glyph, not a visual. With `skipInside`, elements inside a match of that selector do not count.
 */
function largestVisual(scope: Element | null, skipInside?: string): Element | null {
  const area = (element: Element) => element.getBoundingClientRect().width * element.getBoundingClientRect().height;
  const counts = (element: Element) => skipInside === undefined || element.closest(skipInside) === null;
  const marked = [...(scope?.querySelectorAll('[data-visual]') ?? [])].filter(counts);
  const drawn = [...(scope?.querySelectorAll('svg, img, canvas, video, iframe') ?? [])].filter(
    (element) => !element.closest('button, label') && counts(element),
  );
  const candidates = (marked.length > 0 ? marked : drawn).filter((element) => area(element) > 0);
  return candidates.sort((a, b) => area(b) - area(a))[0] ?? null;
}

/** Runs in the page: whether the element has a box a reader can see, more than a pixel in each direction. */
function shown(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width > 1 && rect.height > 1;
}

/** Runs in the page: the words a reader sees inside `root`, none from aria-hidden glyphs, hidden or 1px text. */
function visibleText(root: Element): string {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let text = '';
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (parent === null || parent.closest('[aria-hidden="true"], option') !== null) continue;
    if (getComputedStyle(parent).visibility !== 'hidden' && shown(parent)) text += node.textContent;
  }
  return /[\p{L}\p{N}]/u.test(text) ? text.replace(/\s+/g, ' ').trim() : '';
}

/** Runs in the page: the shown labels of a control; a click on one picks the control. */
function shownLabels(control: Element): HTMLLabelElement[] {
  return [...((control as HTMLInputElement).labels ?? [])].filter(shown);
}

/** Runs in the page: the text a reader sees as a control's label; a select shows its chosen option. */
function labelOf(control: Element): string {
  if (control instanceof HTMLSelectElement) {
    const labelled = shownLabels(control).map(visibleText).join(' ').trim();
    return labelled || (control.selectedOptions[0]?.textContent ?? '').trim();
  }
  if (control instanceof HTMLInputElement) return shownLabels(control).map(visibleText).join(' ').trim();
  return visibleText(control);
}

/** Runs in the page: a pick control's hit area, the largest box among it and its shown labels, and its label. */
function hitArea(control: Element): { width: number; height: number; label: string } {
  const boxes = [control, ...shownLabels(control)].map((element) => element.getBoundingClientRect());
  const largest = boxes.sort((a, b) => b.width * b.height - a.width * a.height)[0];
  return { width: largest.width, height: largest.height, label: labelOf(control) };
}

/**
 * Runs in the page: the controls matching `selector` that pick `option`: those inside it, and those in its item
 * outside every Option that have `value` equal to its id (a select: hold an `<option>` of that value).
 */
function tiedControls(option: Element, selector: string): Element[] {
  const id = option.getAttribute('data-option');
  const item = option.closest('[data-item]');
  const byValue = (control: Element) =>
    control.getAttribute('value') === id ||
    (control instanceof HTMLSelectElement && [...control.options].some((choice) => choice.value === id));
  const outside = [...(item?.querySelectorAll(selector) ?? [])].filter(
    (control) => control.closest('[data-option]') === null && byValue(control),
  );
  return [...option.querySelectorAll(selector), ...outside];
}

/** Runs in the page: the navigation linking the most `#` targets, else null. */
function mainNavigation(): Element | null {
  const links = (nav: Element) => nav.querySelectorAll('a[href^="#"]').length;
  const navs = [...document.querySelectorAll('nav, [role="navigation"]')];
  return navs.sort((a, b) => links(b) - links(a)).find((nav) => links(nav) > 0) ?? null;
}

const HELPERS = [
  facts,
  rgba,
  largestVisual,
  shown,
  visibleText,
  shownLabels,
  labelOf,
  hitArea,
  tiedControls,
  mainNavigation,
];

export interface Kit {
  facts: typeof facts;
  rgba: typeof rgba;
  largestVisual: typeof largestVisual;
  shown: typeof shown;
  visibleText: typeof visibleText;
  hitArea: typeof hitArea;
  tiedControls: typeof tiedControls;
  mainNavigation: typeof mainNavigation;
}

/**
 * The script that runs `fn(kit, arg)`. Every helper is declared by its own name before `fn` runs, so a helper may
 * call another; `fn` receives them all as `kit`.
 */
function script(fn: (kit: Kit, arg: never) => unknown, arg: unknown): string {
  const declarations = HELPERS.map((helper) => helper.toString()).join('\n');
  const kit = `{ ${HELPERS.map((helper) => helper.name).join(', ')} }`;
  return `(() => {\n${declarations}\nreturn (${fn.toString()})(${kit}, ${JSON.stringify(arg) ?? 'undefined'});\n})()`;
}

/** Runs `fn(kit, arg)` in the page; `arg` must survive JSON. */
export function inPage<A, R>(page: Page, fn: (kit: Kit, arg: A) => R, arg: A): Promise<R> {
  return page.evaluate(script(fn, arg)) as Promise<R>;
}

/** The page-side source of `fn` with its kit already applied, for Playwright calls that take a function and no argument. */
export function withKit(fn: (kit: Kit) => unknown): string {
  return script(fn, undefined);
}

import type { Page } from '@playwright/test';
import type { ElementFacts } from './element.pure.ts';

function facts(element: Element): ElementFacts {
  const label = (element as HTMLInputElement).labels?.[0]?.textContent;
  return {
    tag: element.tagName.toLowerCase(),
    id: element.id,
    item: element.closest('[data-item]')?.getAttribute('data-item') ?? null,
    text: label ?? element.textContent ?? '',
  };
}

function rgba(color: string): number[] {
  const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
  return [red, green, blue, alpha / 255];
}

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

function shown(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width > 1 && rect.height > 1;
}

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

function shownLabels(control: Element): HTMLLabelElement[] {
  return [...((control as HTMLInputElement).labels ?? [])].filter(shown);
}

function labelOf(control: Element): string {
  if (control instanceof HTMLSelectElement) {
    const labelled = shownLabels(control).map(visibleText).join(' ').trim();
    return labelled || (control.selectedOptions[0]?.textContent ?? '').trim();
  }
  if (control instanceof HTMLInputElement) return shownLabels(control).map(visibleText).join(' ').trim();
  return visibleText(control);
}

function hitArea(control: Element): { width: number; height: number; label: string } {
  const boxes = [control, ...shownLabels(control)].map((element) => element.getBoundingClientRect());
  const largest = boxes.sort((a, b) => b.width * b.height - a.width * a.height)[0];
  return { width: largest.width, height: largest.height, label: labelOf(control) };
}

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

function sourceWithKitDeclared(fn: (kit: Kit, arg: never) => unknown, arg: unknown): string {
  const declarations = HELPERS.map((helper) => helper.toString()).join('\n');
  const kit = `{ ${HELPERS.map((helper) => helper.name).join(', ')} }`;
  return `(() => {\n${declarations}\nreturn (${fn.toString()})(${kit}, ${JSON.stringify(arg) ?? 'undefined'});\n})()`;
}

export function inPage<A, R>(page: Page, fn: (kit: Kit, arg: A) => R, arg: A): Promise<R> {
  return page.evaluate(sourceWithKitDeclared(fn, arg)) as Promise<R>;
}

export function withKit(fn: (kit: Kit) => unknown): string {
  return sourceWithKitDeclared(fn, undefined);
}

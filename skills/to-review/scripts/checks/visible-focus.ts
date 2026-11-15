// Visible focus: every control Tab reaches looks different while focused, by a new outline, shadow, border,
// background or underline. The browser's own focus ring counts; removing it without a replacement fails.
import type { Page } from '@playwright/test';
import type { Check } from '../grader/check.ts';
import { describeElement, type ElementFacts } from '../grader/element.pure.ts';
import { inPage, type Kit } from '../grader/in-page.ts';

interface FocusStyle {
  readonly outlineStyle: string;
  readonly outlineWidth: number;
  readonly outlineColor: string;
  /** The outline colour's alpha, 0 to 1. */
  readonly outlineAlpha: number;
  readonly boxShadow: string;
  readonly border: string;
  readonly background: string;
  readonly textDecoration: string;
}

interface Reached {
  readonly facts: ElementFacts;
  readonly before: FocusStyle;
  readonly focused: FocusStyle;
}

interface Observation {
  /** The visible controls a keyboard user could reach. */
  readonly controls: number;
  /** Each control Tab reached, in Tab order. */
  readonly reached: readonly Reached[];
}

const CONTROLS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([type="hidden"]):not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/** Runs in the page: the control's facts and the styles a focus indicator changes. */
function read(kit: Kit, { selector, index }: { selector: string; index: number }): Omit<Reached, 'before'> {
  const element = document.querySelectorAll(selector)[index];
  const style = getComputedStyle(element);
  return {
    facts: kit.facts(element),
    focused: {
      outlineStyle: style.outlineStyle,
      outlineWidth: parseFloat(style.outlineWidth),
      outlineColor: style.outlineColor,
      outlineAlpha: kit.rgba(style.outlineColor)[3],
      boxShadow: style.boxShadow,
      border: `${style.borderWidth} ${style.borderStyle} ${style.borderColor}`,
      background: style.backgroundColor,
      textDecoration: style.textDecorationLine,
    },
  };
}

const readAt = (page: Page, index: number) => inPage(page, read, { selector: CONTROLS, index });

const focusedIndex = (page: Page): Promise<number> =>
  page.evaluate((selector) => [...document.querySelectorAll(selector)].indexOf(document.activeElement!), CONTROLS);

/** Presses Tab until focus leaves the controls or returns to one already seen, reading each control as it is focused. */
async function tabThrough(page: Page, before: ReadonlyMap<number, FocusStyle>): Promise<Reached[]> {
  const reached: Reached[] = [];
  const seen = new Set<number>();
  for (let press = 0; press <= before.size + 1; press++) {
    await page.keyboard.press('Tab');
    const index = await focusedIndex(page);
    if (seen.has(index)) break;
    seen.add(index);
    const unfocused = before.get(index);
    if (unfocused === undefined) continue;
    reached.push({ ...(await readAt(page, index)), before: unfocused });
  }
  return reached;
}

/** An outline counts when it has a style, a pixel of width and a colour that is not transparent; `auto` is the browser's ring. */
const outlineShown = ({ outlineStyle, outlineWidth, outlineAlpha }: FocusStyle): boolean =>
  outlineStyle !== 'none' && outlineWidth >= 1 && (outlineAlpha > 0 || outlineStyle === 'auto');

const outlineOf = (style: FocusStyle): string => `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`;

const indicated = (before: FocusStyle, focused: FocusStyle): boolean =>
  (outlineShown(focused) && outlineOf(focused) !== outlineOf(before)) ||
  (focused.boxShadow !== 'none' && focused.boxShadow !== before.boxShadow) ||
  focused.border !== before.border ||
  focused.background !== before.background ||
  focused.textDecoration !== before.textDecoration;

export const check: Check<Observation> = {
  id: 'visible-focus',
  summary: 'Every control Tab reaches shows a visible focus indicator: a new outline, shadow, border or background.',
  async observe({ page }) {
    const all = page.locator(CONTROLS);
    const visible: number[] = [];
    for (let index = 0; index < (await all.count()); index++) if (await all.nth(index).isVisible()) visible.push(index);
    const before = new Map<number, FocusStyle>();
    for (const index of visible) before.set(index, (await readAt(page, index)).focused);
    const reached = await tabThrough(page, before);
    return { controls: visible.length, reached };
  },
  judge({ controls, reached }) {
    if (controls > 0 && reached.length === 0)
      return [`Tab reaches none of the page’s ${controls} controls; keep them in the keyboard order`];
    return reached
      .filter(({ before, focused }) => !indicated(before, focused))
      .map(
        ({ facts }) =>
          `${describeElement(facts)} shows no focus indicator when Tab reaches it; style :focus-visible with an outline`,
      );
  },
};

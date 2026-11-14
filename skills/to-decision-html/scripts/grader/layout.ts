// Browser-side steps the room checks share: size the window, collapse the navigation the way a reader does, and
// read where the navigation ended up.
import type { Page } from '@playwright/test';
import { inPage, withKit, type Kit } from './in-page.ts';
import type { Rect, Viewport } from './viewport.pure.ts';

/** `none`: no collapsible navigation, measured as it is; `collapsed`: a toggle hid it; `open`: it stayed. */
export type NavigationState = 'none' | 'collapsed' | 'open';

/**
 * Runs in the page: the control that collapses the navigation, found without any attribute of the contract: a shown
 * button, role=button or open `<details>` summary that says it is expanded (`aria-expanded="true"`) and either
 * controls the navigation or a box around or inside it, or sits inside the navigation, or is named for it (navigation,
 * nav, menu, contents, sidebar). The first rule that finds one wins.
 */
function navigationToggle(kit: Kit): Element | null {
  const nav = kit.mainNavigation();
  if (nav === null) return null;
  const candidates = [
    ...document.querySelectorAll(
      'button[aria-expanded="true"], [role="button"][aria-expanded="true"], details[open] > summary',
    ),
  ].filter(kit.shown);
  const controlled = (toggle: Element) => {
    const target = document.getElementById(toggle.getAttribute('aria-controls') ?? '');
    return target !== null && (target.contains(nav) || nav.contains(target));
  };
  const inside = (toggle: Element) => nav.contains(toggle) || toggle.parentElement?.contains(nav) === true;
  const named = (toggle: Element) =>
    /\b(navigation|nav|menu|contents|sidebar|inhalt)\b/i.test(
      `${toggle.getAttribute('aria-label') ?? ''} ${toggle.textContent ?? ''}`,
    );
  return candidates.find(controlled) ?? candidates.find(inside) ?? candidates.find(named) ?? null;
}

/** Runs in the page: the shown navigation's box, or null when there is none or it is hidden or off the screen. */
function shownNavigation(kit: Kit): Rect | null {
  const nav = kit.mainNavigation();
  if (nav === null || getComputedStyle(nav).visibility === 'hidden' || !kit.shown(nav)) return null;
  const rect = nav.getBoundingClientRect();
  const onScreen = rect.right > 0 && rect.left < document.documentElement.clientWidth;
  return onScreen ? (rect.toJSON() as Rect) : null;
}

/** Runs in the page: resolves once the layout has held still for a few frames, or after about a second. */
function settled(): Promise<void> {
  const signature = () =>
    [...document.querySelectorAll('nav, [data-item]')]
      .slice(0, 4)
      .map((element) => element.getBoundingClientRect().toJSON())
      .map((box) => `${box.left},${box.width}`)
      .join('|');
  return new Promise((resolve) => {
    let last = signature();
    let still = 0;
    let frames = 0;
    const tick = () => {
      const now = signature();
      still = now === last ? still + 1 : 0;
      last = now;
      frames += 1;
      if (still >= 3 || frames >= 60) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** Sizes the window and waits for the layout to follow. Motion is reduced, so a transition cannot fake a width. */
export async function resize(page: Page, viewport: Viewport): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize(viewport);
  await page.evaluate(settled);
}

/** The shown navigation's box now; null when there is none. */
export const navigationBox = (page: Page): Promise<Rect | null> => inPage(page, shownNavigation, null);

/** Collapses the navigation with its toggle when the page has one, and reports what the reader is left with. */
export async function collapseNavigation(page: Page): Promise<NavigationState> {
  const toggle = (await page.evaluateHandle<Element>(withKit(navigationToggle))).asElement();
  if (toggle === null) return 'none';
  await toggle.click();
  await page.evaluate(settled);
  return (await navigationBox(page)) === null ? 'collapsed' : 'open';
}

import type { Page } from '@playwright/test';
import { inPage, withKit, type Kit } from './in-page.ts';
import type { Rect, Viewport } from './viewport.pure.ts';

export type NavigationState = 'none' | 'collapsed' | 'open';

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

function shownNavigation(kit: Kit): Rect | null {
  const nav = kit.mainNavigation();
  if (nav === null || getComputedStyle(nav).visibility === 'hidden' || !kit.shown(nav)) return null;
  const rect = nav.getBoundingClientRect();
  const onScreen = rect.right > 0 && rect.left < document.documentElement.clientWidth;
  return onScreen ? (rect.toJSON() as Rect) : null;
}

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

export async function resize(page: Page, viewport: Viewport): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize(viewport);
  await page.evaluate(settled);
}

export const navigationBox = (page: Page): Promise<Rect | null> => inPage(page, shownNavigation, null);

export async function collapseNavigation(page: Page): Promise<NavigationState> {
  const toggle = (await page.evaluateHandle<Element>(withKit(navigationToggle))).asElement();
  if (toggle === null) return 'none';
  await toggle.click();
  await page.evaluate(settled);
  return (await navigationBox(page)) === null ? 'collapsed' : 'open';
}

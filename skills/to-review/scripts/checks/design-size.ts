// The page grows with the screen. A visual that declares a design size with `data-design-width="<px>"` (a 1920 px
// frame) renders, at 2560 × 1440, at least as wide as min(design width, available width), where
//   available = screen width − navigation still shown − rail − 3 gutters (48 px: before, between and after).
// The rail is the widest Option of the visual's item that sits beside the visual, 0 when none does; the navigation
// is collapsed first by its toggle, as laptop-room does, and counts only while it is still shown beside the content.
// A visual without the attribute is not measured. The visual is the element carrying the attribute.
import type { Check } from '../grader/check.ts';
import { collapseNavigation, navigationBox, resize, type NavigationState } from '../grader/layout.ts';
import { GUTTER, navigationTaken, railWidth } from '../grader/room.pure.ts';
import type { Rect, Viewport } from '../grader/viewport.pure.ts';

interface Visual {
  readonly item: string;
  /** The attribute's value as written. */
  readonly design: string;
  readonly rect: Rect;
  readonly options: readonly { readonly id: string; readonly rect: Rect }[];
}

interface Observation {
  readonly viewport: Viewport;
  readonly navigation: NavigationState;
  /** The navigation's box when it is still shown. */
  readonly nav: Rect | null;
  readonly visuals: readonly Visual[];
}

const ULTRAWIDE = { width: 2560, height: 1440 };
const STATE: Record<NavigationState, string> = {
  collapsed: 'with the navigation collapsed',
  open: 'with the navigation open',
  none: 'as the page stands',
};

/** Runs in the page: every shown element declaring a design width, with the Options of its item. */
function declaredVisuals(): Visual[] {
  const box = (element: Element) => element.getBoundingClientRect().toJSON() as Rect;
  return [...document.querySelectorAll('[data-design-width]')]
    .filter((visual) => box(visual).width > 0)
    .map((visual) => ({
      item: visual.closest('[data-item]')?.getAttribute('data-item') ?? '',
      design: visual.getAttribute('data-design-width') ?? '',
      rect: box(visual),
      options: [...(visual.closest('[data-item]')?.querySelectorAll('[data-option]') ?? [])]
        .filter((option) => box(option).width > 0)
        .map((option) => ({ id: option.getAttribute('data-option') ?? '', rect: box(option) })),
    }));
}

function problemsOf({ item, design, rect, options }: Visual, { viewport, navigation, nav }: Observation): string[] {
  if (!/^[1-9]\d*$/.test(design))
    return [`item "${item}": data-design-width is "${design}"; expected a positive integer such as 1920`];
  const available =
    viewport.width -
    navigationTaken(nav, rect.left) -
    railWidth(
      rect,
      options.map((o) => o.rect),
    ) -
    3 * GUTTER;
  const required = Math.min(Number(design), available);
  if (Math.floor(rect.width) >= required) return [];
  return [
    `item "${item}": its visual declares a design width of ${design}px but renders ${Math.floor(rect.width)}px wide at ${viewport.width} × ${viewport.height} ${STATE[navigation]}; let it grow to at least ${required}px`,
  ];
}

export const check: Check<Observation> = {
  id: 'design-size',
  summary:
    'A visual declaring data-design-width renders at 2560 × 1440 at least as wide as min(design width, screen − navigation − rail − 3 gutters of 48 px).',
  async observe({ page }) {
    await resize(page, ULTRAWIDE);
    const navigation = await collapseNavigation(page);
    return {
      viewport: ULTRAWIDE,
      navigation,
      nav: await navigationBox(page),
      visuals: await page.evaluate(declaredVisuals),
    };
  },
  judge(observation) {
    return observation.visuals.flatMap((visual) => problemsOf(visual, observation));
  },
};

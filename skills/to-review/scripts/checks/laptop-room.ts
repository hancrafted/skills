import type { Check } from '../grader/check.ts';
import { inPage, type Kit } from '../grader/in-page.ts';
import { collapseNavigation, navigationBox, resize, type NavigationState } from '../grader/layout.ts';
import { GUTTER, isBeside, navigationTaken } from '../grader/room.pure.ts';
import type { Rect, Viewport } from '../grader/viewport.pure.ts';

interface ItemRoom {
  readonly id: string;
  readonly left: number;
  readonly column: Rect | null;
  readonly options: readonly { readonly id: string; readonly rect: Rect }[];
}

interface Observation {
  readonly viewport: Viewport;
  readonly navigation: NavigationState;
  readonly nav: Rect | null;
  readonly items: readonly ItemRoom[];
}

const LAPTOP = { width: 1440, height: 900 };
const MIN_COLUMN = 1000;
const STATE: Record<NavigationState, string> = {
  collapsed: 'with the navigation collapsed',
  open: 'with the navigation open',
  none: 'as the page stands',
};

function itemRooms(kit: Kit): ItemRoom[] {
  const box = (element: Element) => element.getBoundingClientRect().toJSON() as Rect;
  return [...document.querySelectorAll('[data-item]')]
    .filter((item) => box(item).width > 0 && box(item).height > 0)
    .map((item) => {
      const visual = kit.largestVisual(item, '[data-option]');
      return {
        id: item.getAttribute('data-item') ?? '',
        left: box(item).left,
        column: visual === null ? null : box(visual),
        options: [...item.querySelectorAll('[data-option]')]
          .filter((option) => box(option).width > 0)
          .map((option) => ({ id: option.getAttribute('data-option') ?? '', rect: box(option) })),
      };
    });
}

function itemProblems({ id, column, options }: ItemRoom, state: string): string[] {
  if (column === null) return [];
  const narrow =
    Math.floor(column.width) < MIN_COLUMN
      ? [
          `item "${id}": the content column is ${Math.floor(column.width)}px wide ${state}; keep at least ${MIN_COLUMN}px with the rail beside it`,
        ]
      : [];
  const under = options
    .filter(({ rect }) => !isBeside(column, rect))
    .map(
      ({ id: option }) =>
        `item "${id}": option "${option}" sits under the content column, not in a rail beside it; put the Options in a rail to its right`,
    );
  return [...narrow, ...under];
}

export const check: Check<Observation> = {
  id: 'laptop-room',
  summary:
    'At 1440 × 900 with the navigation collapsed, no empty column wider than the 48 px gutter remains left of the content, and each item keeps a content column of at least 1000 px with its Options in a rail beside it.',
  async observe({ page }) {
    await resize(page, LAPTOP);
    const navigation = await collapseNavigation(page);
    return {
      viewport: LAPTOP,
      navigation,
      nav: await navigationBox(page),
      items: await inPage(page, itemRooms, null),
    };
  },
  judge({ navigation, nav, items }) {
    if (items.length === 0) return [];
    const state = STATE[navigation];
    const left = Math.min(...items.map((item) => item.left));
    const empty = Math.floor(left - navigationTaken(nav, left));
    const dead =
      empty > GUTTER
        ? [
            `${state}, the items start ${Math.floor(left)}px from the left edge, leaving a ${empty}px empty column; give the navigation's width back (a gutter is at most ${GUTTER}px)`,
          ]
        : [];
    return [...dead, ...items.flatMap((item) => itemProblems(item, state))];
  },
};

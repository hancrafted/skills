// How much room a page gives its content: the measures behind "the navigation gives back its width" and "the
// visual grows with the screen".
import type { Rect } from './viewport.pure.ts';

/** The page gutter in CSS px: the most empty width a page keeps beside its content on each side. */
export const GUTTER = 48;
/** Sub-pixel layout rounds; a pixel of overlap is noise. */
const TOLERANCE = 1;

/**
 * The width the navigation takes from the left of the screen: its right edge when it sits left of the content at
 * `contentLeft`, else 0, since no navigation, a hidden one and a bar across the top all leave the left edge free.
 */
export function navigationTaken(nav: Rect | null, contentLeft: number): number {
  if (nav === null) return 0;
  const right = nav.left + nav.width;
  return right <= contentLeft + TOLERANCE ? right : 0;
}

/** Whether an Option sits beside the column, to the right of it, rather than under or over it. */
export const isBeside = (column: Rect, option: Rect): boolean => option.left >= column.left + column.width - TOLERANCE;

/** The width of the rail: the widest Option beside the column; 0 when no Option sits beside it. */
export function railWidth(column: Rect, options: readonly Rect[]): number {
  return Math.max(0, ...options.filter((option) => isBeside(column, option)).map((option) => option.width));
}

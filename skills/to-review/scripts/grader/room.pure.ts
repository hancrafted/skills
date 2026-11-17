import type { Rect } from './viewport.pure.ts';

export const GUTTER = 48;
const SUB_PIXEL_ROUNDING_TOLERANCE_PIXELS = 1;

export function navigationTaken(nav: Rect | null, contentLeft: number): number {
  if (nav === null) return 0;
  const right = nav.left + nav.width;
  return right <= contentLeft + SUB_PIXEL_ROUNDING_TOLERANCE_PIXELS ? right : 0;
}

export const isBeside = (column: Rect, option: Rect): boolean =>
  option.left >= column.left + column.width - SUB_PIXEL_ROUNDING_TOLERANCE_PIXELS;

export function railWidth(column: Rect, options: readonly Rect[]): number {
  return Math.max(0, ...options.filter((option) => isBeside(column, option)).map((option) => option.width));
}

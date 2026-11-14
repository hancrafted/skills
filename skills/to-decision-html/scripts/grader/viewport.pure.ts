// How much of a box a reader sees: the measure behind "the navigation stays visible" and "the visual stays in view
// while commenting".

/** A box from getBoundingClientRect, relative to the viewport. */
export interface Rect {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

export interface Viewport {
  readonly width: number;
  readonly height: number;
}

/** The shown length of a span starting at `start`, as a fraction of the span or of the screen, whichever is shorter. */
function axisShare(start: number, length: number, screen: number): number {
  const shown = Math.min(start + length, screen) - Math.max(start, 0);
  const needed = Math.min(length, screen);
  return needed > 0 ? Math.max(0, shown) / needed : 0;
}

/**
 * The fraction of a box inside the viewport, 0 to 1. A box larger than the viewport counts as fully shown when it
 * fills the viewport, since no scroll position can show more of it.
 */
export function shownShare(rect: Rect, viewport: Viewport): number {
  return axisShare(rect.top, rect.height, viewport.height) * axisShare(rect.left, rect.width, viewport.width);
}

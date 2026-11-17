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

function axisShare(start: number, length: number, screen: number): number {
  const shown = Math.min(start + length, screen) - Math.max(start, 0);
  const needed = Math.min(length, screen);
  return needed > 0 ? Math.max(0, shown) / needed : 0;
}

export function shownShare(rect: Rect, viewport: Viewport): number {
  return axisShare(rect.top, rect.height, viewport.height) * axisShare(rect.left, rect.width, viewport.width);
}

// AA contrast: in the light and the dark theme, every rendered run of text reaches 4.5:1 against the background
// behind it, or 3:1 when large (24px, or 18.66px bold). Backgrounds are composited from the page canvas up through
// every translucent layer; text over a background image or gradient is skipped, since its colour behind the text
// is unknown. Text drawn inside SVG is out of scope.
import type { Check } from '../grader/check.ts';
import { describeElement, type ElementFacts } from '../grader/element.pure.ts';
import { inPage, type Kit } from '../grader/in-page.ts';

/** Red, green and blue 0–255, alpha 0–1. */
type Rgba = readonly number[];

interface Sample {
  readonly facts: ElementFacts;
  readonly scheme: string;
  readonly color: Rgba;
  /** Background layers from the page canvas up to the text's own box; null over an image or gradient. */
  readonly layers: readonly Rgba[] | null;
  readonly fontSize: number;
  readonly fontWeight: number;
}

const SCHEMES = ['light', 'dark'] as const;
const WHITE: Rgba = [255, 255, 255, 1];

const over = (top: Rgba, bottom: Rgba): Rgba => {
  const alpha = top[3];
  return [0, 1, 2].map((channel) => top[channel] * alpha + bottom[channel] * (1 - alpha)).concat(1);
};

/** WCAG 2 relative luminance of an opaque colour. */
function luminance([red, green, blue]: Rgba): number {
  const linear = (channel: number) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
}

/** The WCAG 2 contrast ratio of text over an opaque background, the text blended in first when translucent. */
export function contrastRatio(text: Rgba, background: Rgba): number {
  const [lighter, darker] = [luminance(over(text, background)), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

const isLarge = ({ fontSize, fontWeight }: Sample): boolean =>
  fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);

function problemOf(sample: Sample): string | null {
  if (sample.layers === null) return null;
  const background = sample.layers.reduce<Rgba>((below, layer) => over(layer, below), WHITE);
  const ratio = contrastRatio(sample.color, background);
  const needed = isLarge(sample) ? 3 : 4.5;
  if (ratio >= needed) return null;
  const shown = Math.floor(ratio * 100) / 100;
  const forLarge = isLarge(sample) ? ' for large text' : '';
  return `${describeElement(sample.facts)} has contrast ${shown}:1 in the ${sample.scheme} theme; AA needs ${needed}:1${forLarge}`;
}

/** Runs in the page: every shown element with its own text outside SVG and disabled controls, its colour and the backgrounds behind it. */
function textSamples(kit: Kit, scheme: string): Sample[] {
  // The canvas behind every layer: dark only when the page opts into a dark colour scheme.
  const darkCanvas = scheme === 'dark' && /dark/.test(getComputedStyle(document.documentElement).colorScheme);
  const canvas = darkCanvas ? [18, 18, 18, 1] : [255, 255, 255, 1];
  const layersOf = (element: Element): number[][] | null => {
    const styles: CSSStyleDeclaration[] = [];
    for (let node: Element | null = element; node; node = node.parentElement) styles.unshift(getComputedStyle(node));
    if (styles.some((style) => style.backgroundImage !== 'none')) return null;
    return [canvas, ...styles.map((style) => kit.rgba(style.backgroundColor))];
  };
  const readable = (element: Element) => {
    const { width, height } = element.getBoundingClientRect();
    const ownText = [...element.childNodes].some(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
    );
    const shown = width > 0 && height > 0 && getComputedStyle(element).visibility === 'visible';
    return ownText && shown && !element.closest('svg, script, style, :disabled');
  };
  return [...document.querySelectorAll('body *')].filter(readable).map((element) => {
    const style = getComputedStyle(element);
    return {
      facts: kit.facts(element),
      scheme,
      color: kit.rgba(style.color),
      layers: layersOf(element),
      fontSize: parseFloat(style.fontSize),
      fontWeight: Number(style.fontWeight),
    };
  });
}

export const check: Check<readonly Sample[]> = {
  id: 'contrast',
  summary: 'In light and dark themes, text reaches AA contrast: 4.5:1, or 3:1 for large text.',
  async observe({ page }) {
    const samples: Sample[] = [];
    for (const scheme of SCHEMES) {
      await page.emulateMedia({ colorScheme: scheme });
      samples.push(...(await inPage(page, textSamples, scheme)));
    }
    return samples;
  },
  judge: (samples) => samples.map(problemOf).filter((problem): problem is string => problem !== null),
};

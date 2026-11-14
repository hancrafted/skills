// prefers-reduced-motion honoured: reloaded with `reduce`, the page runs no animation, transitions no movement
// (transform, position, margin or `all`), scrolls without smoothing, and its screen holds still after loading,
// which also catches script-driven motion such as GSAP. Anything of a millisecond or less counts as instant.
import type { Page } from '@playwright/test';
import type { Check } from '../grader/check.ts';
import { describeElement, type ElementFacts } from '../grader/element.pure.ts';
import { inPage, type Kit } from '../grader/in-page.ts';

interface Motion {
  readonly facts: ElementFacts;
  readonly duration: number;
}

interface Observation {
  readonly animations: readonly (Motion & { readonly name: string })[];
  readonly transitions: readonly (Motion & { readonly property: string })[];
  readonly smoothScroll: boolean;
  /** Two screenshots half a second apart differ. */
  readonly moving: boolean;
}

const INSTANT_MS = 1;
// A fixed interval, not a wait: motion is change over time, so holding still is measured across it.
const STILLNESS_MS = 500;
const REDUCE = 'under prefers-reduced-motion: reduce';

/** Runs in the page: every animation still running after load. */
function runningAnimations(kit: Kit): Observation['animations'] {
  return document
    .getAnimations()
    .filter((animation) => animation.playState === 'running')
    .map((animation) => {
      const { animationName, transitionProperty } = animation as Animation & Partial<CSSAnimation & CSSTransition>;
      const effect = animation.effect as KeyframeEffect;
      return {
        facts: kit.facts(effect.target ?? document.documentElement),
        name: animationName || transitionProperty || animation.id || 'script animation',
        duration: Number(effect.getTiming().duration) || 0,
      };
    });
}

/** Runs in the page: every element set to transition a property that moves it, with that transition's duration. */
function motionTransitions(kit: Kit): Observation['transitions'] {
  const MOVES = /^(all|transform|translate|rotate|scale|top|right|bottom|left|inset.*|margin.*)$/;
  const ms = (time: string) => parseFloat(time) * (time.trim().endsWith('ms') ? 1 : 1000);
  return [...document.querySelectorAll('*')].flatMap((element) => {
    const style = getComputedStyle(element);
    const durations = style.transitionDuration.split(',').map(ms);
    const moving = style.transitionProperty
      .split(',')
      .map((property, index) => ({ property: property.trim(), duration: durations[index % durations.length] }))
      .find(({ property, duration }) => MOVES.test(property) && duration > 0);
    return moving === undefined ? [] : [{ facts: kit.facts(element), ...moving }];
  });
}

const smoothScroll = (): boolean =>
  [document.documentElement, document.body].some((element) => getComputedStyle(element).scrollBehavior === 'smooth');

async function moving(page: Page): Promise<boolean> {
  const first = await page.screenshot();
  await page.waitForTimeout(STILLNESS_MS);
  return !first.equals(await page.screenshot());
}

export const check: Check<Observation> = {
  id: 'reduced-motion',
  summary: 'Under prefers-reduced-motion: reduce, nothing animates, moves by transition or scrolls smoothly.',
  async observe({ page }) {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload({ waitUntil: 'networkidle' });
    return {
      animations: await inPage(page, runningAnimations, null),
      transitions: await inPage(page, motionTransitions, null),
      smoothScroll: await page.evaluate(smoothScroll),
      moving: await moving(page),
    };
  },
  judge: ({ animations, transitions, smoothScroll, moving: screenMoves }) => [
    ...animations
      .filter(({ duration }) => duration > INSTANT_MS)
      .map(
        ({ facts, name, duration }) =>
          `${describeElement(facts)} still runs animation "${name}" (${duration}ms) ${REDUCE}`,
      ),
    ...transitions
      .filter(({ duration }) => duration > INSTANT_MS)
      .map(
        ({ facts, property, duration }) =>
          `${describeElement(facts)} still transitions ${property} over ${duration}ms ${REDUCE}`,
      ),
    ...(smoothScroll ? [`the page still scrolls smoothly ${REDUCE}; set scroll-behavior: auto there`] : []),
    ...(screenMoves
      ? [`the page still moves on screen half a second after loading ${REDUCE}; stop script-driven motion there`]
      : []),
  ],
};

import type { Check } from '../grader/check.ts';
import { describeElement, type ElementFacts } from '../grader/element.pure.ts';
import { inPage, type Kit } from '../grader/in-page.ts';

interface PickControl {
  readonly facts: ElementFacts;
  readonly width: number;
  readonly height: number;
  readonly label: string;
}

interface PickOption {
  readonly item: string;
  readonly option: string;
  readonly controls: readonly PickControl[];
  readonly hidden?: boolean;
}

interface Observation {
  readonly options: readonly PickOption[];
}

const MIN_TARGET = 44;
const CONTROLS =
  'input[type="radio"], input[type="checkbox"], select, button[aria-pressed], [role="radio"], [role="checkbox"]';

function pickOptions(kit: Kit, selector: string): PickOption[] {
  return [...document.querySelectorAll('[data-option]')].map((option) => {
    const controls = kit.tiedControls(option, selector).map((control) => ({
      facts: kit.facts(control),
      ...kit.hitArea(control),
    }));
    const item = option.closest('[data-item]')?.getAttribute('data-item') ?? '';
    return { item, option: option.getAttribute('data-option') ?? '', controls, hidden: !kit.shown(option) };
  });
}

const area = ({ width, height }: PickControl): number => Math.floor(width) * Math.floor(height);
const sizeOf = ({ width, height }: PickControl): string => `${Math.floor(width)} × ${Math.floor(height)}`;
const bigEnough = ({ width, height }: PickControl): boolean =>
  Math.floor(width) >= MIN_TARGET && Math.floor(height) >= MIN_TARGET;
const labelled = ({ label }: PickControl): boolean => label.trim() !== '';

function problemsOf({ item, option, controls }: PickOption): string[] {
  if (controls.length === 0)
    return [
      `option "${option}" in item "${item}" has no pick control; give it a radio, checkbox, select or button[aria-pressed] inside it, or one whose value is "${option}"`,
    ];
  if (controls.some((control) => bigEnough(control) && labelled(control))) return [];
  const best = [...controls].sort((a, b) => area(b) - area(a))[0];
  const subject = `option "${option}" in item "${item}": its pick control ${describeElement(best.facts)}`;
  return [
    ...(bigEnough(best)
      ? []
      : [`${subject} has a ${sizeOf(best)} px hit area; make it at least ${MIN_TARGET} × ${MIN_TARGET} px`]),
    ...(labelled(best) ? [] : [`${subject} shows no text label; an aria-label is not shown, so add visible text`]),
  ];
}

export const check: Check<Observation> = {
  id: 'pick-target',
  summary:
    'Every Option has a pick control (radio, checkbox, select or button[aria-pressed] inside it or valued with its id) with a hit area of at least 44 × 44 px and a visible text label.',
  modes: ['decide'],
  async observe({ page }) {
    return { options: await inPage(page, pickOptions, CONTROLS) };
  },
  judge: ({ options }) => options.filter(({ hidden }) => hidden !== true).flatMap(problemsOf),
};

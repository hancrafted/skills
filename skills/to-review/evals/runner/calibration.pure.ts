// A case's frozen calibration answers, read for what the grader must be told: the one fidelity rung its Fidelity
// line asks for every item. A sweep variant rewrites only that rung, so variants differ in nothing else.
import { asFidelityRung, type Asked, type FidelityRung } from '../../scripts/grader/check.ts';

/** `- **Fidelity:** `<rung>` for every item`: the one form that asks a single rung of every item. */
const UNIFORM = /^(- \*\*Fidelity:\*\* `)([a-z]+)(` for every item\b)/m;

/** What the calibration asks that a check compares with; empty when it asks no single rung on the ladder. */
export function askedOf(calibration: string): Asked {
  const fidelity = asFidelityRung(UNIFORM.exec(calibration)?.[2]);
  return fidelity === null ? {} : { fidelity };
}

/** The calibration asking `rung` for every item; throws when it asks no single rung to replace. */
export function atRung(calibration: string, rung: FidelityRung): string {
  if (askedOf(calibration).fidelity === undefined)
    throw new Error('the calibration asks no single fidelity rung for every item, so it has none to vary');
  return calibration.replace(UNIFORM, `$1${rung}$3`);
}

// The fidelity sweep's report: per rung a case was asked for, how many runs' pages honoured that rung, and
// how the checklist judge and the reader probe scored them. It reads each run's grading.json expectations only.
import { FIDELITY_RUNGS, type FidelityRung } from '../../scripts/grader/check.ts';

/** One graded sweep run: the rung its calibration asked for and its grading.json expectations. */
export interface SweepRun {
  readonly rung: FidelityRung;
  readonly expectations: readonly { readonly text: string; readonly passed: boolean }[];
}

/** Items passed out of items graded, summed over the rung's runs. */
export interface Score {
  readonly passed: number;
  readonly total: number;
}

export interface RungReport {
  readonly rung: FidelityRung;
  readonly runs: number;
  /** Runs whose page built every item at the rung asked; a run without the verdict did not. */
  readonly honoured: number;
  readonly judge: Score;
  readonly probe: Score;
}

const HONOURED = 'mechanical fidelity-match:';

function scoreOf(runs: readonly SweepRun[], prefix: string): Score {
  const graded = runs.flatMap((run) => run.expectations.filter(({ text }) => text.startsWith(prefix)));
  return { passed: graded.filter(({ passed }) => passed).length, total: graded.length };
}

/** One row per rung that ran, in ladder order. */
export function sweepReport(runs: readonly SweepRun[]): RungReport[] {
  return FIDELITY_RUNGS.flatMap((rung) => {
    const atRung = runs.filter((run) => run.rung === rung);
    if (atRung.length === 0) return [];
    const honoured = atRung.filter((run) =>
      run.expectations.some(({ text, passed }) => text.startsWith(HONOURED) && passed),
    ).length;
    return [
      { rung, runs: atRung.length, honoured, judge: scoreOf(atRung, 'judge '), probe: scoreOf(atRung, 'probe ') },
    ];
  });
}

const shown = ({ passed, total }: Score): string =>
  total === 0 ? '–' : `${passed}/${total} (${Math.round((passed / total) * 100)}%)`;

export function sweepMarkdown(rows: readonly RungReport[]): string {
  return [
    '| Rung | Runs | Rung honoured | Judge | Probe |',
    '| --- | --- | --- | --- | --- |',
    ...rows.map(
      ({ rung, runs, honoured, judge, probe }) =>
        `| ${rung} | ${runs} | ${honoured}/${runs} | ${shown(judge)} | ${shown(probe)} |`,
    ),
  ].join('\n');
}

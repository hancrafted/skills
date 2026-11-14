// How consistent repeated runs are, per case and arm: the pass rate as mean ± stddev, and pass^k per assertion,
// the chance that k fresh runs all pass it. skill-creator's aggregation gives mean ± stddev per arm across every case
// and no pass^k, so this reads its benchmark.json `runs` and adds both.

/** One entry of benchmark.json `runs`, as skill-creator's aggregation writes it. */
export interface BenchmarkRun {
  readonly eval_id: number;
  readonly eval_name?: string;
  readonly configuration: string;
  readonly run_number: number;
  readonly result: { readonly pass_rate: number };
  readonly expectations: readonly { readonly text: string; readonly passed: boolean; readonly evidence?: string }[];
}

export interface AssertionConsistency {
  readonly text: string;
  /** Runs in which the assertion passed; a run without it counts as failed. */
  readonly passed: number;
  /** C(passed, k) / C(runs, k); null when the case and arm ran fewer than k times. */
  readonly pass_k: number | null;
}

export interface CaseArmConsistency {
  readonly case: string;
  readonly arm: string;
  readonly runs: number;
  /** Sample stddev, as skill-creator computes it. */
  readonly pass_rate: { readonly mean: number; readonly stddev: number };
  readonly assertions: readonly AssertionConsistency[];
}

const round = (value: number) => Math.round(value * 10000) / 10000;

function choose(n: number, k: number): number {
  let result = 1;
  for (let i = 0; i < k; i += 1) result = (result * (n - i)) / (i + 1);
  return result;
}

function meanAndStddev(values: readonly number[]) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.length > 1 ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1) : 0;
  return { mean: round(mean), stddev: round(Math.sqrt(variance)) };
}

function ofGroup(group: readonly BenchmarkRun[], k: number): CaseArmConsistency {
  const [first] = group;
  const texts = [...new Set(group.flatMap((run) => run.expectations.map(({ text }) => text)))];
  const n = group.length;
  return {
    case: first.eval_name ?? String(first.eval_id),
    arm: first.configuration,
    runs: n,
    pass_rate: meanAndStddev(group.map((run) => run.result.pass_rate)),
    assertions: texts.map((text) => {
      const passed = group.filter((run) => run.expectations.some((e) => e.text === text && e.passed)).length;
      return { text, passed, pass_k: n < k ? null : round(choose(passed, k) / choose(n, k)) };
    }),
  };
}

/** One row per case and arm, by case, then arm. */
export function consistency(runs: readonly BenchmarkRun[], k: number): CaseArmConsistency[] {
  const groups = new Map<string, BenchmarkRun[]>();
  for (const run of runs) {
    const key = `${run.eval_id}\0${run.configuration}`;
    groups.set(key, [...(groups.get(key) ?? []), run]);
  }
  const order = (run: BenchmarkRun) => [run.eval_id, run.configuration] as const;
  const sorted = [...groups.values()].sort((a, b) => {
    const [caseA, armA] = order(a[0]);
    const [caseB, armB] = order(b[0]);
    return caseA - caseB || armA.localeCompare(armB);
  });
  return sorted.map((group) => ofGroup(group, k));
}

const percent = (value: number) => `${Math.round(value * 100)}%`;

/** One line per case and arm for benchmark.json `notes`, which skill-creator's viewer lists. */
export function consistencyNotes(rows: readonly CaseArmConsistency[], k: number): string[] {
  return rows.map(({ case: id, arm, runs, pass_rate, assertions }) => {
    const rate = `pass rate ${percent(pass_rate.mean)} ± ${percent(pass_rate.stddev)} over ${runs} run${runs === 1 ? '' : 's'}`;
    const held = assertions.filter((assertion) => assertion.pass_k === 1).length;
    const passK = runs < k ? `pass^${k} needs ${k} runs` : `pass^${k} on ${held} of ${assertions.length} assertions`;
    return `${id} · ${arm}: ${rate}; ${passK}`;
  });
}

const VS_REFERENCE = 'vs-reference ';

/**
 * One line per case and arm graded against a reference page: the `vs-reference` items passed, summed over the runs.
 * An item passes when the run is not worse than the reference in both orders.
 */
export function referenceNotes(runs: readonly BenchmarkRun[]): string[] {
  const groups = new Map<string, BenchmarkRun[]>();
  for (const run of runs) {
    if (!run.expectations.some(({ text }) => text.startsWith(VS_REFERENCE))) continue;
    const key = `${run.eval_id}\0${run.configuration}`;
    groups.set(key, [...(groups.get(key) ?? []), run]);
  }
  return [...groups.values()]
    .sort((a, b) => a[0].eval_id - b[0].eval_id || a[0].configuration.localeCompare(b[0].configuration))
    .map((group) => {
      const items = group.flatMap((run) => run.expectations.filter(({ text }) => text.startsWith(VS_REFERENCE)));
      const passed = items.filter((item) => item.passed).length;
      const n = group.length;
      return `${group[0].eval_name ?? group[0].eval_id} · ${group[0].configuration}: vs-reference ${passed} of ${items.length} items not worse than the reference (${percent(passed / items.length)}) over ${n} run${n === 1 ? '' : 's'}`;
    });
}

/** The per-assertion pass^k table appended to benchmark.md. */
export function consistencyTable(rows: readonly CaseArmConsistency[], k: number): string {
  const lines = rows.flatMap(({ case: id, arm, runs, assertions }) =>
    assertions.map(
      ({ text, passed, pass_k }) =>
        `| ${id} | ${arm} | ${text.replaceAll('|', '\\|')} | ${passed}/${runs} | ${pass_k ?? `needs ${k} runs`} |`,
    ),
  );
  return [
    '## Consistency',
    '',
    `pass^${k} is the chance that ${k} fresh runs all pass, estimated as C(passed, ${k}) / C(runs, ${k}).`,
    '',
    `| Case | Arm | Assertion | Passed | pass^${k} |`,
    '| --- | --- | --- | --- | --- |',
    ...lines,
  ].join('\n');
}

// Reuses skill-creator's aggregation and viewer in place, from the installed plugin. It never copies them: the
// benchmark comes from aggregate_benchmark's own functions, then gains the case names, model and run count it
// cannot know, and the consistency across repeated runs it does not compute; the viewer renders it as one page.
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import {
  consistency,
  consistencyNotes,
  consistencyTable,
  referenceNotes,
  type BenchmarkRun,
} from './consistency.pure.ts';
import { withPageLinks, type PageLinks } from './review-links.pure.ts';

const PLUGINS = path.join(homedir(), '.claude', 'plugins', 'cache');

/** `SKILL_CREATOR_DIR`, else the most recently installed skill-creator in the plugin cache. */
export function skillCreatorDir(): string {
  const fromEnv = process.env.SKILL_CREATOR_DIR;
  if (fromEnv !== undefined) return fromEnv;
  const installs = existsSync(PLUGINS)
    ? readdirSync(PLUGINS).flatMap((market) => {
        const plugin = path.join(PLUGINS, market, 'skill-creator');
        if (!existsSync(plugin)) return [];
        return readdirSync(plugin).map((version) => path.join(plugin, version, 'skills', 'skill-creator'));
      })
    : [];
  const found = installs.filter((dir) => existsSync(path.join(dir, 'scripts', 'aggregate_benchmark.py')));
  if (found.length === 0) throw new Error('skill-creator is not installed; set SKILL_CREATOR_DIR to its skill folder');
  return found.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
}

/** skill-creator's scripts need Python 3.10 or newer; macOS's own python3 is older. */
export function python(): string {
  const candidates = [process.env.EVAL_PYTHON, 'python3', 'python3.14', 'python3.13', 'python3.12', 'python3.11'];
  const ok = (bin: string) =>
    spawnSync(bin, ['-c', 'import sys; sys.exit(sys.version_info < (3, 10))'], { stdio: 'ignore' }).status === 0;
  const found = candidates.find((bin): bin is string => bin !== undefined && ok(bin));
  if (found === undefined) throw new Error('skill-creator needs Python 3.10+; set EVAL_PYTHON to one');
  return found;
}

const AGGREGATE = `
import json, sys
from pathlib import Path
sys.path.insert(0, sys.argv[1])
from aggregate_benchmark import generate_benchmark
iteration, extra = Path(sys.argv[2]), json.loads(sys.argv[3])
benchmark = generate_benchmark(iteration, extra["skill_name"], extra["skill_path"])
benchmark["metadata"].update(extra["metadata"])
for run in benchmark["runs"]:
    run["eval_name"] = extra["eval_names"].get(str(run["eval_id"]), str(run["eval_id"]))
(iteration / "benchmark.json").write_text(json.dumps(benchmark, indent=2) + "\\n")
`;

const MARKDOWN = `
import json, sys
from pathlib import Path
sys.path.insert(0, sys.argv[1])
from aggregate_benchmark import generate_markdown
iteration = Path(sys.argv[2])
benchmark = json.loads((iteration / "benchmark.json").read_text())
(iteration / "benchmark.md").write_text(generate_markdown(benchmark) + "\\n")
`;

/** The k of pass^k: how many fresh runs must all pass an assertion. */
const PASS_K = 3;

/** Adds pass rate per case and arm and pass^k per assertion: `consistency`, and one note per case and arm. */
function addConsistency(benchmarkFile: string): string {
  const benchmark = JSON.parse(readFileSync(benchmarkFile, 'utf8')) as { runs: BenchmarkRun[]; notes: string[] };
  const rows = consistency(benchmark.runs, PASS_K);
  const augmented = {
    ...benchmark,
    notes: [...benchmark.notes, ...consistencyNotes(rows, PASS_K), ...referenceNotes(benchmark.runs)],
    consistency: { k: PASS_K, cases: rows },
  };
  writeFileSync(benchmarkFile, `${JSON.stringify(augmented, null, 2)}\n`);
  return consistencyTable(rows, PASS_K);
}

/** Every run folder's pages/*.html under the iteration, keyed by the viewer's run id. */
function pageLinks(iteration: string): PageLinks {
  const pages = readdirSync(iteration, { recursive: true, withFileTypes: true }).filter(
    (entry) => entry.isFile() && entry.name.endsWith('.html') && path.basename(entry.parentPath) === 'pages',
  );
  const links: Record<string, string[]> = {};
  for (const page of pages) {
    const run = path.relative(iteration, path.dirname(page.parentPath));
    (links[run.split(path.sep).join('-')] ??= []).push(path.relative(iteration, path.join(page.parentPath, page.name)));
  }
  return links;
}

export interface BenchmarkFacts {
  readonly skillPath: string;
  readonly model: string;
  readonly runs: number;
  /** skill-creator's numeric eval id → case id. */
  readonly evalNames: Readonly<Record<string, string>>;
}

/** Writes benchmark.json, benchmark.md and review.html into the iteration folder; returns the review's path. */
export function aggregateAndView(iteration: string, facts: BenchmarkFacts): string {
  const dir = skillCreatorDir();
  const bin = python();
  const extra = {
    skill_name: 'to-decision-html',
    skill_path: facts.skillPath,
    metadata: { executor_model: facts.model, analyzer_model: 'none', runs_per_configuration: facts.runs },
    eval_names: facts.evalNames,
  };
  execFileSync(bin, ['-I', '-c', AGGREGATE, path.join(dir, 'scripts'), iteration, JSON.stringify(extra)]);
  const benchmark = path.join(iteration, 'benchmark.json');
  const table = addConsistency(benchmark);
  execFileSync(bin, ['-I', '-c', MARKDOWN, path.join(dir, 'scripts'), iteration]);
  appendFileSync(path.join(iteration, 'benchmark.md'), `\n${table}\n`);
  const review = path.join(iteration, 'review.html');
  const viewer = path.join(dir, 'eval-viewer', 'generate_review.py');
  execFileSync(bin, [
    '-I',
    viewer,
    iteration,
    '--skill-name',
    'to-decision-html',
    '--benchmark',
    benchmark,
    '--static',
    review,
  ]);
  writeFileSync(review, withPageLinks(readFileSync(review, 'utf8'), pageLinks(iteration)));
  return review;
}

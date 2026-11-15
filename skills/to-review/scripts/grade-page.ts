// `node scripts/grade-page.ts [--fidelity <rung>] <page.html>`: grades one decision page against every check in
// checks/ at 1440 and 1024 px with networking blocked. `--fidelity` names the rung the page's caller asked for every
// item; without it, fidelity-match skips. Prints the report as JSON; exits 0 when every check passes or skips, 1
// when one fails, 2 when the page cannot be graded.
import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { asFidelityRung, FIDELITY_RUNGS } from './grader/check.ts';
import { loadChecks } from './grader/registry.ts';
import { gradeFile, launch } from './grader/run.ts';

const USAGE = `usage: node scripts/grade-page.ts [--fidelity ${FIDELITY_RUNGS.join('|')}] <page.html>`;

/** The page and what was asked of it, or null when the command line is not one page and an optional known rung. */
function parsed() {
  const { values, positionals } = parseArgs({ options: { fidelity: { type: 'string' } }, allowPositionals: true });
  const [file, ...extra] = positionals;
  if (file === undefined || extra.length > 0 || !existsSync(file)) return null;
  if (values.fidelity === undefined) return { file, asked: {} };
  const fidelity = asFidelityRung(values.fidelity);
  return fidelity === null ? null : { file, asked: { fidelity } };
}

let target: ReturnType<typeof parsed> = null;
try {
  target = parsed();
} catch {
  // An unknown option: the usage below says what is accepted.
}
if (target === null) {
  console.error(USAGE);
  process.exit(2);
}
const browser = await launch();
try {
  const report = await gradeFile(browser, await loadChecks(), target);
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.pass ? 0 : 1;
} catch (error) {
  console.error(`cannot grade ${target.file}: ${(error as Error).message}`);
  process.exitCode = 2;
} finally {
  await browser.close();
}

import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { asFidelityRung, FIDELITY_RUNGS } from './grader/check.ts';
import { loadChecks } from './grader/registry.ts';
import { gradeFile, launch } from './grader/run.ts';

const USAGE = `usage: node scripts/grade-page.ts [--fidelity ${FIDELITY_RUNGS.join('|')}] <page.html>`;

function parsedArguments() {
  let args;
  try {
    args = parseArgs({ options: { fidelity: { type: 'string' } }, allowPositionals: true });
  } catch {
    return null;
  }
  const { values, positionals } = args;
  const [file, ...extra] = positionals;
  if (file === undefined || extra.length > 0 || !existsSync(file)) return null;
  if (values.fidelity === undefined) return { file, asked: {} };
  const fidelity = asFidelityRung(values.fidelity);
  return fidelity === null ? null : { file, asked: { fidelity } };
}

const target = parsedArguments();
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

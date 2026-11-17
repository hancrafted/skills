import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { FIXTURE_ASKED, fixtureNames, fixturePage } from './grader/fixtures.ts';
import { loadChecks } from './grader/registry.ts';
import { proofOf, type Proof } from './grader/report.pure.ts';
import { gradeFile, launch } from './grader/run.ts';

const checks = await loadChecks();
const dir = mkdtempSync(path.join(tmpdir(), 'decision-page-fixtures-'));
const browser = await launch();
const proofs: Proof[] = [];
try {
  for (const name of fixtureNames()) {
    const file = path.join(dir, `${name}.html`);
    writeFileSync(file, fixturePage(name));
    proofs.push(proofOf(name, await gradeFile(browser, checks, { file, asked: FIXTURE_ASKED })));
  }
} finally {
  await browser.close();
  rmSync(dir, { recursive: true, force: true });
}
console.log(JSON.stringify(proofs, null, 2));
process.exitCode = proofs.every((proof) => proof.proves) ? 0 : 1;

// decision: ARCH-003 §4
import { readFileSync } from 'node:fs';
import { overBudget, type VitestJsonReport } from './over-budget.pure.ts';

const [reportPath, budget] = process.argv.slice(2);
if (!reportPath || !budget || !Number.isFinite(Number(budget))) {
  console.error('usage: node tools/test-budget/over-budget.ts <vitest-json-report> <budget-ms>');
  process.exit(2);
}
const report = JSON.parse(readFileSync(reportPath, 'utf8')) as VitestJsonReport;
for (const { file, test, ms } of overBudget(report, Number(budget), process.cwd())) {
  console.log(`- ${(ms / 1000).toFixed(1)} s — \`${file}\` — ${test}`);
}

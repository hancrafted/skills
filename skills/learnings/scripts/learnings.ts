import { learningsReport, realGh, run } from './store/index.ts';

const root = run('git', ['rev-parse', '--show-toplevel']).stdout.trim();
if (root === '') {
  console.error('✖ learnings runs inside a git repository');
  process.exit(1);
}
const today = new Date().toISOString().slice(0, 'YYYY-MM-DD'.length);
const { output, exit } = learningsReport(root, process.argv.slice(2), { gh: realGh, today });
if (exit === 0) console.log(output);
else console.error(output);
process.exit(exit);

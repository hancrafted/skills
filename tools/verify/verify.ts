// `npm run verify` and `npm run verify:commit`: runs the plan verify.pure.ts names, one phase at a time, and exits 1
// naming the failed steps. `node tools/verify/verify.ts` runs the full plan; `node tools/verify/verify.ts commit` the commit plan.
import { runCommand } from './run-command.ts';
import { COMMIT_PLAN, runPlan, VERIFY_PLAN } from './verify.pure.ts';

const commit = process.argv[2] === 'commit';
const passed = await runPlan(commit ? COMMIT_PLAN : VERIFY_PLAN, runCommand, (text) => console.log(text));
if (!passed) process.exit(1);

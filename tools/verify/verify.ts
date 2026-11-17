import { runCommand } from './run-command.ts';
import { COMMIT_PLAN, runPlan, VERIFY_PLAN } from './verify.pure.ts';

const commit = process.argv[2] === 'commit';
const passed = await runPlan(commit ? COMMIT_PLAN : VERIFY_PLAN, runCommand, (text) => console.log(text));
if (!passed) process.exit(1);

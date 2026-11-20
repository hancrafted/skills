import { logCommandAtExit } from './core/index.ts';
import { runDispatch } from './dispatch/index.ts';
import { runGuard } from './guard/index.ts';
import { runLearnings } from './learnings/index.ts';
import { runPr } from './pr/index.ts';
import { runPush } from './push/index.ts';
import { runSetup } from './setup/index.ts';
import { runStatus } from './status/index.ts';
import { runTranscript } from './transcript/index.ts';
import { DRIVE_USAGE } from './usage.pure.ts';
import { runWorktree } from './worktree/index.ts';

const SCRIPTS_ROOT = import.meta.dirname;
const [group, ...rest] = process.argv.slice(2);
logCommandAtExit(process.argv.slice(2));
if (group === 'worktree') await runWorktree(rest, SCRIPTS_ROOT);
else if (group === 'setup') runSetup(rest, SCRIPTS_ROOT);
else if (group === 'guard') runGuard(rest, SCRIPTS_ROOT);
else if (group === 'push') runPush(rest, SCRIPTS_ROOT);
else if (group === 'pr') await runPr(rest);
else if (group === 'learnings') runLearnings(rest);
else if (group === 'transcript') runTranscript(rest);
else if (group === 'dispatch') runDispatch(rest, SCRIPTS_ROOT);
else if (group === 'status') runStatus(rest, SCRIPTS_ROOT);
else {
  console.error(`✖ unknown group '${group ?? ''}'; usage: ${DRIVE_USAGE}`);
  process.exit(1);
}

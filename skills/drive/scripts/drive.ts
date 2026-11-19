import { runDispatch } from './dispatch.ts';
import { runGuard } from './guard.ts';
import { runLearnings } from './learnings.ts';
import { logCommandAtExit } from './log.ts';
import { runPr } from './pr-watch.ts';
import { runPush } from './push.ts';
import { runSetup } from './setup.ts';
import { runStatus } from './status.ts';
import { runTranscript } from './transcript.ts';
import { DRIVE_USAGE } from './usage.pure.ts';
import { runWorktree } from './worktree.ts';

const [group, ...rest] = process.argv.slice(2);
logCommandAtExit(process.argv.slice(2));
if (group === 'worktree') await runWorktree(rest);
else if (group === 'setup') runSetup(rest);
else if (group === 'guard') runGuard(rest);
else if (group === 'push') runPush(rest);
else if (group === 'pr') await runPr(rest);
else if (group === 'learnings') runLearnings(rest);
else if (group === 'transcript') runTranscript(rest);
else if (group === 'dispatch') runDispatch(rest);
else if (group === 'status') runStatus(rest);
else {
  console.error(`✖ unknown group '${group ?? ''}'; usage: ${DRIVE_USAGE}`);
  process.exit(1);
}

import { readFileSync } from 'node:fs';
import {
  agentTranscriptOf,
  firstUserText,
  type HookPayload,
  isHookMode,
  subagentEntry,
  subagentTopic,
  topicOfIntegration,
} from './claude-adapter.pure.ts';
import { run } from './git.ts';
import { appendLog, branchOf, configuredWorktree } from './log.ts';

function briefOf(payload: HookPayload): string | null {
  try {
    return firstUserText(readFileSync(agentTranscriptOf(payload) ?? '', 'utf8'));
  } catch {
    return null;
  }
}

function integrationTopic(cwd: string): string | null {
  const listing = run('git', ['worktree', 'list', '--porcelain'], { cwd });
  const dir = configuredWorktree(cwd)?.dir ?? '.worktrees';
  return listing.status === 0 ? topicOfIntegration(listing.stdout, dir) : null;
}

const mode = process.argv[2];
try {
  if (isHookMode(mode)) {
    const payload = JSON.parse(readFileSync(0, 'utf8')) as HookPayload;
    const cwd = payload.cwd ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
    const branch = branchOf(cwd);
    const topic = subagentTopic({
      cwdBranch: branch,
      brief: briefOf(payload),
      integration: () => integrationTopic(cwd),
    });
    appendLog(cwd, topic, subagentEntry(mode, payload, { branch, now: new Date() }));
  }
} catch {
  process.exitCode = 0;
}

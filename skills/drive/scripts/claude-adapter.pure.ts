import { isIntegrationBranch, topicSlugOf } from './branch-topic.pure.ts';
import type { SubagentEntry } from './log.pure.ts';
import { SCRATCH } from './log.pure.ts';

export interface HookPayload {
  session_id: string;
  transcript_path: string;
  agent_transcript_path?: string;
  cwd?: string;
  agent_id?: string;
}

export type HookMode = 'start' | 'stop';

export const isHookMode = (value: string | undefined): value is HookMode => value === 'start' || value === 'stop';

export function agentTranscriptOf(payload: HookPayload): string | null {
  if (payload.agent_transcript_path !== undefined) return payload.agent_transcript_path;
  if (payload.agent_id === undefined) return null;
  return `${payload.transcript_path.replace(/\.jsonl$/, '')}/subagents/agent-${payload.agent_id}.jsonl`;
}

export function subagentEntry(
  mode: HookMode,
  payload: HookPayload,
  when: { branch: string | null; now: Date },
): SubagentEntry {
  return {
    t: when.now.toISOString(),
    event: mode === 'start' ? 'subagent-start' : 'subagent-stop',
    session: payload.session_id,
    transcript: agentTranscriptOf(payload) ?? payload.transcript_path,
    parent: payload.transcript_path,
    agent: payload.agent_id ?? null,
    branch: when.branch,
  };
}

const BRIEF_PATH = new RegExp(`${SCRATCH.replaceAll('.', String.raw`\.`)}/([^/\\s"'\\\\]+)/`);

export const topicOfBrief = (text: string | null): string | null => BRIEF_PATH.exec(text ?? '')?.[1] ?? null;

export function firstUserText(transcript: string): string | null {
  for (const raw of transcript.split('\n')) {
    try {
      const line = JSON.parse(raw) as {
        type?: string;
        message?: { content?: unknown };
      };
      if (line.type === 'user') return JSON.stringify(line.message?.content ?? '');
    } catch {
      continue;
    }
  }
  return null;
}

const WORKTREE = 'worktree ';
const BRANCH = 'branch refs/heads/';

function worktreeBranches(porcelain: string): { dir: string; branch: string }[] {
  const found: { dir: string; branch: string }[] = [];
  let dir = '';
  for (const line of porcelain.split('\n')) {
    if (line.startsWith(WORKTREE)) dir = line.slice(WORKTREE.length);
    if (line.startsWith(BRANCH)) found.push({ dir, branch: line.slice(BRANCH.length) });
  }
  return found;
}

export function topicOfIntegration(porcelain: string, worktreeDir: string): string | null {
  const inside = `/${worktreeDir.replace(/^\/+|\/+$/g, '')}/`;
  const topics = worktreeBranches(porcelain)
    .filter((entry) => entry.dir.includes(inside) && isIntegrationBranch(entry.branch))
    .map((entry) => topicSlugOf(entry.branch));
  const unique = new Set(topics.filter((topic) => topic !== null));
  return unique.size === 1 ? ([...unique][0] ?? null) : null;
}

export function subagentTopic(facts: {
  cwdBranch: string | null;
  brief: string | null;
  integration: () => string | null;
}): string | null {
  return topicSlugOf(facts.cwdBranch) ?? topicOfBrief(facts.brief) ?? facts.integration();
}

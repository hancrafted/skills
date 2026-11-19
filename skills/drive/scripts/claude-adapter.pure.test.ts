import { describe, expect, it } from 'vitest';
import {
  agentTranscriptOf,
  firstUserText,
  isHookMode,
  subagentEntry,
  subagentTopic,
  topicOfBrief,
  topicOfIntegration,
} from './claude-adapter.pure.ts';
const brief = JSON.stringify('Save to /r/.scratch/sweep/x.brief.md first');
const integration = () => 'fallback';
const entry = (dir: string, branch: string) => `worktree ${dir}\nHEAD abc\nbranch refs/heads/${branch}\n\n`;

describe('success cases', () => {
  describe('subagentEntry', () => {
    it('links the session, the Subagent transcript, its parent and the branch to the topic log', () => {
      // ARRANGE
      const payload = {
        session_id: 's1',
        transcript_path: '/t/s1.jsonl',
        agent_transcript_path: '/t/s1/subagents/agent-a1.jsonl',
        agent_id: 'a1',
      };
      const branch = 'chore/x--1-y';
      // ACT
      const entry = subagentEntry('stop', payload, {
        branch,
        now: new Date('2026-11-19T10:00:00Z'),
      });
      // ASSERT
      expect(entry).toEqual({
        t: '2026-11-19T10:00:00.000Z',
        event: 'subagent-stop',
        session: payload.session_id,
        transcript: payload.agent_transcript_path,
        parent: payload.transcript_path,
        agent: payload.agent_id,
        branch,
      });
    });

    it('knows its two modes', () => {
      // ARRANGE
      const values = ['start', 'stop', 'read'];
      // ACT
      const known = values.map(isHookMode);
      // ASSERT
      expect(known).toEqual([true, true, false]);
    });
  });
  describe('subagentTopic', () => {
    it('prefers the cwd branch, then the brief path, then the Integration worktree', () => {
      // ARRANGE
      const onTask = { cwdBranch: 'chore/own--1-a', brief, integration };
      const onMain = { cwdBranch: 'main', brief, integration };
      const unknown = { cwdBranch: 'main', brief: null, integration };
      // ACT
      const topics = [onTask, onMain, unknown].map(subagentTopic);
      // ASSERT
      expect(topics).toEqual(['own', 'sweep', 'fallback']);
    });
  });
});

describe('failure cases', () => {
  describe('topicOfIntegration', () => {
    it('names the topic only when exactly one Integration worktree sits under the worktree dir', () => {
      // ARRANGE
      const main = entry('/r', 'main');
      const integration = entry('/r/.worktrees/chore-sweep', 'chore/sweep');
      const task = entry('/r/.worktrees/chore-sweep--1-a', 'chore/sweep--1-a');
      const other = entry('/r/.worktrees/feat-other', 'feat/other');
      // ACT
      const one = topicOfIntegration(main + integration + task, '.worktrees');
      const two = topicOfIntegration(main + integration + task + other, '.worktrees');
      const none = topicOfIntegration(main + task, '.worktrees');
      // ASSERT
      expect(one).toBe('sweep');
      expect(two).toBeNull();
      expect(none).toBeNull();
    });
  });
});

describe('edge cases', () => {
  describe('subagentEntry', () => {
    it('derives the Subagent transcript from the parent when the payload has none', () => {
      // ARRANGE
      const payload = {
        session_id: 's1',
        transcript_path: '/t/s1.jsonl',
        agent_id: 'a1',
      };
      const derived = '/t/s1/subagents/agent-a1.jsonl';
      // ACT
      const path = agentTranscriptOf(payload);
      // ASSERT
      expect(path).toBe(derived);
    });
  });
  describe('subagentTopic', () => {
    it('reads the topic from the first brief path and the brief from the first user line', () => {
      // ARRANGE
      const transcript = `${JSON.stringify({ type: 'system' })}\n${JSON.stringify({ type: 'user', message: { content: 'read .scratch/abc/1.brief.md' } })}\n`;
      // ACT
      const topic = topicOfBrief(firstUserText(transcript));
      // ASSERT
      expect(topic).toBe('abc');
      expect(topicOfBrief(null)).toBeNull();
    });
  });
});

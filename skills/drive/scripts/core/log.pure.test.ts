import { describe, expect, it } from 'vitest';
import { commandEntry, isSubagentEntry, logPath, parseLog, serializeEntry, topicOfCommand } from './log.pure.ts';
const task = 'chore/sweep--1-a';
const now = new Date('2026-11-19T10:00:00Z');

describe('success cases', () => {
  describe('logPath', () => {
    it('puts the log under the topic', () => {
      // ARRANGE
      const topic = 't';
      const expected = '.scratch/t/drive.log.jsonl';
      // ACT
      const path = logPath(topic);
      // ASSERT
      expect(path).toBe(expected);
    });
  });
  describe('topicOfCommand', () => {
    it.each([
      { name: 'worktree done <branch> from main', argv: ['worktree', 'done', task], cwd: 'main', topic: 'sweep' },
      {
        name: 'worktree new <branch> from main',
        argv: ['worktree', 'new', task, '--base', 'chore/sweep'],
        cwd: 'main',
        topic: 'sweep',
      },
      { name: '--base alone', argv: ['worktree', 'sync', '--base', 'chore/other'], cwd: 'main', topic: 'other' },
      { name: 'the cwd branch otherwise', argv: ['learnings', 'check'], cwd: 'chore/third--2-b', topic: 'third' },
      { name: 'nothing on main without either', argv: ['learnings', 'check'], cwd: 'main', topic: null },
      { name: 'a flag is no branch', argv: ['worktree', 'done', '--base', 'chore/sweep'], cwd: 'main', topic: 'sweep' },
    ])('reads $name', ({ argv, cwd, topic }) => {
      // ARRANGE
      const expected = topic;
      // ACT
      const read = topicOfCommand(argv, cwd);
      // ASSERT
      expect(read).toBe(expected);
    });
  });
  describe('commandEntry', () => {
    it('records ok on exit 0 and the last error otherwise, preferring the --base flag', () => {
      // ARRANGE
      const facts = {
        argv: ['worktree', 'done', '--base', 'x'],
        branch: 'a/b',
        base: 'main',
        lastError: 'boom',
      };
      // ACT
      const ok = commandEntry({ ...facts, exit: 0 }, now);
      const bad = commandEntry({ ...facts, exit: 1 }, now);
      // ASSERT
      expect(ok).toEqual({
        t: '2026-11-19T10:00:00.000Z',
        cmd: facts.argv.join(' '),
        branch: facts.branch,
        base: 'x',
        exit: 0,
        result: 'ok',
      });
      expect(bad.result).toBe(facts.lastError);
    });
  });
});

describe('failure cases', () => {
  describe('parseLog', () => {
    it('round-trips entries and skips damaged lines', () => {
      // ARRANGE
      const entry = {
        t: 't',
        event: 'subagent-start' as const,
        session: 's',
        transcript: '/p.jsonl',
        agent: 'a',
        branch: 'x/y',
      };
      // ACT
      const parsed = parseLog(`${serializeEntry(entry)}not json\n\n`);
      // ASSERT
      expect(parsed).toEqual([entry]);
      expect(isSubagentEntry(parsed[0]!)).toBe(true);
    });
  });
});

describe('edge cases', () => {
  describe('commandEntry', () => {
    it('derives the base of a task branch from its name and falls back to the configured base on an Integration branch', () => {
      // ARRANGE
      const facts = {
        argv: ['learnings', 'check'],
        base: 'main',
        exit: 0,
        lastError: '',
      };
      // ACT
      const onTask = commandEntry({ ...facts, branch: 'chore/sweep--795-log' }, now);
      const onIntegration = commandEntry({ ...facts, branch: 'chore/sweep' }, now);
      // ASSERT
      expect(onTask.base).toBe('chore/sweep');
      expect(onIntegration.base).toBe(facts.base);
    });

    it('names the branch a worktree command works on, not the checkout it runs from', () => {
      // ARRANGE
      const task = 'chore/sweep--795-log';
      const facts = {
        argv: ['worktree', 'done', task],
        branch: 'main',
        base: 'main',
        exit: 0,
        lastError: '',
      };
      // ACT
      const entry = commandEntry(facts, now);
      // ASSERT
      expect(entry.branch).toBe(task);
      expect(entry.base).toBe('chore/sweep');
    });
  });
});

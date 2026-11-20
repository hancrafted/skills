import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { projectSlug } from '../transcript/index.ts';
import { parseLog } from './log.pure.ts';
for (const name of Object.keys(process.env)) if (name.startsWith('GIT_')) delete process.env[name];
const SCRIPTS = path.resolve(import.meta.dirname, '..');
const node = (script: string, args: string[], run: { cwd: string; env?: Record<string, string>; input?: string }) =>
  spawnSync(process.execPath, [path.join(SCRIPTS, script), ...args], {
    cwd: run.cwd,
    encoding: 'utf8',
    input: run.input,
    env: { ...process.env, ...run.env },
  });
function repo(branch: string | null): string {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'drive-log-')));
  const git = (...args: string[]) =>
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: root });
  git('init', '-q', '-b', 'main');
  git('commit', '-q', '--allow-empty', '-m', 'init');
  if (branch !== null) git('checkout', '-q', '-b', branch);
  return root;
}
const logOf = (root: string, topic: string) =>
  parseLog(readFileSync(path.join(root, '.scratch', topic, 'drive.log.jsonl'), 'utf8'));
const hookFrom = (root: string, transcript: string | null) => {
  const payload = {
    session_id: 's1',
    transcript_path: '/t/s1.jsonl',
    cwd: root,
    agent_id: 'a1',
    ...(transcript === null ? {} : { agent_transcript_path: transcript }),
  };
  return node('harness/claude/adapter.ts', ['stop'], {
    cwd: root,
    input: JSON.stringify(payload),
  });
};

describe('success cases', () => {
  describe('drive event log', () => {
    it('appends one line per command with its exit and error, under the topic of the branch', () => {
      // ARRANGE
      const root = repo('chore/sweep--1-a');
      // ACT
      node('drive.ts', ['nonsense'], { cwd: root });
      node('drive.ts', ['status', 'sweep'], { cwd: root });
      // ASSERT
      const [first, second] = logOf(root, 'sweep');
      expect(first).toMatchObject({
        cmd: 'nonsense',
        branch: 'chore/sweep--1-a',
        exit: 1,
      });
      expect((first as { result: string }).result).toContain("unknown group 'nonsense'");
      expect(second).toMatchObject({ cmd: 'status sweep' });
    });
  });
  describe('claude adapter hook', () => {
    it('logs the session, transcript path and branch of a Subagent start', () => {
      // ARRANGE
      const root = repo('chore/sweep--2-b');
      const payload = JSON.stringify({
        session_id: 's1',
        transcript_path: '/t/s1.jsonl',
        cwd: root,
        agent_id: 'a1',
      });
      // ACT
      const result = node('harness/claude/adapter.ts', ['start'], {
        cwd: root,
        input: payload,
      });
      // ASSERT
      expect(result.status).toBe(0);
      expect(logOf(root, 'sweep')[0]).toMatchObject({
        event: 'subagent-start',
        session: 's1',
        transcript: '/t/s1/subagents/agent-a1.jsonl',
        parent: '/t/s1.jsonl',
        branch: 'chore/sweep--2-b',
      });
    });
  });
  describe('drive transcript', () => {
    it('prints the trimmed session in local time and only new lines with --since-last', () => {
      // ARRANGE
      const root = repo('chore/sweep--3-c');
      const home = realpathSync(mkdtempSync(path.join(tmpdir(), 'drive-home-')));
      const dir = path.join(home, '.claude', 'projects', projectSlug(root));
      mkdirSync(dir, { recursive: true });
      copyFileSync(
        path.join(SCRIPTS, 'transcript', 'fixtures', 'session-93f19e8f.trimmed.jsonl'),
        path.join(dir, 'abc.jsonl'),
      );
      // ACT
      const all = node('drive.ts', ['transcript', 'abc'], {
        cwd: root,
        env: { HOME: home },
      });
      const first = node('drive.ts', ['transcript', 'abc', '--since-last'], {
        cwd: root,
        env: { HOME: home },
      });
      const second = node('drive.ts', ['transcript', 'abc', '--since-last'], {
        cwd: root,
        env: { HOME: home },
      });
      // ASSERT
      expect(all.stdout).toContain('what twekas?');
      expect(all.stdout).toContain('failed (null)');
      expect(all.stdout).toContain('has merge conflicts');
      expect(first.stdout).toBe(all.stdout);
      expect(second.stdout).toBe('');
    });
  });
});

describe('failure cases', () => {
  describe('drive event log', () => {
    it('does not log on a branch without a topic, and never fails the command', () => {
      // ARRANGE
      const root = repo('main2');
      // ACT
      const result = node('drive.ts', ['guard'], { cwd: root });
      // ASSERT
      expect(result.status).toBe(0);
      expect(() => readFileSync(path.join(root, '.scratch'))).toThrow();
    });
  });
  describe('drive transcript', () => {
    it('says so and exits non-zero when --topic finds a log that links no session', () => {
      // ARRANGE
      const root = repo('chore/sweep--3-c');
      const logFile = '.scratch/sweep/drive.log.jsonl';
      mkdirSync(path.join(root, '.scratch', 'sweep'), { recursive: true });
      writeFileSync(path.join(root, logFile), `${JSON.stringify({ t: 'a', cmd: 'status sweep', exit: 0 })}\n`);
      // ACT
      const result = node('drive.ts', ['transcript', '--topic', 'sweep'], { cwd: root });
      // ASSERT
      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr).toContain(`no sessions linked in ${logFile}`);
    });
  });
});

describe('edge cases', () => {
  describe('drive event log', () => {
    it('logs a worktree command run from the main checkout under the topic of its branch argument', () => {
      // ARRANGE
      const root = repo(null);
      const task = 'chore/sweep--9-z';
      // ACT
      node('drive.ts', ['worktree', 'done', task, '--base', 'chore/sweep'], {
        cwd: root,
      });
      // ASSERT
      expect(logOf(root, 'sweep')[0]).toMatchObject({
        branch: task,
        base: 'chore/sweep',
        cmd: expect.stringContaining('worktree done'),
      });
    });
  });
  describe('claude adapter hook from the main checkout', () => {
    it('takes the topic from the brief path in the Subagent transcript when the cwd is on main', () => {
      // ARRANGE
      const root = repo(null);
      const transcript = path.join(root, 'agent.jsonl');
      const brief = 'Save this brief to .scratch/sweep/x.brief.md';
      writeFileSync(transcript, `${JSON.stringify({ type: 'user', message: { content: brief } })}\n`);
      // ACT
      const result = hookFrom(root, transcript);
      // ASSERT
      expect(result.status).toBe(0);
      expect(logOf(root, 'sweep')[0]).toMatchObject({
        event: 'subagent-stop',
        transcript,
        parent: '/t/s1.jsonl',
        branch: 'main',
      });
    });

    it('falls back to the single Integration worktree', () => {
      // ARRANGE
      const root = repo(null);
      execFileSync('git', ['worktree', 'add', '-q', '-b', 'chore/lone', path.join(root, '.worktrees', 'chore-lone')], {
        cwd: root,
      });
      // ACT
      hookFrom(root, null);
      // ASSERT
      expect(logOf(root, 'lone')[0]).toMatchObject({
        event: 'subagent-stop',
        session: 's1',
      });
    });
  });
});

import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ENTRY = path.join(import.meta.dirname, 'learnings.ts');
const SKILL = 'commit';
const SLUG = 'message-skips-source-trailer';
const TITLE = 'The commit message skips its Source trailer';
const ENFORCER = 'hook: new commit-msg check';
const TICKET = 'https://github.com/o/r/issues/7';
const OPEN_TICKET = 'https://github.com/o/r/issues/3';
const STORE = `docs/learnings/${SKILL}`;
const FAKE_GH = [
  '#!/bin/sh',
  'printf "%s " "$@" | tr "\\n" "~" >> "$FAKE_GH_LOG"',
  'echo >> "$FAKE_GH_LOG"',
  'case "$1 $2" in',
  '  "issue list") printf "%s" "$FAKE_GH_OPEN" ;;',
  `  "issue create") echo ${TICKET} ;;`,
  'esac',
  '',
].join('\n');

interface Sandbox {
  root: string;
  ghLog: string;
  bin: string;
}

function sandbox(): Sandbox {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'learnings-cli-')));
  spawnSync('git', ['init', '--quiet'], { cwd: root });
  const bin = path.join(root, '.fake-bin');
  mkdirSync(bin);
  writeFileSync(path.join(bin, 'gh'), FAKE_GH);
  chmodSync(path.join(bin, 'gh'), 0o755);
  writeFileSync(
    path.join(root, 'skills-lock.json'),
    JSON.stringify({ version: 2, skills: { [SKILL]: { source: 'o/r', sourceType: 'github' } } }),
  );
  return { root, ghLog: path.join(root, 'gh.log'), bin };
}

function learnings({ root, ghLog, bin }: Sandbox, argv: readonly string[], open = '[]') {
  const result = spawnSync('node', [ENTRY, ...argv], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, PATH: `${bin}:${process.env.PATH ?? ''}`, FAKE_GH_LOG: ghLog, FAKE_GH_OPEN: open },
  });
  return { exit: result.status, stdout: result.stdout.trim(), stderr: result.stderr.trim() };
}

const recordArgs = (topic: string, date: string, text: string): string[] => [
  'record',
  '--skill',
  SKILL,
  '--topic',
  topic,
  '--date',
  date,
  '--failure',
  SLUG,
  '--title',
  TITLE,
  '--enforcer',
  ENFORCER,
  '--correction',
  text,
];

const recordThree = (box: Sandbox) => {
  learnings(box, recordArgs('one', '2026-11-18', '"add the trailer"'));
  learnings(box, recordArgs('two', '2026-11-19', '"the trailer again"'));
  learnings(box, recordArgs('three', '2026-11-20', '"still no trailer"'));
};

const readText = (box: Sandbox, relative: string): string => readFileSync(path.join(box.root, relative), 'utf8');
const ghCalls = (box: Sandbox): string[] =>
  existsSync(box.ghLog) ? readFileSync(box.ghLog, 'utf8').split('\n').filter(Boolean) : [];

describe('success cases', () => {
  describe('learnings CLI on a temporary store', () => {
    it('records a run, creating the failure mode and the home README, then checks the store', () => {
      // ARRANGE
      const box = sandbox();
      const expectedRecord = `${STORE}/records/2026-11-20-one.md`;
      const expectedFront = ['type: failure-mode', 'stale_after: 2026-12-20', `title: ${TITLE}`, 'status: proposed'];
      // ACT
      const recorded = learnings(box, recordArgs('one', '2026-11-20', '"add the trailer"'));
      const checked = learnings(box, ['check', '--skill', SKILL]);
      // ASSERT
      expect(recorded).toMatchObject({ exit: 0, stdout: `✔ recorded ${expectedRecord}` });
      expect(checked).toMatchObject({ exit: 0, stdout: `✔ ${STORE}: 1 failure modes, 1 records` });
      expect(readText(box, expectedRecord)).toContain(`## ${SLUG}\n\n- **Correction:** "add the trailer"`);
      for (const line of expectedFront) expect(readText(box, `${STORE}/failure-modes/${SLUG}.md`)).toContain(line);
      expect(existsSync(path.join(box.root, 'docs/learnings/README.md'))).toBe(true);
    });

    it('lists the count computed from records and marks a smell at three', () => {
      // ARRANGE
      const box = sandbox();
      recordThree(box);
      const expected = ['count  status    failure mode', `    3  proposed  ${SLUG}  smell`].join('\n');
      // ACT
      const listed = learnings(box, ['list', '--skill', SKILL]);
      // ASSERT
      expect(listed).toMatchObject({ exit: 0, stdout: expected });
    });

    it('prints the closest failure mode for similar', () => {
      // ARRANGE
      const box = sandbox();
      learnings(box, recordArgs('one', '2026-11-20', '"add the trailer"'));
      // ACT
      const similar = learnings(box, ['similar', '--skill', SKILL, 'commit', 'message', 'skips', 'trailer']);
      // ASSERT
      expect(similar.stdout).toContain(`${SLUG}  ${TITLE}`);
    });

    it('files the smell upstream once approved, labelled, and marks its failure mode as a ticket', () => {
      // ARRANGE
      const box = sandbox();
      recordThree(box);
      const expectedCreate = `issue create --repo o/r --title ${TITLE}`;
      // ACT
      const filed = learnings(box, ['file-upstream', '--skill', SKILL, '--approved']);
      // ASSERT
      expect(filed).toMatchObject({ exit: 0, stdout: `✔ filed ${TICKET}` });
      expect(ghCalls(box).find((call) => call.startsWith('issue create'))).toContain(expectedCreate);
      expect(ghCalls(box).find((call) => call.startsWith('issue create'))).toContain(
        `--label fortify --label skill:${SKILL}`,
      );
      expect(readText(box, `${STORE}/failure-modes/${SLUG}.md`)).toContain(`status: ticket\nticket: ${TICKET}`);
    });
  });
});

describe('failure cases', () => {
  describe('learnings CLI on a temporary store', () => {
    it('refuses file-upstream while a fortify ticket is open for the skill, and files nothing', () => {
      // ARRANGE
      const box = sandbox();
      recordThree(box);
      const open = JSON.stringify([{ url: OPEN_TICKET }]);
      // ACT
      const refused = learnings(box, ['file-upstream', '--skill', SKILL, '--approved'], open);
      // ASSERT
      expect(refused.exit).toBe(1);
      expect(refused.stderr).toContain(OPEN_TICKET);
      expect(ghCalls(box).some((call) => call.startsWith('issue create'))).toBe(false);
    });

    it('files nothing without the Operator approval and prints the issue to show them', () => {
      // ARRANGE
      const box = sandbox();
      recordThree(box);
      // ACT
      const gated = learnings(box, ['file-upstream', '--skill', SKILL]);
      // ASSERT
      expect(gated.exit).toBe(1);
      expect(gated.stderr).toContain('has not approved');
      expect(gated.stderr).toContain(TITLE);
      expect(ghCalls(box).some((call) => call.startsWith('issue create'))).toBe(false);
    });

    it('refuses to record for a skill the README turns off', () => {
      // ARRANGE
      const box = sandbox();
      mkdirSync(path.join(box.root, 'docs/learnings'), { recursive: true });
      writeFileSync(path.join(box.root, 'docs/learnings/README.md'), `# Learnings\n\n## Off\n\n- ${SKILL}\n`);
      // ACT
      const refused = learnings(box, recordArgs('one', '2026-11-20', '"x"'));
      // ASSERT
      expect(refused.exit).toBe(1);
      expect(refused.stderr).toContain(`learning is off for ${SKILL}`);
    });

    it('names a failure mode that does not exist and asks for --title and --enforcer', () => {
      // ARRANGE
      const box = sandbox();
      const argv = ['record', '--skill', SKILL, '--topic', 't', '--failure', SLUG, '--evidence', 'x'];
      // ACT
      const refused = learnings(box, argv);
      // ASSERT
      expect(refused.exit).toBe(1);
      expect(refused.stderr).toContain('pass --title and --enforcer');
    });
  });
});

describe('edge cases', () => {
  describe('learnings CLI on a temporary store', () => {
    it('appends a second correction to the same record and failure mode instead of duplicating them', () => {
      // ARRANGE
      const box = sandbox();
      learnings(box, recordArgs('one', '2026-11-20', '"first"'));
      // ACT
      const again = learnings(box, [
        'record',
        '--skill',
        SKILL,
        '--topic',
        'one',
        '--date',
        '2026-11-20',
        '--failure',
        SLUG,
        '--evidence',
        'second',
      ]);
      // ASSERT
      expect(again.exit).toBe(0);
      expect(readText(box, `${STORE}/records/2026-11-20-one.md`)).toContain(
        '- **Correction:** "first"\n- **Evidence:** second\n',
      );
    });

    it('checks every skill store when --skill is left out, and passes with no store at all', () => {
      // ARRANGE
      const box = sandbox();
      const expectedEmpty = '✔ docs/learnings: no skill has a store yet';
      // ACT
      const empty = learnings(box, ['check']);
      learnings(box, recordArgs('one', '2026-11-20', '"x"'));
      const covered = learnings(box, ['check']);
      // ASSERT
      expect(empty.stdout).toBe(expectedEmpty);
      expect(covered.stdout).toBe(`✔ ${STORE}: 1 failure modes, 1 records`);
    });
  });
});

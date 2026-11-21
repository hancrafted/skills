import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CATALOG, harnessCapFrom, parseConfig, PHASE_TIERS, readBinding } from '../core/index.ts';
import { checkBinding, detectSkills, setup } from './setup.ts';
function dropGitVariablesACommitHookExports(): void {
  for (const name of Object.keys(process.env)) if (name.startsWith('GIT_')) delete process.env[name];
}
dropGitVariablesACommitHookExports();
const withoutGitVariables = (): NodeJS.ProcessEnv =>
  Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_')));
const SCRIPTS_ROOT = path.resolve(import.meta.dirname, '..');
const CLI = path.join(SCRIPTS_ROOT, 'drive.ts');
function repo(files: Record<string, string>): string {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'drive-setup-cli-')));
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root, env: withoutGitVariables() });
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), text);
  }
  return root;
}
const spawnSetup = (cwd: string, ...args: string[]) =>
  spawnSync(process.execPath, [CLI, 'setup', ...args], {
    cwd,
    encoding: 'utf8',
    env: withoutGitVariables(),
  });
const binding = (root: string) => {
  const read = readBinding(readFileSync(path.join(root, 'docs/drive/binding.yml'), 'utf8'));
  if ('error' in read) throw new Error(read.error);
  return read;
};
const SKILL = '---\nname: x\ndescription: x\n---\n';

function bareRepo(files: Record<string, string>): string {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'drive-setup-')));
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), text);
  }
  return root;
}
const LOCK = (skills: Record<string, string>) =>
  JSON.stringify({
    version: 2,
    skills: Object.fromEntries(
      Object.entries(skills).map(([name, source]) => [name, { source, sourceType: 'github' }]),
    ),
  });
const INSIDE = (root: string) => path.join(root, 'skills', 'drive', 'scripts');
const ENTRY = 'skills/drive/scripts/drive.ts';
const VENDOR = CATALOG.source;
const text = (root: string, file: string) => readFileSync(path.join(root, file), 'utf8');

const gitIn = (cwd: string, ...args: string[]): string =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], {
    cwd,
    encoding: 'utf8',
    env: withoutGitVariables(),
  }).trim();
const installLearningsStub = (root: string) => {
  mkdirSync(path.join(root, 'skills', 'learnings'), { recursive: true });
  writeFileSync(path.join(root, 'skills', 'learnings', 'SKILL.md'), SKILL);
};
const OLD_RECORD = 'docs/drive/learnings/records/2026-01-01-x.md';
const NEW_RECORD = 'docs/learnings/drive/records/2026-01-01-x.md';
const oldStoreRepo = () => {
  const root = repo({
    [OLD_RECORD]: '---\ntype: record\n---\n# x\n',
    'docs/drive/learnings/failure-modes/a.md': 'a',
  });
  gitIn(root, 'add', '-A');
  gitIn(root, 'commit', '-q', '-m', 'seed');
  return root;
};

describe('success cases', () => {
  describe('drive setup, spawned', () => {
    it('binds the lockfile skills, seeds the package manager of its lockfile and reports each file it wrote', () => {
      // ARRANGE
      const lock = {
        skills: {
          tdd: { source: CATALOG.source },
          'code-review': { source: CATALOG.source },
        },
      };
      const root = repo({
        'skills-lock.json': JSON.stringify(lock),
        'pnpm-lock.yaml': '',
        'package.json': JSON.stringify({ scripts: { lint: 'eslint .' } }),
      });
      // ACT
      const result = spawnSetup(root, '--agent-type', 'team:dev');
      // ASSERT
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain('✔ wrote docs/drive/binding.yml');
      expect(binding(root).agentType).toBe('team:dev');
      expect(binding(root).phases.implement).toEqual({
        model: PHASE_TIERS.implement,
        skills: ['tdd'],
        inline: false,
      });
      expect(binding(root).phases.verify.skills).toEqual(['code-review']);
      expect(readFileSync(path.join(root, 'docs/drive/project.yml'), 'utf8')).toContain(
        'pnpm install --frozen-lockfile',
      );
      expect(readFileSync(path.join(root, 'docs/drive/enforcers.yml'), 'utf8')).toContain('pnpm run lint');
    });

    it('binds a skill found only as a folder, by its name', () => {
      // ARRANGE
      const root = repo({ '.claude/skills/tdd/SKILL.md': SKILL });
      // ACT
      const result = spawnSetup(root);
      // ASSERT
      expect(result.status, result.stderr).toBe(0);
      expect(binding(root).phases.implement.skills).toEqual(['tdd']);
      expect(binding(root).phases.define.inline).toBe(true);
    });
  });
  describe('drive setup with a skills lockfile', () => {
    it('binds the vendor skills the lockfile lists and leaves the other phases inline', () => {
      // ARRANGE
      const root = bareRepo({
        'skills-lock.json': LOCK({
          tdd: VENDOR,
          'code-review': VENDOR,
          other: 'someone/else',
        }),
      });
      // ACT
      setup(root, SCRIPTS_ROOT, { agentType: 'team:dev' });
      // ASSERT
      const result = binding(root);
      expect(result.agentType).toBe('team:dev');
      expect(result.phases.implement).toEqual({
        model: PHASE_TIERS.implement,
        skills: ['tdd'],
        inline: false,
      });
      expect(result.phases.verify.skills).toEqual(['code-review']);
      expect(result.phases.define.inline).toBe(true);
      expect(result.phases.evolve.inline).toBe(true);
    });
  });
  describe('drive setup without a skills lockfile', () => {
    it('writes a complete folder in an empty repo', () => {
      // ARRANGE
      const root = bareRepo({});
      const expectedFiles = [
        'docs/drive/binding.yml',
        'docs/drive/enforcers.yml',
        'docs/drive/profiles.md',
        'docs/drive/project.yml',
        'docs/drive/review.md',
      ];
      const expectedConfig = {
        parallel: { default: 3, harnessCap: harnessCapFrom(process.env) },
        worktree: { baseBranch: 'main' },
      };
      // ACT
      const { written } = setup(root, SCRIPTS_ROOT);
      // ASSERT
      expect(written.sort()).toEqual(expectedFiles);
      expect(parseConfig(text(root, 'docs/drive/project.yml'), ENTRY)).toMatchObject(expectedConfig);
    });
  });
  describe('drive setup enforcers', () => {
    it('runs the scripts with the package manager its lockfile implies', () => {
      // ARRANGE
      const root = bareRepo({
        'package.json': JSON.stringify({ scripts: { lint: 'eslint .' } }),
        'pnpm-lock.yaml': '',
      });
      // ACT
      setup(root, SCRIPTS_ROOT);
      // ASSERT
      expect(text(root, 'docs/drive/enforcers.yml')).toContain('pnpm run lint');
    });

    it('lists the checks the repo runs for Fortify to choose from', () => {
      // ARRANGE
      const root = bareRepo({
        'package.json': JSON.stringify({
          scripts: { lint: 'eslint .', test: 'vitest run', build: 'bundle' },
        }),
        '.husky/pre-commit': 'npm test',
        '.archgate/adrs/one.md': '# a',
      });
      // ACT
      setup(root, SCRIPTS_ROOT);
      // ASSERT
      const enforcers = text(root, 'docs/drive/enforcers.yml');
      for (const expected of ['archgate check', 'npm run lint', 'npm run test', '.husky/pre-commit'])
        expect(enforcers).toContain(expected);
      expect(enforcers).not.toContain('npm run build');
    });
  });
  describe('drive setup the learnings check', () => {
    it('wires the learnings check into check:docs once', () => {
      // ARRANGE
      const root = bareRepo({ 'package.json': JSON.stringify({ scripts: { 'check:docs': 'mh check' } }) });
      installLearningsStub(root);
      const expected = `mh check && mh check --root docs/learnings/drive --config skills/learnings/markdown-harness.config.yaml && node skills/learnings/scripts/learnings.ts check`;
      // ACT
      setup(root, INSIDE(root));
      const { written } = setup(root, INSIDE(root));
      // ASSERT
      const scripts = (JSON.parse(text(root, 'package.json')) as { scripts: Record<string, string> }).scripts;
      expect(scripts['check:docs']).toBe(expected);
      expect(written).toEqual([]);
    });
  });
  describe('drive setup the Decision-doc guard', () => {
    it('adds the guard to an existing husky pre-commit hook once', () => {
      // ARRANGE
      const root = bareRepo({ '.husky/pre-commit': 'npm run check:staged\n' });
      const lineBeforeTheGuard = -2;
      // ACT
      setup(root, INSIDE(root));
      setup(root, INSIDE(root));
      // ASSERT
      const hook = text(root, '.husky/pre-commit').split('\n');
      expect(hook.filter((line) => line.includes('drive.ts guard'))).toHaveLength(1);
      expect(hook.at(lineBeforeTheGuard)).toBe('npm run check:staged');
    });
  });
  describe('drive setup the learnings step', () => {
    it('wires the learnings check in the same run that installs learnings', () => {
      // ARRANGE
      const root = repo({ 'package.json': JSON.stringify({ scripts: { 'check:docs': 'mh check' } }) });
      const wired = 'node skills/learnings/scripts/learnings.ts check';
      // ACT
      setup(root, INSIDE(root), { approveLearnings: true, install: installLearningsStub });
      // ASSERT
      expect(text(root, 'package.json')).toContain(wired);
    });
    it('moves the old store with git mv, keeps its history and installs learnings once the Operator approves', () => {
      // ARRANGE
      const root = oldStoreRepo();
      const history = 'move\nseed';
      // ACT
      const { notes } = setup(root, INSIDE(root), { approveLearnings: true, install: installLearningsStub });
      gitIn(root, 'add', '-A');
      gitIn(root, 'commit', '-q', '-m', 'move');
      // ASSERT
      expect(existsSync(path.join(root, 'docs/drive/learnings'))).toBe(false);
      expect(text(root, NEW_RECORD)).toContain('type: record');
      expect(gitIn(root, 'log', '--follow', '--format=%s', '--', NEW_RECORD)).toBe(history);
      expect(existsSync(path.join(root, 'skills/learnings/SKILL.md'))).toBe(true);
      expect(text(root, 'docs/drive/README.md')).toMatch(/by: drive@\d+\.\d+\.\d+/);
      expect(notes.join('\n')).toContain('docs/learnings/drive');
    });
    it('installs learnings in a repo without the old store when approved, and migrates nothing', () => {
      // ARRANGE
      const root = repo({});
      // ACT
      setup(root, INSIDE(root), { approveLearnings: true, install: installLearningsStub });
      // ASSERT
      expect(existsSync(path.join(root, 'skills/learnings/SKILL.md'))).toBe(true);
      expect(existsSync(path.join(root, 'docs/learnings'))).toBe(false);
    });
  });
});

describe('failure cases', () => {
  describe('drive setup', () => {
    it('names a lockfile that is not JSON', () => {
      // ARRANGE
      const root = bareRepo({ 'skills-lock.json': '{' });
      // ACT
      // ASSERT
      expect(() => setup(root, SCRIPTS_ROOT)).toThrow('skills-lock.json is not valid JSON');
    });
  });
  describe('drive setup the learnings check', () => {
    it('prints the command instead of writing a path that leaves the repo', () => {
      // ARRANGE
      const manifest = JSON.stringify({ scripts: { 'check:docs': 'mh check' } });
      const root = bareRepo({ 'package.json': manifest });
      installLearningsStub(root);
      // ACT
      const { notes } = setup(root, SCRIPTS_ROOT);
      // ASSERT
      expect(text(root, 'package.json')).toBe(manifest);
      expect(notes.join('\n')).toContain('learnings.ts check');
    });
  });
  describe('drive setup the Decision-doc guard', () => {
    it('never writes a hook line whose path leaves the repo, and prints the line to add instead', () => {
      // ARRANGE
      const root = bareRepo({ '.husky/pre-commit': 'npm run check:staged\n' });
      // ACT
      const { written, notes } = setup(root, SCRIPTS_ROOT);
      // ASSERT
      expect(text(root, '.husky/pre-commit')).toBe('npm run check:staged\n');
      expect(written).not.toContain('.husky/pre-commit');
      expect(notes.join('\n')).toMatch(/sits outside this repo[^\n]*\n\s+node \/[^\n]*drive\.ts guard$/m);
    });
  });
  describe('drive setup --check', () => {
    it('names a bound skill that no longer exists, and passes once it is renamed in the Binding', () => {
      // ARRANGE
      const root = bareRepo({
        'skills-lock.json': LOCK({ tdd: VENDOR, 'code-review': VENDOR }),
        '.agents/skills/tdd/SKILL.md': SKILL,
        '.agents/skills/code-review/SKILL.md': SKILL,
      });
      setup(root, SCRIPTS_ROOT);
      const file = path.join(root, 'docs/drive/binding.yml');
      writeFileSync(file, text(root, 'docs/drive/binding.yml').replace(/- code-review/g, '- review-code'));
      // ACT
      const stale = checkBinding(root);
      writeFileSync(file, text(root, 'docs/drive/binding.yml').replace(/- review-code/g, '- code-review'));
      const fixed = checkBinding(root);
      // ASSERT
      expect(stale).toEqual([expect.stringContaining("binds 'review-code'")]);
      expect(fixed).toEqual([]);
    });
  });
  describe('drive setup the learnings step', () => {
    it('wires no learnings check while learnings is missing, and names the install command', () => {
      // ARRANGE
      const manifest = JSON.stringify({ scripts: { 'check:docs': 'mh check' } });
      const root = bareRepo({ 'package.json': manifest });
      const installCommand = 'npx skills add hancrafted/skills --skill learnings';
      // ACT
      const { notes } = setup(root, INSIDE(root));
      // ASSERT
      expect(text(root, 'package.json')).toBe(manifest);
      expect(notes.join('\n')).toContain(installCommand);
    });
    it('moves nothing and installs nothing before the Operator approves, and says what approval does', () => {
      // ARRANGE
      const root = oldStoreRepo();
      const installs: string[] = [];
      // ACT
      const { notes } = setup(root, INSIDE(root), { install: (target) => installs.push(target) });
      // ASSERT
      expect(existsSync(path.join(root, OLD_RECORD))).toBe(true);
      expect(installs).toEqual([]);
      expect(existsSync(path.join(root, 'docs/drive/README.md'))).toBe(false);
      expect(notes.join('\n')).toContain('--approve-learnings');
    });
    it('refuses to overwrite a store already at the new place', () => {
      // ARRANGE
      const root = oldStoreRepo();
      mkdirSync(path.join(root, 'docs/learnings/drive'), { recursive: true });
      writeFileSync(path.join(root, 'docs/learnings/drive/x.md'), 'x');
      const refusal = /docs\/learnings\/drive/;
      // ACT
      const migrate = () => setup(root, INSIDE(root), { approveLearnings: true, install: installLearningsStub });
      // ASSERT
      expect(migrate).toThrow(refusal);
    });
  });
});

describe('edge cases', () => {
  describe('drive setup test helpers', () => {
    it('keep a temp repo out of the host repo an inherited GIT_DIR names', () => {
      // ARRANGE
      const host = repo({});
      const hostGitDir = path.join(host, '.git');
      const hostBare = () =>
        execFileSync('git', ['config', 'core.bare'], {
          cwd: host,
          encoding: 'utf8',
          env: withoutGitVariables(),
        }).trim();
      const before = hostBare();
      process.env.GIT_DIR = hostGitDir;
      // ACT
      const temp = repo({ 'a.txt': 'a' });
      delete process.env.GIT_DIR;
      // ASSERT
      expect(existsSync(path.join(temp, '.git'))).toBe(true);
      expect(hostBare()).toBe(before);
    });
  });
  describe('drive setup, spawned', () => {
    it('writes nothing the second time and says so', () => {
      // ARRANGE
      const root = repo({ '.agents/skills/tdd/SKILL.md': SKILL });
      spawnSetup(root);
      // ACT
      const result = spawnSetup(root);
      // ASSERT
      expect(result.stdout).toContain('docs/drive/ is up to date');
    });

    it('leaves a husky hook alone and prints the line to add, since the skill sits outside the repo', () => {
      // ARRANGE
      const root = repo({ '.husky/pre-commit': 'npm test\n' });
      // ACT
      const result = spawnSetup(root);
      // ASSERT
      expect(readFileSync(path.join(root, '.husky/pre-commit'), 'utf8')).toBe('npm test\n');
      expect(result.stdout).toMatch(/sits outside this repo/);
      expect(result.stdout).toContain(`node ${CLI.split(path.sep).join('/')} guard`);
    });
  });
  describe('drive setup without a skills lockfile', () => {
    it('detects authored skills but binds no phase, so the Orchestrator does every phase inline', () => {
      // ARRANGE
      const root = bareRepo({
        'skills/mine/SKILL.md': SKILL,
        'skills/not-a-skill/notes.md': 'x',
      });
      // ACT
      setup(root, SCRIPTS_ROOT);
      // ASSERT
      expect(detectSkills(root)).toEqual([{ name: 'mine', origin: 'authored', source: null }]);
      const result = binding(root);
      expect(Object.values(result.phases).every((phase) => phase.inline)).toBe(true);
      expect(result.agentType).toBe('general-purpose');
    });

    it('finds a skill that sits only in .claude/skills', () => {
      // ARRANGE
      const root = bareRepo({ '.claude/skills/tdd/SKILL.md': SKILL });
      // ACT
      setup(root, SCRIPTS_ROOT);
      // ASSERT
      expect(detectSkills(root)).toEqual([{ name: 'tdd', origin: 'installed', source: null }]);
      expect(binding(root).phases.implement.skills).toEqual(['tdd']);
    });

    it('matches a skill found only in the installed folder to the catalog by name', () => {
      // ARRANGE
      const root = bareRepo({ '.agents/skills/tdd/SKILL.md': SKILL });
      // ACT
      setup(root, SCRIPTS_ROOT);
      // ASSERT
      expect(binding(root).phases.implement.skills).toEqual(['tdd']);
    });
  });
  describe('drive setup re-running', () => {
    it('keeps a hand edit in every file and adds a newly installed skill', () => {
      // ARRANGE
      const root = bareRepo({ 'skills-lock.json': LOCK({ tdd: VENDOR }) });
      setup(root, SCRIPTS_ROOT);
      const edit = (file: string, from: string, to: string) =>
        writeFileSync(path.join(root, file), text(root, file).replace(from, to));
      edit('docs/drive/binding.yml', 'agentType: general-purpose', 'agentType: mine');
      edit('docs/drive/project.yml', 'default: 3', 'default: 2');
      writeFileSync(path.join(root, 'skills-lock.json'), LOCK({ tdd: VENDOR, 'code-review': VENDOR }));
      const handEdited = { parallel: { default: 2 } };
      // ACT
      setup(root, SCRIPTS_ROOT);
      // ASSERT
      expect(binding(root).agentType).toBe('mine');
      expect(binding(root).phases.verify.skills).toEqual(['code-review']);
      expect(parseConfig(text(root, 'docs/drive/project.yml'), ENTRY)).toMatchObject(handEdited);
    });

    it('seeds notify once and keeps a notify the Operator changed', () => {
      // ARRANGE
      const root = bareRepo({});
      setup(root, SCRIPTS_ROOT);
      const seeded = binding(root).notify;
      writeFileSync(
        path.join(root, 'docs/drive/binding.yml'),
        text(root, 'docs/drive/binding.yml').replace('adapter: push-notification', 'adapter: none'),
      );
      // ACT
      setup(root, SCRIPTS_ROOT);
      // ASSERT
      expect(seeded).toEqual({ adapter: 'push-notification' });
      expect(binding(root).notify).toEqual({ adapter: 'none' });
    });

    it('keeps a review.md the Operator filled in', () => {
      // ARRANGE
      const root = bareRepo({});
      setup(root, SCRIPTS_ROOT);
      writeFileSync(path.join(root, 'docs/drive/review.md'), '# Drive review\n\nmode: decide\n');
      // ACT
      const { written } = setup(root, SCRIPTS_ROOT);
      // ASSERT
      expect(written).not.toContain('docs/drive/review.md');
      expect(text(root, 'docs/drive/review.md')).toContain('mode: decide');
    });

    it('writes nothing when nothing changed', () => {
      // ARRANGE
      const root = bareRepo({ 'skills-lock.json': LOCK({ tdd: VENDOR }) });
      setup(root, SCRIPTS_ROOT);
      // ACT
      const { written } = setup(root, SCRIPTS_ROOT);
      // ASSERT
      expect(written).toEqual([]);
    });
  });
  describe('drive setup the Decision-doc guard', () => {
    it('writes no workflow without husky and hands back the one CI line instead', () => {
      // ARRANGE
      const root = bareRepo({
        '.github/workflows/ci.yml': 'name: ci\n',
        'package-lock.json': '{}',
      });
      // ACT
      const { written, notes } = setup(root, INSIDE(root));
      // ASSERT
      expect(written.filter((file) => file.startsWith('.husky') || file.startsWith('.github'))).toEqual([]);
      expect(notes.join('\n')).toMatch(/drive\.ts guard --against origin\/main/);
    });
  });
  describe('drive setup the learnings step', () => {
    it('leaves a repo without the old store untouched by the migration', () => {
      // ARRANGE
      const root = repo({ 'docs/other.md': 'x' });
      installLearningsStub(root);
      gitIn(root, 'add', '-A');
      gitIn(root, 'commit', '-q', '-m', 'seed');
      const installs: string[] = [];
      // ACT
      setup(root, INSIDE(root), { approveLearnings: true, install: (target) => installs.push(target) });
      // ASSERT
      expect(installs).toEqual([]);
      expect(existsSync(path.join(root, 'docs/learnings'))).toBe(false);
      expect(text(root, 'docs/other.md')).toBe('x');
    });
    it('rewrites only the version record when the README is from an older drive', () => {
      // ARRANGE
      const old = '---\ntype: readme\ngenerated:\n  by: drive@0.1.0\n  at: 2026-01-01\n---\n# Drive\n\nmine\n';
      const root = repo({ 'docs/drive/README.md': old });
      installLearningsStub(root);
      // ACT
      setup(root, INSIDE(root));
      // ASSERT
      expect(text(root, 'docs/drive/README.md')).not.toContain('drive@0.1.0');
      expect(text(root, 'docs/drive/README.md')).toContain('mine');
    });
  });
});

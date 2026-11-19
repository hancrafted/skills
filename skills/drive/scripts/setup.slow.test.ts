import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CATALOG, PHASE_TIERS, readBinding } from './binding.pure.ts';
function dropGitVariablesACommitHookExports(): void {
  for (const name of Object.keys(process.env)) if (name.startsWith('GIT_')) delete process.env[name];
}
dropGitVariablesACommitHookExports();
const CLI = path.join(import.meta.dirname, 'drive.ts');
function repo(files: Record<string, string>): string {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'drive-setup-cli-')));
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root });
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), text);
  }
  return root;
}
const setup = (cwd: string, ...args: string[]) =>
  spawnSync(process.execPath, [CLI, 'setup', ...args], {
    cwd,
    encoding: 'utf8',
  });
const binding = (root: string) => {
  const read = readBinding(readFileSync(path.join(root, 'docs/drive/binding.yml'), 'utf8'));
  if ('error' in read) throw new Error(read.error);
  return read;
};
const SKILL = '---\nname: x\ndescription: x\n---\n';

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
      const result = setup(root, '--agent-type', 'team:dev');
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
      const result = setup(root);
      // ASSERT
      expect(result.status, result.stderr).toBe(0);
      expect(binding(root).phases.implement.skills).toEqual(['tdd']);
      expect(binding(root).phases.define.inline).toBe(true);
    });
  });
});

describe('edge cases', () => {
  describe('drive setup, spawned', () => {
    it('writes nothing the second time and says so', () => {
      // ARRANGE
      const root = repo({ '.agents/skills/tdd/SKILL.md': SKILL });
      setup(root);
      // ACT
      const result = setup(root);
      // ASSERT
      expect(result.stdout).toContain('docs/drive/ is up to date');
    });

    it('leaves a husky hook alone and prints the line to add, since the skill sits outside the repo', () => {
      // ARRANGE
      const root = repo({ '.husky/pre-commit': 'npm test\n' });
      // ACT
      const result = setup(root);
      // ASSERT
      expect(readFileSync(path.join(root, '.husky/pre-commit'), 'utf8')).toBe('npm test\n');
      expect(result.stdout).toMatch(/sits outside this repo/);
      expect(result.stdout).toContain(`node ${CLI.split(path.sep).join('/')} guard`);
    });
  });
});

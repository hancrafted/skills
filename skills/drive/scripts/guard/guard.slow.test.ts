import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
function dropGitVariablesACommitHookExports(): void {
  for (const name of Object.keys(process.env)) if (name.startsWith('GIT_')) delete process.env[name];
}
dropGitVariablesACommitHookExports();
const CLI = path.join(import.meta.dirname, '..', 'drive.ts');
const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], {
    cwd,
    encoding: 'utf8',
  }).trim();
const guard = (cwd: string, ...args: string[]) =>
  spawnSync(process.execPath, [CLI, 'guard', ...args], {
    cwd,
    encoding: 'utf8',
  });
const put = (root: string, file: string, text: string) => {
  mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  writeFileSync(path.join(root, file), text);
};
function repo(): string {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'drive-guard-')));
  git(root, 'init', '-q', '-b', 'main');
  put(
    root,
    'docs/drive/project.yml',
    "decisionDocs:\n  - docs/features/**\n  - docs/decision-records/**\n  - '**/GLOSSARY*.md'\n",
  );
  put(root, 'GLOSSARY.md', 'one');
  put(root, 'src/a.ts', 'a');
  git(root, 'add', '.');
  git(root, 'commit', '-qm', 'init');
  return root;
}
let edits = 0;
const stage = (root: string, file: string) => {
  edits += 1;
  put(root, file, `changed ${edits}`);
  git(root, 'add', file);
};

describe('success cases', () => {
  describe('drive guard', () => {
    it('passes a staged glossary change on a decisions/* branch', () => {
      // ARRANGE
      const root = repo();
      git(root, 'checkout', '-q', '-b', 'decisions/drive');
      stage(root, 'GLOSSARY.md');
      // ACT
      const result = guard(root);
      // ASSERT
      expect(result.status).toBe(0);
    });

    it('leaves changes outside the Decision docs alone', () => {
      // ARRANGE
      const root = repo();
      git(root, 'checkout', '-q', '-b', 'feat/x');
      stage(root, 'src/a.ts');
      // ACT
      const result = guard(root);
      // ASSERT
      expect(result.status).toBe(0);
    });

    it('--against checks the commits the branch added since the base', () => {
      // ARRANGE
      const root = repo();
      git(root, 'checkout', '-q', '-b', 'feat/x');
      stage(root, 'GLOSSARY.md');
      git(root, 'commit', '-qm', 'edit glossary');
      // ACT
      const staged = guard(root);
      const branch = guard(root, '--against', 'main');
      // ASSERT
      expect(staged.status).toBe(0);
      expect(branch.status).toBe(1);
      expect(branch.stderr).toContain('GLOSSARY.md');
    });
  });
});

describe('failure cases', () => {
  describe('drive guard', () => {
    it('fails a staged glossary change elsewhere, naming the file and the rule', () => {
      // ARRANGE
      const root = repo();
      git(root, 'checkout', '-q', '-b', 'feat/x');
      stage(root, 'GLOSSARY.md');
      // ACT
      const result = guard(root);
      // ASSERT
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('GLOSSARY.md is a Decision doc (decisionDocs: **/GLOSSARY*.md)');
      expect(result.stderr).toContain("this is 'feat/x'");
    });

    it('fails a staged feature-doc change elsewhere', () => {
      // ARRANGE
      const root = repo();
      git(root, 'checkout', '-q', '-b', 'feat/x');
      stage(root, 'docs/features/new.md');
      // ACT
      const result = guard(root);
      // ASSERT
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('docs/features/new.md');
    });

    it('fails a staged Decision record change off decisions/*', () => {
      // ARRANGE
      const root = repo();
      git(root, 'checkout', '-q', '-b', 'feat/x');
      stage(root, 'docs/decision-records/0001-choice.md');
      // ACT
      const result = guard(root);
      // ASSERT
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('docs/decision-records/0001-choice.md');
    });

    it('rejects an unknown argument with the usage', () => {
      // ARRANGE
      const root = repo();
      // ACT
      const result = guard(root, '--nope');
      // ASSERT
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('usage: drive guard [--against <ref>]');
    });
  });
});

describe('edge cases', () => {
  describe('drive guard', () => {
    it("skips a merge in progress, whose staged files are the other side's change", () => {
      // ARRANGE
      const root = repo();
      git(root, 'checkout', '-q', '-b', 'feat/x');
      put(root, 'src/a.ts', 'branch');
      git(root, 'commit', '-qam', 'branch edit');
      git(root, 'checkout', '-q', 'main');
      put(root, 'src/a.ts', 'main');
      put(root, 'GLOSSARY.md', 'main glossary');
      git(root, 'commit', '-qam', 'main edit');
      git(root, 'checkout', '-q', 'feat/x');
      spawnSync('git', ['merge', 'main'], { cwd: root });
      put(root, 'src/a.ts', 'resolved');
      git(root, 'add', 'src/a.ts');
      // ACT
      const merging = guard(root);
      const checked = guard(root, '--against', 'main');
      // ASSERT
      expect(git(root, 'status', '--porcelain')).toContain('GLOSSARY.md');
      expect(merging.status).toBe(0);
      expect(checked.status).toBe(0);
    });
  });
});

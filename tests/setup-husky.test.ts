import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createDir, createRepo, gitConfig, message, REPO_ROOT, runScript, SETUP_HUSKY } from './helpers/commit-gate';

/**
 * A repo that looks like one husky has already been installed into, with the
 * skill present at its canonical installed path. Building it by hand keeps these
 * tests off the network — husky's own installer is not what is under test.
 */
function copySkill(dir: string): void {
  cpSync(join(REPO_ROOT, 'skills', 'commit'), join(dir, '.agents', 'skills', 'commit'), { recursive: true });
}

function repoWithSkill(config: Record<string, string> = {}): string {
  const dir = createRepo(config);
  writeFileSync(join(dir, 'package.json'), '{\n  "name": "fixture",\n  "private": true\n}\n');
  mkdirSync(join(dir, '.husky', '_'), { recursive: true });
  writeFileSync(join(dir, '.husky', '_', 'h'), '# husky shim\n');
  copySkill(dir);
  return dir;
}

const setup = (cwd: string) => runScript(SETUP_HUSKY, [], { cwd });
const hookPath = (dir: string) => join(dir, '.husky', 'commit-msg');

describe('refusing to run', () => {
  it('aborts outside a git repository', () => {
    const result = setup(createDir());
    expect(result.code).toBe(1);
    expect(result.output).toContain('git repository');
  });

  it('aborts with an explanation, not a shell error, when the gate cannot be located', () => {
    const dir = createRepo();
    writeFileSync(join(dir, 'package.json'), '{}\n');
    const result = setup(dir);
    expect(result.code).toBe(1);
    expect(result.output).toContain('--copy');
  });

  it('aborts when the repository has no package.json, pointing at the manual wiring', () => {
    const dir = createRepo();
    copySkill(dir);
    const result = setup(dir);
    expect(result.code).toBe(1);
    expect(result.output).toContain('package.json');
    expect(result.output).toContain('core.hooksPath');
  });
});

describe('wiring the hook', () => {
  it('writes .husky/commit-msg and reports it', () => {
    const dir = repoWithSkill();
    const result = setup(dir);
    expect(result.code).toBe(0);
    expect(readFileSync(hookPath(dir), 'utf8')).toContain('.agents/skills/commit/scripts/commit-msg');
    expect(result.output).toContain('.husky/commit-msg');
  });

  it('is safe to run twice and says nothing changed', () => {
    const dir = repoWithSkill();
    setup(dir);
    const first = readFileSync(hookPath(dir), 'utf8');
    const second = setup(dir);
    expect(second.code).toBe(0);
    expect(readFileSync(hookPath(dir), 'utf8')).toBe(first);
    expect(second.output).toContain('unchanged');
  });

  it('overwrites a stale hook body', () => {
    const dir = repoWithSkill();
    writeFileSync(hookPath(dir), 'echo something else\n');
    expect(setup(dir).code).toBe(0);
    expect(readFileSync(hookPath(dir), 'utf8')).toContain('.agents/skills/commit/scripts/commit-msg');
  });

  it('sets core.commentChar so the body headings survive git cleanup', () => {
    const dir = repoWithSkill();
    const result = setup(dir);
    expect(gitConfig(dir, 'core.commentChar')).toBe(';');
    expect(result.output).toContain('core.commentChar');
  });

  it('leaves an already-safe core.commentChar alone', () => {
    const dir = repoWithSkill({ 'core.commentChar': '%' });
    setup(dir);
    expect(gitConfig(dir, 'core.commentChar')).toBe('%');
  });
});

describe('the hook it writes', () => {
  it('rejects a non-compliant message end to end', () => {
    const dir = repoWithSkill();
    setup(dir);
    const bad = join(dir, 'bad-msg');
    writeFileSync(bad, 'nope, not a conventional commit\n');
    const result = runScript(hookPath(dir), [bad], { cwd: dir });
    expect(result.code).toBe(1);
    expect(result.output).toContain('✖ Header');
  });

  it('accepts a compliant message end to end', () => {
    const dir = repoWithSkill();
    setup(dir);
    const good = join(dir, 'good-msg');
    writeFileSync(good, message('feat(gate): wire the commit-msg hook'));
    expect(runScript(hookPath(dir), [good], { cwd: dir }).code).toBe(0);
  });

  it('explains itself when the skill is absent from the path it expects', () => {
    const source = repoWithSkill();
    setup(source);
    const bare = createRepo();
    cpSync(hookPath(source), join(bare, 'hook'));
    writeFileSync(join(bare, 'msg'), message('feat: x'));
    const result = runScript(join(bare, 'hook'), [join(bare, 'msg')], { cwd: bare });
    expect(result.code).toBe(1);
    expect(result.output).toContain('npx skills add');
  });
});

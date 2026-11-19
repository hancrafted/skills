import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { CONFIG_PATH, type DriveConfig, parseConfig, type WorktreeConfig } from './config.pure.ts';
import { capture } from './git.ts';
import { noLock, type WithLock } from './worktree-merge.ts';

export function fail(message: string): never {
  console.error(`✖ ${message}`);
  process.exit(1);
}

export function driveEntry(root: string, scriptsDir: string = import.meta.dirname): string {
  const relative = path.relative(root, path.join(scriptsDir, 'drive.ts'));
  const inside = relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
  return (inside ? relative : path.resolve(root, relative)).split(path.sep).join('/');
}

function mainRoot(): string {
  return path.dirname(path.resolve(capture('git', ['rev-parse', '--git-common-dir'])));
}

export interface Project {
  config: WorktreeConfig;
  root: string;
  remoteBase: string;
  withLock: WithLock;
}

export function loadConfig(root: string): DriveConfig {
  const configFile = path.join(root, CONFIG_PATH);
  const text = existsSync(configFile) ? readFileSync(configFile, 'utf8') : '';
  const parsed = parseConfig(text, driveEntry(root));
  if ('error' in parsed) fail(parsed.error);
  return parsed;
}

export async function loadProject(): Promise<Project> {
  const root = capture('git', ['rev-parse', '--show-toplevel']);
  const parsed = loadConfig(root);
  const { worktree: config } = parsed;
  let withLock = noLock;
  if (config.lock !== null) {
    const loaded = (await import(pathToFileURL(path.resolve(root, config.lock)).href)) as { withLock?: WithLock };
    if (typeof loaded.withLock !== 'function') fail(`worktree.lock: ${config.lock} does not export withLock`);
    withLock = loaded.withLock;
  } else console.warn('! no worktree.lock configured: merges into a base are not serialized');
  return {
    config,
    root: mainRoot(),
    remoteBase: `${config.remote}/${config.baseBranch}`,
    withLock,
  };
}

export function worktreePath(project: Project, branch: string): string {
  return path.join(project.root, project.config.dir, branch.replaceAll('/', '-'));
}

export interface HookEnv {
  branch: string;
  base: string | null;
  worktree: string;
  forkedAt: Date | null;
  cwd?: string;
}

export function runHooks(project: Project, commands: readonly string[], hook: HookEnv): boolean {
  const cwd = hook.cwd ?? project.root;
  const env = {
    ...process.env,
    DRIVE_ROOT: project.root,
    DRIVE_BRANCH: hook.branch,
    DRIVE_BASE: hook.base ?? '',
    DRIVE_WORKTREE: hook.worktree,
    DRIVE_FORKED_AT: hook.forkedAt?.toISOString() ?? '',
  };
  for (const command of commands) {
    const { status } = spawnSync(command, {
      shell: true,
      cwd,
      env,
      stdio: 'inherit',
    });
    if (status !== 0) {
      console.error(`✖ hook failed (${status}): ${command}`);
      return false;
    }
  }
  return true;
}

export function runAfter(project: Project, commands: readonly string[], hook: HookEnv): void {
  if (!runHooks(project, commands, hook))
    console.warn('! a hook after the finish failed; the finish itself went through');
}

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, readlinkSync, rmSync } from 'node:fs';
import path from 'node:path';
import { git } from './git.ts';

const FINDER_METADATA = new Set(['.DS_Store']);

const isListed = (target: string, cwd: string): boolean =>
  git(cwd, ['worktree', 'list', '--porcelain']).stdout.split('\n').includes(`worktree ${target}`);

function committedBlobs(branch: string, cwd: string): Map<string, string> {
  const blobs = new Map<string, string>();
  for (const entry of git(cwd, ['ls-tree', '-r', '-z', '--full-tree', branch]).stdout.split('\0')) {
    const match = /^\d+ blob (\w+)\t(.+)$/s.exec(entry);
    if (match) blobs.set(match[2], match[1]);
  }
  return blobs;
}

function ignored(paths: string[], cwd: string): Set<string> {
  if (paths.length === 0) return new Set();
  const out = git(cwd, ['check-ignore', '--no-index', '--stdin'], paths.join('\n') + '\n').stdout;
  return new Set(out.split('\n').filter(Boolean));
}

function unsavedLeftovers(target: string, branch: string, cwd: string): string[] {
  const algorithm = git(cwd, ['rev-parse', '--show-object-format']).stdout.trim();
  const blobId = (content: Buffer) =>
    createHash(algorithm).update(`blob ${content.length}\0`).update(content).digest('hex');
  const blobs = committedBlobs(branch, cwd);
  const unsaved: string[] = [];
  let level = [''];
  while (level.length > 0) {
    const entries = level.flatMap((dir) =>
      readdirSync(path.join(target, dir), { withFileTypes: true })
        .filter((entry) => !FINDER_METADATA.has(entry.name))
        .map((entry) => ({
          rel: dir + entry.name + (entry.isDirectory() ? '/' : ''),
          entry,
        })),
    );
    const skip = ignored(
      entries.map((e) => e.rel),
      cwd,
    );
    const kept = entries.filter((e) => !skip.has(e.rel));
    level = kept.filter((e) => e.entry.isDirectory()).map((e) => e.rel);
    for (const { rel, entry } of kept.filter((e) => !e.entry.isDirectory())) {
      const full = path.join(target, rel);
      const content = entry.isSymbolicLink() ? Buffer.from(readlinkSync(full)) : readFileSync(full);
      if (blobs.get(rel) !== blobId(content)) unsaved.push(rel);
    }
  }
  return unsaved.sort();
}

export function removeWorktree(target: string, branch: string, cwd: string): 'removed' | 'leftovers-cleared' | 'gone' {
  const remove = git(cwd, ['worktree', 'remove', target]);
  if (remove.status === 0) return 'removed';
  if (isListed(target, cwd)) throw new Error(`git worktree remove refused:\n${remove.stderr.trim()}`);
  if (!existsSync(target)) return 'gone';
  const unsaved = unsavedLeftovers(target, branch, cwd);
  if (unsaved.length > 0)
    throw new Error(
      `${target} is left half-removed and holds files ${branch} does not have; save or delete them, then rerun:\n  ${unsaved.join('\n  ')}`,
    );
  rmSync(target, { recursive: true, force: true });
  return 'leftovers-cleared';
}

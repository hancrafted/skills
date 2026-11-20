import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseDocument } from 'yaml';
import { DRIVE_FOLDER, run } from '../core/index.ts';
import { LEARNINGS_INSTALL, readRecordedVersion, renderHomeReadme, SELF } from './readme.pure.ts';

export const OLD_STORE = `${DRIVE_FOLDER}/learnings`;
export const NEW_STORE = 'docs/learnings/drive';
const LEARNINGS_HOMES = ['skills', '.agents/skills', '.claude/skills'];
const OWN_SKILL_FILE = path.resolve(import.meta.dirname, '..', '..', 'SKILL.md');

export function ownVersion(skillFile = OWN_SKILL_FILE): string {
  const front = /^---\n([\s\S]*?)\n---/.exec(readFileSync(skillFile, 'utf8'))?.[1] ?? '';
  const version = (parseDocument(front).toJS() as { metadata?: { version?: unknown } } | null)?.metadata?.version;
  if (typeof version !== 'string') throw new Error(`${skillFile} has no metadata.version`);
  return version;
}

export const learningsInstalled = (root: string): boolean =>
  LEARNINGS_HOMES.some((home) => existsSync(path.join(root, home, 'learnings', 'SKILL.md')));

export const oldStoreExists = (root: string): boolean => existsSync(path.join(root, OLD_STORE));

export function moveOldStore(root: string): void {
  if (existsSync(path.join(root, NEW_STORE)))
    throw new Error(`${NEW_STORE} already exists; merge it with ${OLD_STORE} by hand, then rerun setup`);
  const mkdir = run('mkdir', ['-p', path.dirname(path.join(root, NEW_STORE))]);
  if (mkdir.status !== 0) throw new Error(mkdir.stderr);
  const moved = run('git', ['mv', OLD_STORE, NEW_STORE], { cwd: root });
  if (moved.status !== 0) throw new Error(`git mv ${OLD_STORE} ${NEW_STORE} failed:\n${moved.stderr}`);
}

export function installLearnings(root: string): void {
  const [command = '', ...args] = LEARNINGS_INSTALL.split(' ');
  const result = run(command, args, { cwd: root });
  if (result.status !== 0) throw new Error(`${LEARNINGS_INSTALL} failed:\n${result.stderr}`);
}

const README = `${DRIVE_FOLDER}/README.md`;

export interface LearningsApproval {
  approve: boolean;
  install: (root: string) => void;
}

type Write = (relative: string, text: string) => void;

function pendingNote(root: string): string {
  const steps = [
    ...(learningsInstalled(root) ? [] : [`install learnings (${LEARNINGS_INSTALL})`]),
    ...(oldStoreExists(root) ? [`git mv ${OLD_STORE} ${NEW_STORE}`] : []),
    `record ${SELF}@${ownVersion()} in ${README}`,
  ];
  return `! pending, one step: ${steps.join('; ')}. Rerun \`drive setup --approve-learnings\` to approve it.`;
}

function recordVersion(root: string, write: Write): void {
  const version = ownVersion();
  const file = path.join(root, README);
  const existing = existsSync(file) ? readFileSync(file, 'utf8') : null;
  if (readRecordedVersion(existing) === `${SELF}@${version}`) return;
  write(README, renderHomeReadme(existing, version, new Date().toISOString().slice(0, 10)));
}

function approvedStep(root: string, install: (root: string) => void): string[] {
  const notes: string[] = [];
  if (oldStoreExists(root)) {
    moveOldStore(root);
    notes.push(`✔ moved ${OLD_STORE} to ${NEW_STORE} with git mv`);
  }
  if (!learningsInstalled(root)) {
    install(root);
    if (!learningsInstalled(root)) throw new Error(`${LEARNINGS_INSTALL} ran, but learnings is still not installed`);
    notes.push('✔ installed learnings');
  }
  return notes;
}

export function learningsStep(root: string, { approve, install }: LearningsApproval, write: Write): string[] {
  const pending = oldStoreExists(root) || !learningsInstalled(root);
  if (pending && !approve) return [pendingNote(root)];
  const notes = approvedStep(root, install);
  recordVersion(root, write);
  return notes;
}

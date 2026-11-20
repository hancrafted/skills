import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  CONFIG_PATH,
  type DetectedSkill,
  DRIVE_FOLDER,
  driveEntry,
  fail,
  mergeDetected,
  readBinding,
  run,
  updateBinding,
} from '../core/index.ts';
import { missingBindingSkills, parseSetupArgs, type SetupOptions } from './args.pure.ts';
import { enforcerFacts, projectFacts } from './facts.ts';
import { adapterHookNote, addAdapterHooks, SETTINGS_FILE } from './hooks.pure.ts';
import { installLearnings, learningsStep } from './learnings.ts';
import {
  addGuardToHook,
  addLearningsCheck,
  detectEnforcers,
  guardCiLine,
  guardCommand,
  guardHookLine,
  learningsCheckCommand,
  learningsCheckNote,
  renderEnforcers,
  updateProjectConfig,
} from './setup.pure.ts';
import { PROFILES_STUB, REVIEW_STUB } from './stubs.pure.ts';

export const LOCKFILE = 'skills-lock.json';
const AUTHORED_DIR = 'skills';
const INSTALLED_DIRS = ['.agents/skills', '.claude/skills'];
const SELF = 'drive';

const read = (file: string): string | null => {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return null;
  }
};

const subfolders = (dir: string): string[] => {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
};

function lockedSkills(root: string): DetectedSkill[] {
  const lock = read(path.join(root, LOCKFILE));
  if (lock === null) return [];
  let parsed: { skills?: Record<string, { source?: string }> };
  try {
    parsed = JSON.parse(lock);
  } catch (error) {
    throw new Error(`${LOCKFILE} is not valid JSON: ${(error as Error).message}`, { cause: error });
  }
  return Object.entries(parsed.skills ?? {}).map(([name, value]) => ({
    name,
    origin: 'installed',
    source: value.source ?? null,
  }));
}

export function detectSkills(root: string): DetectedSkill[] {
  const authored = subfolders(path.join(root, AUTHORED_DIR))
    .filter((name) => existsSync(path.join(root, AUTHORED_DIR, name, 'SKILL.md')))
    .map((name): DetectedSkill => ({ name, origin: 'authored', source: null }));
  const folders = INSTALLED_DIRS.flatMap((dir) => subfolders(path.join(root, dir))).map((name): DetectedSkill => ({
    name,
    origin: 'installed',
    source: null,
  }));
  const firstSightingWins = [authored, lockedSkills(root), folders];
  return mergeDetected(firstSightingWins, SELF);
}

export interface SetupResult {
  written: string[];
  notes: string[];
}

export type SetupInput = SetupOptions & { install?: (root: string) => void };

type Write = (relative: string, text: string) => void;

function fileWriter(root: string, written: string[]): { write: Write; createdOnly: Write } {
  const write: Write = (relative, text) => {
    const file = path.join(root, relative);
    if (read(file) === text) return;
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, text);
    written.push(relative);
  };
  const createdOnly: Write = (relative, text) => {
    if (!existsSync(path.join(root, relative))) write(relative, text);
  };
  return { write, createdOnly };
}

export function setup(root: string, scriptsRoot: string, options: SetupInput = {}): SetupResult {
  const written: string[] = [];
  const notes: string[] = [];
  const { write, createdOnly } = fileWriter(root, written);
  const entry = driveEntry(root, scriptsRoot);
  const facts = projectFacts(root, entry);
  write(
    `${DRIVE_FOLDER}/binding.yml`,
    updateBinding(read(path.join(root, DRIVE_FOLDER, 'binding.yml')), detectSkills(root), options),
  );
  write(CONFIG_PATH, updateProjectConfig(read(path.join(root, CONFIG_PATH)), facts));
  write(`${DRIVE_FOLDER}/enforcers.yml`, renderEnforcers(detectEnforcers(enforcerFacts(root))));
  notes.push(...wire(root, { entry, baseBranch: facts.baseBranch }, write));
  createdOnly(`${DRIVE_FOLDER}/profiles.md`, PROFILES_STUB);
  createdOnly(`${DRIVE_FOLDER}/review.md`, REVIEW_STUB);
  notes.push(
    ...learningsStep(
      root,
      { approve: options.approveLearnings === true, install: options.install ?? installLearnings },
      write,
    ),
  );
  return { written, notes };
}

const HOOK = '.husky/pre-commit';

function wireGuard(
  root: string,
  { entry, baseBranch }: { entry: string; baseBranch: string },
  write: (relative: string, text: string) => void,
): string | null {
  const hook = read(path.join(root, HOOK));
  if (hook === null) return guardCiLine(guardCommand(entry, `origin/${baseBranch}`));
  if (path.isAbsolute(entry)) return guardHookLine(HOOK, guardCommand(entry));
  write(HOOK, addGuardToHook(hook, guardCommand(entry)));
  return null;
}

const MANIFEST = 'package.json';

function wire(
  root: string,
  guard: { entry: string; baseBranch: string },
  write: (relative: string, text: string) => void,
): string[] {
  const notes = [
    wireGuard(root, guard, write),
    wireLearningsCheck(root, guard.entry, write),
    wireAdapterHooks(root, guard.entry, write),
  ];
  return notes.filter((note): note is string => note !== null);
}

function wireAdapterHooks(root: string, entry: string, write: (relative: string, text: string) => void): string | null {
  if (path.isAbsolute(entry)) return adapterHookNote(entry);
  const result = addAdapterHooks(read(path.join(root, SETTINGS_FILE)), entry);
  if ('note' in result) return result.note;
  write(SETTINGS_FILE, result.text);
  return null;
}

function wireLearningsCheck(
  root: string,
  entry: string,
  write: (relative: string, text: string) => void,
): string | null {
  const command = learningsCheckCommand(entry);
  if (path.isAbsolute(entry)) return learningsCheckNote(command);
  const result = addLearningsCheck(read(path.join(root, MANIFEST)), command);
  if ('note' in result) return result.note;
  write(MANIFEST, result.text);
  return null;
}

export function checkBinding(root: string): string[] {
  const text = read(path.join(root, DRIVE_FOLDER, 'binding.yml'));
  if (text === null) return [`${DRIVE_FOLDER}/binding.yml does not exist; run \`drive setup\``];
  const binding = readBinding(text);
  if ('error' in binding) return [binding.error];
  const installed = detectSkills(root).map((skill) => skill.name);
  return missingBindingSkills(binding, installed).map(
    ({ skill, phases }) =>
      `${DRIVE_FOLDER}/binding.yml binds '${skill}' (${phases.join(', ')}) but no such skill is installed; rename or remove it`,
  );
}

function reportBinding(root: string): void {
  const problems = checkBinding(root);
  if (problems.length > 0) fail(problems.join('\n✖ '));
  console.log('✔ every skill the Binding names is installed');
}

export function runSetup(args: readonly string[], scriptsRoot: string): void {
  const options = parseSetupArgs(args);
  if ('error' in options) fail(options.error);
  const root = path.resolve(run('git', ['rev-parse', '--show-toplevel']).stdout.trim() || process.cwd());
  if (options.check) return reportBinding(root);
  let result: SetupResult;
  try {
    result = setup(root, scriptsRoot, options);
  } catch (error) {
    fail((error as Error).message);
  }
  const { written, notes } = result;
  console.log(
    written.length === 0 ? `✔ ${DRIVE_FOLDER}/ is up to date` : written.map((file) => `✔ wrote ${file}`).join('\n'),
  );
  for (const note of notes) console.log(note);
}

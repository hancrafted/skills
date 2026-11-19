import { Document, type YAMLMap } from 'yaml';
import { defaultsFor, PARALLEL_DEFAULTS } from './config.pure.ts';
import { FAILURE_MODES_FOLDER, LEARNINGS_STORE, RECORDS_FOLDER } from './learnings.pure.ts';
import { openMapping } from './yaml.pure.ts';

export type EnforcerKind = 'adr-checker' | 'linter' | 'type-checker' | 'test-runner' | 'formatter' | 'check' | 'hook';

export interface Enforcer {
  kind: EnforcerKind;
  name: string;
  command: string;
}

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export interface EnforcerFacts {
  scripts: Readonly<Record<string, string>>;
  packageManager: PackageManager;
  hooks: readonly string[];
  adrChecker: boolean;
}

const SCRIPT_KINDS: readonly (readonly [EnforcerKind, RegExp])[] = [
  ['type-checker', /\b(tsc|typecheck|type-check|mypy|pyright)\b/],
  ['formatter', /\b(format|prettier|oxfmt)\b/],
  ['linter', /\b(lint|oxlint|eslint|biome|ruff)\b/],
  ['test-runner', /\b(vitest|jest|pytest|mocha|test)\b/],
  ['check', /^check\b/],
];

const REWRITERS = /^(?!.*(--check|:check|-check\b))(?=.*\b(format|prettier|oxfmt)\b)/;

function classifyScript(name: string, body: string): EnforcerKind | null {
  if (name.startsWith('lint-staged') || name.endsWith(':watch') || REWRITERS.test(`${name} ${body}`)) return null;
  const byName = SCRIPT_KINDS.find(([, pattern]) => pattern.test(name));
  return (byName ?? SCRIPT_KINDS.find(([, pattern]) => pattern.test(body)))?.[0] ?? null;
}

export function detectEnforcers({ scripts, packageManager, hooks, adrChecker }: EnforcerFacts): Enforcer[] {
  const adr: Enforcer[] = adrChecker ? [{ kind: 'adr-checker', name: 'archgate', command: 'archgate check' }] : [];
  const fromScripts = Object.entries(scripts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, body]) => ({
      kind: classifyScript(name, body),
      name,
      command: `${packageManager} run ${name}`,
    }))
    .filter((found): found is Enforcer => found.kind !== null);
  const fromHooks = [...hooks].sort().map((hook): Enforcer => ({ kind: 'hook', name: hook, command: hook }));
  return [...adr, ...fromScripts, ...fromHooks];
}

export function renderEnforcers(enforcers: readonly Enforcer[]): string {
  const doc = new Document({ enforcers });
  doc.commentBefore = [
    ' The Enforcers `drive setup` detected, for Fortify to choose from (see the Drive glossary).',
    ' Generated: every run rewrites this file. To change what Fortify may pick, change the repo, then re-run setup.',
  ].join('\n');
  return doc.toString();
}

const LOCKFILES: readonly (readonly [string, PackageManager, string])[] = [
  ['package-lock.json', 'npm', 'npm ci'],
  ['pnpm-lock.yaml', 'pnpm', 'pnpm install --frozen-lockfile'],
  ['yarn.lock', 'yarn', 'yarn install --frozen-lockfile'],
  ['bun.lock', 'bun', 'bun install --frozen-lockfile'],
  ['bun.lockb', 'bun', 'bun install --frozen-lockfile'],
];

const lockfileOf = (files: readonly string[]) => LOCKFILES.find(([name]) => files.includes(name));

export const detectPackageManager = (files: readonly string[]): PackageManager => lockfileOf(files)?.[1] ?? 'npm';

export const installCommands = (files: readonly string[]): string[] => {
  const found = lockfileOf(files);
  return found === undefined ? [] : [found[2]];
};

export function decisionDocGlobs(folders: readonly string[], hasGlossary: boolean): string[] {
  const globs = folders.map((folder) => `${folder}/**`);
  return hasGlossary ? [...globs, '**/GLOSSARY*.md'] : globs;
}

export interface ProjectFacts {
  baseBranch: string;
  harnessCap: number;
  install: readonly string[];
  driveEntry: string;
  decisionDocs: readonly string[];
}

interface Section {
  key: string;
  value: unknown;
  comment: string;
}

function addSection(doc: Document, root: YAMLMap, { key, value, comment }: Section): void {
  if (root.has(key)) return;
  const name = doc.createNode(key);
  name.commentBefore = comment;
  root.set(name, doc.createNode(value));
}

const PARALLEL_NOTE =
  ' Subagents at once: the lower of `default` and `harnessCap`, the rest queue. `harnessCap` records the agent\n' +
  " harness's own limit beside it; `drive` never writes harness settings.";
const MODELS_NOTE =
  ' Model tiers: the Binding names a tier per phase (mid | top); each provider entry maps a tier to its model.\n' +
  ' The harness resolves a tier through its own provider entry.';
export const DEFAULT_MODELS = {
  claude: { mid: 'sonnet', top: 'opus' },
} as const;
const DECISION_DOCS_NOTE = ' Decision docs: paths and globs that change only on a `decisions/*` branch.';

export function updateProjectConfig(existing: string | null, facts: ProjectFacts): string {
  const { doc, root } = openMapping(existing, 'project config');
  const { baseBranch, harnessCap, install, decisionDocs, driveEntry } = facts;
  const worktree = { ...defaultsFor(driveEntry), baseBranch, install };
  const seeded = {
    dir: worktree.dir,
    baseBranch,
    remote: worktree.remote,
    invoke: worktree.invoke,
    install,
    beforeMerge: worktree.beforeMerge,
  };
  if (!root.has('worktree')) root.set('worktree', doc.createNode(seeded));
  addSection(doc, root, {
    key: 'parallel',
    value: { ...PARALLEL_DEFAULTS, harnessCap },
    comment: PARALLEL_NOTE,
  });
  addSection(doc, root, {
    key: 'models',
    value: DEFAULT_MODELS,
    comment: MODELS_NOTE,
  });
  addSection(doc, root, {
    key: 'decisionDocs',
    value: [...decisionDocs],
    comment: DECISION_DOCS_NOTE,
  });
  return doc.toString();
}

export const guardCommand = (driveEntry: string, against: string | null = null): string =>
  `node ${driveEntry} guard${against === null ? '' : ` --against ${against}`}`;

export const runsGuard = (text: string): boolean => /drive\.ts guard\b/.test(text);

export function addGuardToHook(hook: string, command: string): string {
  if (runsGuard(hook)) return hook;
  const lines = hook.split('\n');
  const first = lines.findIndex((line) => line.trim() !== '' && !line.trim().startsWith('#'));
  lines.splice(first === -1 ? lines.length : first, 0, command);
  return lines.join('\n').replace(/\n*$/, '\n');
}

export const guardLineNote = (where: string, command: string): string => `! ${where}:\n    ${command}`;

export const guardCiLine = (command: string): string =>
  guardLineNote(
    'no .husky/pre-commit: add this line to your CI so Decision docs change only on a decisions/* branch',
    command,
  );

export const guardHookLine = (hook: string, command: string): string =>
  guardLineNote(`the drive skill sits outside this repo, so ${hook} was left alone: add this line to it`, command);

const DOCS_CHECK_SCRIPT = 'check:docs';
export const HARNESS_CONFIG_FILE = 'markdown-harness.config.yaml';

export function learningsCheckCommand(driveEntry: string): string {
  const skillFolder = driveEntry.split('/').slice(0, -2).join('/');
  return `mh check --root ${LEARNINGS_STORE} --config ${skillFolder}/${HARNESS_CONFIG_FILE} && node ${driveEntry} learnings check`;
}

export const learningsCheckNote = (command: string): string =>
  guardLineNote(
    `no ${DOCS_CHECK_SCRIPT} script in package.json: add this to the docs check, so the learnings store stays Fortify-ready`,
    command,
  );

function docsCheckScript(manifest: string): string | null {
  try {
    const script = (JSON.parse(manifest) as { scripts?: Record<string, unknown> }).scripts?.[DOCS_CHECK_SCRIPT];
    return typeof script === 'string' ? script : null;
  } catch {
    return null;
  }
}

export function addLearningsCheck(manifest: string | null, command: string): { text: string } | { note: string } {
  const script = manifest === null ? null : docsCheckScript(manifest);
  if (manifest === null || script === null) return { note: learningsCheckNote(command) };
  if (script.includes(command)) return { text: manifest };
  const quotedScript = JSON.stringify(script);
  const keyAt = manifest.indexOf(JSON.stringify(DOCS_CHECK_SCRIPT));
  const at = manifest.indexOf(quotedScript, keyAt);
  if (at === -1) return { note: learningsCheckNote(command) };
  const wired = JSON.stringify(`${script} && ${command}`);
  return { text: manifest.slice(0, at) + wired + manifest.slice(at + quotedScript.length) };
}

export const LEARNINGS_README = `# Drive learnings

What each drive Workflow hit, kept so Fortify counts recurrences from records instead of trusting a typed number.

- \`${RECORDS_FOLDER}/<date>-<workflow>.md\`: one per Workflow, written at the end of Verify and never edited after its Fortify question. Each H2 names a failure mode.
- \`${FAILURE_MODES_FOLDER}/<slug>.md\`: one per failure mode, holding its title, Enforcer and status, never a count.

The drive skill's \`${HARNESS_CONFIG_FILE}\` is the template for both. Before writing a file, read what it asks with \`mh query --intents ${RECORDS_FOLDER}/<file>.md --config <skill>/${HARNESS_CONFIG_FILE}\` (or \`${FAILURE_MODES_FOLDER}/<file>.md\`); paths are relative to this folder. Before creating a failure mode, run \`drive learnings similar "<failure>"\` and cite the match when its Enforcer would catch this case too.

\`drive learnings\` lists every failure mode with its computed count, its status and \`regressed\` when a record cites it after its fix. \`drive learnings check\` runs in the docs check beside \`mh check\`.
`;

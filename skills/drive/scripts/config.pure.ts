import { parse } from 'yaml';
import { readModels, type ModelsConfig } from './models.pure.ts';
import { isRecord, isText } from './yaml.pure.ts';

export const CONFIG_PATH = 'docs/drive/project.yml';
export const DRIVE_FOLDER = CONFIG_PATH.slice(0, CONFIG_PATH.lastIndexOf('/'));

export interface WorktreeConfig {
  dir: string;
  baseBranch: string;
  remote: string;
  invoke: string;
  install: string[];
  preflight: string | null;
  lock: string | null;
  beforeMerge: string[];
  beforeRemove: string[];
  afterMerge: string[];
  afterRemove: string[];
}

export interface ParallelConfig {
  default: number;
  harnessCap: number;
}

export interface GrillConfig {
  format: string | null;
}

export interface DriveConfig {
  worktree: WorktreeConfig;
  parallel: ParallelConfig;
  decisionDocs: string[];
  models: ModelsConfig;
  grill: GrillConfig;
}

export const PARALLEL_DEFAULTS: ParallelConfig = { default: 3, harnessCap: 20 };

export function harnessCapFrom(env: Readonly<Record<string, string | undefined>>): number {
  const count = Number(env.CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS);
  return Number.isInteger(count) && count >= 1 ? count : PARALLEL_DEFAULTS.harnessCap;
}

export const defaultsFor = (entry: string): WorktreeConfig => ({
  dir: '.worktrees',
  baseBranch: 'main',
  remote: 'origin',
  invoke: `node ${entry} worktree`,
  install: [],
  preflight: null,
  lock: null,
  beforeMerge: [],
  beforeRemove: [],
  afterMerge: [],
  afterRemove: [],
});

const isTextList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const KEYS = Object.keys(defaultsFor('')) as (keyof WorktreeConfig)[];

function problem(key: keyof WorktreeConfig, value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (Array.isArray(defaultsFor('')[key]))
    return isTextList(value) ? null : `worktree.${key} must be a list of shell commands`;
  return isText(value) ? null : `worktree.${key} must be a non-empty string`;
}

function readWorktree(section: Record<string, unknown>, entry: string): WorktreeConfig | { error: string } {
  const unknown = Object.keys(section).find((key) => !(KEYS as string[]).includes(key));
  if (unknown !== undefined)
    return {
      error: `unknown worktree key '${unknown}'; expected ${KEYS.join(', ')}`,
    };
  const wrong = KEYS.map((key) => problem(key, section[key])).find((message) => message !== null);
  if (wrong !== undefined && wrong !== null) return { error: wrong };
  return {
    ...defaultsFor(entry),
    ...Object.fromEntries(Object.entries(section).filter(([, value]) => value != null)),
  };
}

export function parseConfig(text: string, entry: string): DriveConfig | { error: string } {
  let doc: unknown;
  try {
    doc = parse(text);
  } catch (error) {
    return {
      error: `${CONFIG_PATH} is not valid YAML: ${(error as Error).message}`,
    };
  }
  const root = doc ?? {};
  if (!isRecord(root)) return { error: `${CONFIG_PATH} must be a mapping` };
  return readProject(root, entry);
}

function readProject(root: Record<string, unknown>, entry: string): DriveConfig | { error: string } {
  const section = root.worktree ?? {};
  if (!isRecord(section)) return { error: `worktree in ${CONFIG_PATH} must be a mapping` };
  const worktree = readWorktree(section, entry);
  if ('error' in worktree) return worktree;
  const rest = readRest(root);
  return 'error' in rest ? rest : { worktree, ...rest };
}

function readRest(root: Record<string, unknown>): Omit<DriveConfig, 'worktree'> | { error: string } {
  const parallel = readParallel(root.parallel);
  if ('error' in parallel) return parallel;
  const docs = root.decisionDocs ?? [];
  if (!isTextList(docs)) return { error: 'decisionDocs must be a list of paths' };
  const models = readModels(root.models, CONFIG_PATH);
  if ('error' in models) return models;
  const grill = readGrill(root.grill);
  if ('error' in grill) return grill;
  return { parallel, models: models.models, decisionDocs: docs, grill };
}

function readGrill(section: unknown): GrillConfig | { error: string } {
  const body = section ?? {};
  if (!isRecord(body)) return { error: `grill in ${CONFIG_PATH} must be a mapping` };
  const unknown = Object.keys(body).find((key) => key !== 'format');
  if (unknown !== undefined) return { error: `unknown grill key '${unknown}'; expected format` };
  return readGrillFormat(body.format ?? null);
}

const readGrillFormat = (format: unknown): GrillConfig | { error: string } =>
  format === null || isText(format) ? { format } : { error: 'grill.format must be a non-empty path' };

const isCount = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 1;

function readParallel(section: unknown): ParallelConfig | { error: string } {
  if (section === undefined || section === null) return { ...PARALLEL_DEFAULTS };
  if (!isRecord(section)) return { error: `parallel in ${CONFIG_PATH} must be a mapping` };
  const unknown = Object.keys(section).find((key) => key !== 'default' && key !== 'harnessCap');
  if (unknown !== undefined)
    return {
      error: `unknown parallel key '${unknown}'; expected default, harnessCap`,
    };
  const merged = {
    ...PARALLEL_DEFAULTS,
    ...Object.fromEntries(Object.entries(section).filter(([, v]) => v != null)),
  };
  if (!isCount(merged.default)) return { error: 'parallel.default must be a whole number of at least 1' };
  if (!isCount(merged.harnessCap))
    return {
      error: 'parallel.harnessCap must be a whole number of at least 1',
    };
  return merged;
}

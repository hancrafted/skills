import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { type Command, parseCommand, USAGE } from './args.pure.ts';
import {
  countCitations,
  FAILURE_MODES_FOLDER,
  type FailureMode,
  LEARNINGS_HOME,
  type LearningsRecord,
  legacyLearningsFileOf,
  parseFailureMode,
  parseRecord,
  RECORDS_FOLDER,
  renderRows,
  storeOf,
  storeProblems,
} from './learnings.pure.ts';
import { recordRun } from './record.ts';
import { failed, type LoadedStore, type Ports, type Report } from './report.pure.ts';
import { renderSimilar, similarTitles } from './similar.pure.ts';
import { fileUpstream } from './upstream.ts';
import { offSkills } from './write.pure.ts';

const markdownFiles = (folder: string): string[] => {
  try {
    return readdirSync(folder)
      .filter((name) => name.endsWith('.md'))
      .sort();
  } catch {
    return [];
  }
};

export function loadStore(root: string, skill: string): LoadedStore {
  const store = path.join(root, storeOf(skill));
  const errors: string[] = [];
  const modes: FailureMode[] = [];
  const records: LearningsRecord[] = [];
  for (const name of markdownFiles(path.join(store, FAILURE_MODES_FOLDER))) {
    const parsed = parseFailureMode(
      name.slice(0, -'.md'.length),
      readFileSync(path.join(store, FAILURE_MODES_FOLDER, name), 'utf8'),
    );
    if ('error' in parsed) errors.push(parsed.error);
    else modes.push(parsed);
  }
  for (const name of markdownFiles(path.join(store, RECORDS_FOLDER))) {
    const parsed = parseRecord(name, readFileSync(path.join(store, RECORDS_FOLDER, name), 'utf8'));
    if ('error' in parsed) errors.push(parsed.error);
    else records.push(parsed);
  }
  return {
    skill,
    modes,
    records,
    legacyFileExists: existsSync(path.join(root, legacyLearningsFileOf(skill))),
    errors,
  };
}

function checkOne(root: string, skill: string): Report {
  const store = loadStore(root, skill);
  const problems = [...store.errors, ...storeProblems(store)];
  if (problems.length > 0)
    return failed(problems.map((problem) => (problem.startsWith('docs/') ? problem : `${storeOf(skill)}/${problem}`)));
  return {
    output: `✔ ${storeOf(skill)}: ${store.modes.length} failure modes, ${store.records.length} records`,
    exit: 0,
  };
}

function skillsWithStore(root: string): string[] {
  try {
    return readdirSync(path.join(root, LEARNINGS_HOME), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

function checkReport(root: string, skill: string | null): Report {
  const skills = skill === null ? skillsWithStore(root) : [skill];
  if (skills.length === 0) return { output: `✔ ${LEARNINGS_HOME}: no skill has a store yet`, exit: 0 };
  const reports = skills.map((name) => checkOne(root, name));
  return {
    output: reports.map((report) => report.output).join('\n'),
    exit: reports.some((report) => report.exit === 1) ? 1 : 0,
  };
}

function similarReport(store: LoadedStore, text: string): Report {
  const matches = similarTitles(text, store.modes);
  return {
    output: matches.length > 0 ? renderSimilar(matches) : `no failure mode shares a word with "${text}": create one`,
    exit: 0,
  };
}

function queryReport(store: LoadedStore, { verb, rest }: Command): Report {
  if (store.errors.length > 0) return failed(store.errors);
  if (verb === 'list') return { output: renderRows(countCitations(store.modes, store.records)), exit: 0 };
  if (rest.length === 0) return { output: USAGE, exit: 1 };
  return similarReport(store, rest.join(' '));
}

export function isOff(root: string, skill: string): boolean {
  const readme = path.join(root, LEARNINGS_HOME, 'README.md');
  return existsSync(readme) && offSkills(readFileSync(readme, 'utf8')).includes(skill);
}

function writeReport(root: string, command: Command, ports: Ports): Report {
  const skill = command.skill ?? '';
  if (isOff(root, skill)) return failed([`learning is off for ${skill} in ${LEARNINGS_HOME}/README.md`]);
  const store = loadStore(root, skill);
  if (store.errors.length > 0) return failed(store.errors);
  const context = { root, store, command, ports };
  return command.verb === 'record' ? recordRun(context) : fileUpstream(context);
}

export function learningsReport(root: string, argv: readonly string[], ports: Ports): Report {
  const command = parseCommand(argv);
  if ('error' in command) return failed([command.error, USAGE]);
  const { verb, skill } = command;
  if (verb === 'check') return checkReport(root, skill);
  if (skill === null) return failed([USAGE]);
  if (verb === 'record' || verb === 'file-upstream') return writeReport(root, command, ports);
  return queryReport(loadStore(root, skill), command);
}

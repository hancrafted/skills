// The frozen eval cases: cases/manifest.json lists each case's prompt, inputs and the sha256 of every frozen
// file. A case runs only while every hash still matches, so arms in any iteration see byte-identical inputs.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { asMode, type Asked, type FidelityRung, type Mode } from '../../scripts/grader/check.ts';
import { askedOf, atRung } from './calibration.pure.ts';
import type { CaseItem } from './judge.pure.ts';
import { UNKNOWN, type ProbeQuestion } from './probe.pure.ts';
import type { Ruling, Source } from './quality.pure.ts';

export const CASES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../cases');

interface ManifestCase {
  readonly id: string;
  readonly mode?: string;
  readonly prompt: string;
  readonly attachments: readonly string[];
  readonly calibration?: string;
  /** The judge's case items and the reader probe with its answer key; grading files the run never sees. */
  readonly checklist?: string;
  readonly probe?: string;
  /** A page a person judged good, frozen beside the case; the reference grader compares runs with it. Runs never see it. */
  readonly reference?: string;
  readonly hashes: Readonly<Record<string, string>>;
}

/** A case ready to run headless. Paths are relative to CASES. */
export interface EvalCase {
  readonly id: string;
  /** skill-creator's numeric eval id: the case's position in the manifest, from 1. */
  readonly evalId: number;
  readonly mode: Mode;
  readonly prompt: string;
  /** The files copied beside the prompt: its attachments, then the calibration answers. */
  readonly inputs: readonly string[];
  readonly calibration: string;
  /** Inputs the run gets with other content than their frozen file: a sweep variant's calibration. */
  readonly rewrites: Readonly<Record<string, string>>;
  readonly hashes: Readonly<Record<string, string>>;
  /** What the calibration answers ask that a check compares the page with, such as one fidelity rung. */
  readonly asked: Asked;
}

export function readManifest(): { cases: ManifestCase[] } {
  return JSON.parse(readFileSync(path.join(CASES, 'manifest.json'), 'utf8')) as { cases: ManifestCase[] };
}

/** One problem per frozen file under `dir` that is missing or whose sha256 differs from `hashes`. */
export function hashProblems(dir: string, hashes: Readonly<Record<string, string>>): string[] {
  return Object.entries(hashes).flatMap(([file, hash]) => {
    const full = path.join(dir, file);
    if (!existsSync(full)) return [`${file} is missing`];
    const actual = createHash('sha256').update(readFileSync(full)).digest('hex');
    return actual === hash ? [] : [`${file} no longer matches its frozen hash; restore it, or freeze a new case`];
  });
}

export function loadCase(id: string): EvalCase {
  const { cases } = readManifest();
  const index = cases.findIndex((entry) => entry.id === id);
  if (index === -1) throw new Error(`no eval case "${id}"; cases: ${cases.map((entry) => entry.id).join(', ')}`);
  const { prompt, attachments, calibration, hashes } = cases[index];
  const mode = asMode(cases[index].mode);
  if (mode === null || calibration === undefined)
    throw new Error(`case "${id}" has no known mode or no calibration answers, so it cannot run headless`);
  const asked = askedOf(readFileSync(path.join(CASES, calibration), 'utf8'));
  const inputs = [...attachments, calibration];
  return { id, evalId: index + 1, mode, prompt, inputs, calibration, rewrites: {}, hashes, asked };
}

/** The case with its calibration asking `rung` for every item, and nothing else changed. */
export function atFidelity(evalCase: EvalCase, rung: FidelityRung): EvalCase {
  const calibration = atRung(readFileSync(path.join(CASES, evalCase.calibration), 'utf8'), rung);
  return { ...evalCase, asked: askedOf(calibration), rewrites: { [evalCase.calibration]: calibration } };
}

/** The case's frozen reference page, relative to CASES; null when it has none. */
export function referenceOf(id: string): string | null {
  const entry = readManifest().cases.find((candidate) => candidate.id === id);
  if (entry === undefined) throw new Error(`no eval case "${id}"`);
  return entry.reference ?? null;
}

/** What the judge and the reader probe ask about a case's page: checklist.json's items and probe.json's questions. */
export interface QualityKeys {
  readonly checklist: readonly CaseItem[];
  readonly probe: readonly ProbeQuestion[];
}

const readCaseJson = <T>(file: string | undefined, fallback: T): T =>
  file === undefined ? fallback : (JSON.parse(readFileSync(path.join(CASES, file), 'utf8')) as T);

/** The case's checklist items and probe questions; null when it has neither, so only mechanical graders apply. */
export function qualityKeys(id: string): QualityKeys | null {
  const entry = readManifest().cases.find((candidate) => candidate.id === id);
  if (entry === undefined) throw new Error(`no eval case "${id}"`);
  if (entry.checklist === undefined && entry.probe === undefined) return null;
  return {
    checklist: readCaseJson<{ items: CaseItem[] }>(entry.checklist, { items: [] }).items,
    probe: readCaseJson<{ questions: ProbeQuestion[] }>(entry.probe, { questions: [] }).questions,
  };
}

/** The case's quotes of a person's rulings: provenance only, so a run never sees it. */
const ROUNDS = 'rounds.md';

/** A checklist holds one item per rule the person set; a page held to a long list of rules, like episode-spec, needs more than 5. */
const MIN_ITEMS = 3;
const MAX_ITEMS = 12;

/** Where a case's inputs are: its folder under `dir`, and the file names a run sees. */
interface Inputs {
  readonly dir: string;
  readonly folder: string;
  readonly seen: ReadonlySet<string>;
}

/** One problem when a key's source is not text the run sees (or, for a ruling, text in rounds.md). */
function sourceProblems({ dir, folder, seen }: Inputs, label: string, source: Source | Ruling): string[] {
  if ('session' in source) {
    const rounds = path.join(dir, folder, ROUNDS);
    if (!existsSync(rounds)) return [`${label} cites a ruling, but ${ROUNDS} is missing`];
    return readFileSync(rounds, 'utf8').includes(source.quote)
      ? []
      : [`${label} quotes text not in ${ROUNDS}: "${source.quote}"`];
  }
  const { file, quote } = source;
  if (!seen.has(file)) return [`${label} quotes ${file}, which the run never sees`];
  const text = readFileSync(path.join(dir, folder, file), 'utf8');
  return text.includes(quote) ? [] : [`${label} quotes text not in ${file}: "${quote}"`];
}

/**
 * A key must come from what the run itself sees (its prompt, attachments and calibration answers), quoted verbatim,
 * never from a generated page or a provenance-only file; a checklist item may instead cite a ruling. One problem per
 * key that does not.
 */
export function keyProblems(dir: string, evalCase: EvalCase, { checklist, probe }: QualityKeys): string[] {
  const folder = path.dirname(evalCase.prompt);
  const seen = new Set([evalCase.prompt, ...evalCase.inputs].map((file) => path.basename(file)));
  const sourced = (label: string, source: Source | Ruling) => sourceProblems({ dir, folder, seen }, label, source);
  const keyed = ({ id, choices, answer }: ProbeQuestion): string[] => {
    if (answer.length === 0) return [`probe ${id} has no key`];
    if (UNKNOWN in choices) return [`probe ${id} offers "${UNKNOWN}", which every question already offers`];
    return answer
      .filter((choice) => !(choice in choices))
      .map((choice) => `probe ${id} keys ${choice}, which is not one of its choices`);
  };
  return [
    ...(checklist.length >= MIN_ITEMS && checklist.length <= MAX_ITEMS
      ? []
      : [`checklist has ${checklist.length} items; a case has ${MIN_ITEMS} to ${MAX_ITEMS}`]),
    ...checklist.flatMap((item) => sourced(`checklist ${item.id}`, item.source)),
    ...probe.flatMap((question) => [...sourced(`probe ${question.id}`, question.source), ...keyed(question)]),
  ];
}

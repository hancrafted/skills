import { parse } from 'yaml';
import { DRIVE_FOLDER, isRecord, isText } from '../core/index.ts';

export const FAILURE_MODE_STATUSES = ['proposed', 'ticket', 'fixed', 'wontfix'] as const;
export type FailureModeStatus = (typeof FAILURE_MODE_STATUSES)[number];

export interface FailureMode {
  slug: string;
  title: string;
  heading: string | null;
  enforcer: string;
  status: FailureModeStatus;
  ticket: string | null;
  fixedBy: string | null;
  fixedOn: string | null;
  reason: string | null;
}

export interface Citation {
  slug: string;
  bullets: string[];
}

export interface LearningsRecord {
  file: string;
  workflow: string;
  date: string;
  fortify: 'engaged' | 'skipped' | 'pending';
  skipReason: string | null;
  citations: Citation[];
}

export interface CitationRow {
  slug: string;
  count: number;
  status: FailureModeStatus;
  regressed: boolean;
}

export interface Store {
  modes: readonly FailureMode[];
  records: readonly LearningsRecord[];
  legacyFileExists: boolean;
}

export const FAILURE_MODES_FOLDER = 'failure-modes';
export const RECORDS_FOLDER = 'records';
export const LEARNINGS_STORE = `${DRIVE_FOLDER}/learnings`;
export const LEGACY_LEARNINGS_FILE = `${DRIVE_FOLDER}/learnings.md`;
const BULLET_LABELS = ['**Evidence:**', '**Correction:**', '**Regressed:**'] as const;
const REGRESSED_LABEL = '**Regressed:**';

function splitFrontMatter(text: string): { data: Record<string, unknown>; body: string } | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);
  if (match === null) return null;
  const data: unknown = parse(match[1] ?? '');
  return isRecord(data) ? { data, body: text.slice(match[0].length) } : null;
}

const optionalText = (value: unknown): string | null => (isText(value) ? value : null);

const isStatus = (value: unknown): value is FailureModeStatus =>
  FAILURE_MODE_STATUSES.some((status) => status === value);

function topLevelHeadings(body: string, level: number): { text: string; lines: string[] }[] {
  const marker = `${'#'.repeat(level)} `;
  const sections: { text: string; lines: string[] }[] = [];
  let insideFence = false;
  for (const line of body.split(/\r?\n/)) {
    if (/^(```|~~~)/.test(line)) insideFence = !insideFence;
    if (!insideFence && line.startsWith(marker)) sections.push({ text: line.slice(marker.length).trim(), lines: [] });
    else sections.at(-1)?.lines.push(line);
  }
  return sections;
}

export function parseFailureMode(slug: string, text: string): FailureMode | { error: string } {
  const where = `${FAILURE_MODES_FOLDER}/${slug}.md`;
  const split = splitFrontMatter(text);
  if (split === null) return { error: `${where}: no front matter` };
  const { data, body } = split;
  if (!isText(data.title) || !isText(data.enforcer)) return { error: `${where}: title and enforcer are required` };
  if (!isStatus(data.status))
    return {
      error: `${where}: status must be ${FAILURE_MODE_STATUSES.join(', ').replace(/, (\w+)$/, ' or $1')}`,
    };
  return {
    slug,
    title: data.title,
    heading: topLevelHeadings(body, 1)[0]?.text ?? null,
    enforcer: data.enforcer,
    status: data.status,
    ticket: optionalText(data.ticket),
    fixedBy: optionalText(data['fixed-by']),
    fixedOn: optionalText(data['fixed-on']),
    reason: optionalText(data.reason),
  };
}

export function parseRecord(file: string, text: string): LearningsRecord | { error: string } {
  const where = `${RECORDS_FOLDER}/${file}`;
  const split = splitFrontMatter(text);
  if (split === null) return { error: `${where}: no front matter` };
  const { data, body } = split;
  if (!isText(data.workflow) || !isText(data.date)) return { error: `${where}: workflow and date are required` };
  if (data.fortify !== 'engaged' && data.fortify !== 'skipped' && data.fortify !== 'pending')
    return { error: `${where}: fortify must be engaged, skipped or pending` };
  const citations = topLevelHeadings(body, 2).map(({ text: slug, lines }) => ({
    slug,
    bullets: lines.filter((line) => line.startsWith('- ')).map((line) => line.slice(2).trim()),
  }));
  return {
    file,
    workflow: data.workflow,
    date: data.date,
    fortify: data.fortify,
    skipReason: optionalText(data['skip-reason']),
    citations,
  };
}

const carriesRegressedBullet = (record: LearningsRecord, slug: string): boolean =>
  record.citations.some(
    (citation) => citation.slug === slug && citation.bullets.some((bullet) => bullet.startsWith(REGRESSED_LABEL)),
  );

const citesAfterFix = (mode: FailureMode, record: LearningsRecord): boolean =>
  mode.status === 'fixed' && mode.fixedOn !== null && record.date > mode.fixedOn;

const cites = (record: LearningsRecord, slug: string): boolean =>
  record.citations.some((citation) => citation.slug === slug);

export function countCitations(modes: readonly FailureMode[], records: readonly LearningsRecord[]): CitationRow[] {
  return modes
    .map((mode) => {
      const citing = records.filter((record) => cites(record, mode.slug));
      return {
        slug: mode.slug,
        count: citing.length,
        status: mode.status,
        regressed: citing.some(
          (record) =>
            (mode.status === 'fixed' && carriesRegressedBullet(record, mode.slug)) || citesAfterFix(mode, record),
        ),
      };
    })
    .sort((left, right) => right.count - left.count || left.slug.localeCompare(right.slug));
}

export function renderRows(rows: readonly CitationRow[]): string {
  const header = `count  ${'status'.padEnd(8)}  failure mode`;
  const lines = rows.map(
    ({ slug, count, status, regressed }) =>
      `${String(count).padStart(5)}  ${status.padEnd(8)}  ${slug}${regressed ? '  regressed' : ''}`,
  );
  return [header, ...lines].join('\n');
}

const FIELDS_A_STATUS_NEEDS: Record<FailureModeStatus, readonly ('ticket' | 'fixedBy' | 'fixedOn' | 'reason')[]> = {
  proposed: [],
  ticket: ['ticket'],
  fixed: ['fixedBy', 'fixedOn'],
  wontfix: ['reason'],
};
const FRONT_MATTER_KEYS = {
  ticket: 'ticket',
  fixedBy: 'fixed-by',
  fixedOn: 'fixed-on',
  reason: 'reason',
} as const;

function failureModeProblems(mode: FailureMode): string[] {
  const where = `${FAILURE_MODES_FOLDER}/${mode.slug}.md`;
  const missing = FIELDS_A_STATUS_NEEDS[mode.status]
    .filter((field) => mode[field] === null)
    .map((field) => `${where}: status ${mode.status} needs ${FRONT_MATTER_KEYS[field]}`);
  const headingDiffers = mode.heading !== null && mode.heading !== mode.title;
  return headingDiffers
    ? [...missing, `${where}: the H1 "${mode.heading}" differs from title "${mode.title}"`]
    : missing;
}

interface RecordContext {
  record: LearningsRecord;
  seen: Set<string>;
  bySlug: ReadonlyMap<string, FailureMode>;
}

function citationProblems({ record, seen, bySlug }: RecordContext, citation: Citation): string[] {
  const where = `${RECORDS_FOLDER}/${record.file}: ## ${citation.slug}`;
  const problems: string[] = [];
  const mode = bySlug.get(citation.slug);
  if (mode === undefined)
    problems.push(
      `${where} names no ${FAILURE_MODES_FOLDER}/${citation.slug}.md; cite an existing one (drive learnings similar "<failure>") or create it`,
    );
  if (seen.has(citation.slug)) problems.push(`${where} appears twice; cite a failure mode once per record`);
  seen.add(citation.slug);
  if (citation.bullets.some((bullet) => !BULLET_LABELS.some((label) => bullet.startsWith(label))))
    problems.push(`${where} has a bullet that opens with none of ${BULLET_LABELS.join(', ')}`);
  const saysRegressed = citation.bullets.some((bullet) => bullet.startsWith(REGRESSED_LABEL));
  if (mode !== undefined && citesAfterFix(mode, record) && !saysRegressed)
    problems.push(
      `${where} cites a failure mode fixed on ${mode.fixedOn} by ${mode.fixedBy}; add a ${REGRESSED_LABEL} bullet saying why the fix did not hold`,
    );
  return problems;
}

function recordProblems(record: LearningsRecord, bySlug: ReadonlyMap<string, FailureMode>): string[] {
  const where = `${RECORDS_FOLDER}/${record.file}`;
  const problems: string[] = [];
  const expectedFile = `${record.date}-${record.workflow}.md`;
  if (record.file !== expectedFile) problems.push(`${where}: name it ${expectedFile}, from its date and workflow`);
  if (record.fortify === 'skipped' && record.skipReason === null)
    problems.push(`${where}: fortify skipped needs skip-reason`);
  if (record.fortify !== 'skipped' && record.skipReason !== null)
    problems.push(`${where}: skip-reason belongs only to fortify skipped`);
  const context = { record, seen: new Set<string>(), bySlug };
  return [...problems, ...record.citations.flatMap((citation) => citationProblems(context, citation))];
}

export function storeProblems({ modes, records, legacyFileExists }: Store): string[] {
  const legacy =
    legacyFileExists && modes.length > 0
      ? [
          `${LEGACY_LEARNINGS_FILE} exists beside the learnings store: move its entries into ${RECORDS_FOLDER}/ and ${FAILURE_MODES_FOLDER}/, then delete it`,
        ]
      : [];
  const bySlug = new Map(modes.map((mode) => [mode.slug, mode]));
  return [
    ...legacy,
    ...modes.flatMap(failureModeProblems),
    ...records.flatMap((record) => recordProblems(record, bySlug)),
  ];
}

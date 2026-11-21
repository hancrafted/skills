export const CONTRADICTIONS_HEADING = '## Contradictions';
const ENTRY_SHAPE = '- "<quote>" (<file>:<line>) vs "<quote>" (<file>:<line>)';
const ENTRY = /^- "(.*?\S.*?)" \(([^()\s]+):(\d+)\) vs "(.*?\S.*?)" \(([^()\s]+):(\d+)\)$/;

const REVIEWED = /^Reviewed: (\S+)$/m;

export interface CommitSource {
  knows: (sha: string) => boolean;
  show: (sha: string, file: string) => string | null;
}

function lastHeadingOutsideFences(lines: readonly string[]): number {
  let fenced = false;
  let found = -1;
  lines.forEach((line, at) => {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    else if (!fenced && line.trim().toLowerCase() === CONTRADICTIONS_HEADING.toLowerCase()) found = at;
  });
  return found;
}

function reviewedSha(lines: readonly string[]): string | null {
  return REVIEWED.exec(lines.join('\n'))?.[1] ?? null;
}

function sectionLines(lines: readonly string[], start: number): string[] {
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^#{1,2} /.test(line));
  return (end === -1 ? rest : rest.slice(0, end)).map((line) => line.trim()).filter((line) => line !== '');
}

interface Cited {
  quote: string;
  file: string;
  line: number;
}

function citedProblem({ quote, file, line }: Cited, sha: string, source: CommitSource): string | null {
  const text = source.show(sha, file);
  if (text === null) return `file not found at ${sha}: ${file}`;
  return text.split('\n')[line - 1]?.includes(quote) === true
    ? null
    : `quote not on ${file}:${line} at ${sha}: "${quote}"`;
}

function entryProblems(entry: string, sha: string, source: CommitSource): string[] {
  const match = ENTRY.exec(entry);
  if (match === null) return [`malformed entry, expected ${ENTRY_SHAPE}: ${entry}`];
  const [, quoteA, fileA, lineA, quoteB, fileB, lineB] = match.map((part) => part ?? '');
  const cited: Cited[] = [
    { quote: quoteA ?? '', file: fileA ?? '', line: Number(lineA) },
    { quote: quoteB ?? '', file: fileB ?? '', line: Number(lineB) },
  ];
  return cited.map((one) => citedProblem(one, sha, source)).filter((problem) => problem !== null);
}

function checkedEntries(before: readonly string[], entries: readonly string[], source: CommitSource) {
  const sha = reviewedSha(before);
  if (sha === null)
    return [`the report has no "Reviewed: <sha>" line before "${CONTRADICTIONS_HEADING}"; add the commit you reviewed`];
  if (!source.knows(sha)) return [`unknown commit ${sha} in "Reviewed:"`];
  return entries.flatMap((entry) => entryProblems(entry, sha, source));
}

export function quoteProblems(report: string, source: CommitSource): string[] {
  const lines = report.split('\n');
  const start = lastHeadingOutsideFences(lines);
  if (start === -1)
    return [`the report has no "${CONTRADICTIONS_HEADING}" section; add it, one bullet per pair, or none`];
  const entries = sectionLines(lines, start);
  if (entries.length === 0) return [`"${CONTRADICTIONS_HEADING}" is empty; write one bullet per pair, or none`];
  if (entries.length === 1 && /^(- )?none$/i.test(entries[0] ?? '')) return [];
  return checkedEntries(lines.slice(0, start), entries, source);
}

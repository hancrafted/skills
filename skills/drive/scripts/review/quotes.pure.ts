export const CONTRADICTIONS_HEADING = '## Contradictions';
const ENTRY_SHAPE = '- "<quote>" (<file>:<line>) vs "<quote>" (<file>:<line>)';
const ENTRY = /^- "(.*?\S.*?)" \(([^()\s]+):(\d+)\) vs "(.*?\S.*?)" \(([^()\s]+):(\d+)\)$/;

export type ReadFile = (file: string) => string | null;

function lastHeadingOutsideFences(lines: readonly string[]): number {
  let fenced = false;
  let found = -1;
  lines.forEach((line, at) => {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    else if (!fenced && line.trim().toLowerCase() === CONTRADICTIONS_HEADING.toLowerCase()) found = at;
  });
  return found;
}

function sectionLines(report: string): string[] | null {
  const lines = report.split('\n');
  const start = lastHeadingOutsideFences(lines);
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^#{1,2} /.test(line));
  return (end === -1 ? rest : rest.slice(0, end)).map((line) => line.trim()).filter((line) => line !== '');
}

interface Cited {
  quote: string;
  file: string;
  line: number;
}

function citedProblem({ quote, file, line }: Cited, read: ReadFile): string | null {
  const text = read(file);
  if (text === null) return `file not found: ${file}`;
  return text.split('\n')[line - 1]?.includes(quote) === true ? null : `quote not on ${file}:${line}: "${quote}"`;
}

function entryProblems(entry: string, read: ReadFile): string[] {
  const match = ENTRY.exec(entry);
  if (match === null) return [`malformed entry, expected ${ENTRY_SHAPE}: ${entry}`];
  const [, quoteA, fileA, lineA, quoteB, fileB, lineB] = match.map((part) => part ?? '');
  const cited: Cited[] = [
    { quote: quoteA ?? '', file: fileA ?? '', line: Number(lineA) },
    { quote: quoteB ?? '', file: fileB ?? '', line: Number(lineB) },
  ];
  return cited.map((one) => citedProblem(one, read)).filter((problem) => problem !== null);
}

export function quoteProblems(report: string, read: ReadFile): string[] {
  const lines = sectionLines(report);
  if (lines === null)
    return [`the report has no "${CONTRADICTIONS_HEADING}" section; add it, one bullet per pair, or none`];
  if (lines.length === 0) return [`"${CONTRADICTIONS_HEADING}" is empty; write one bullet per pair, or none`];
  if (lines.length === 1 && /^(- )?none$/i.test(lines[0] ?? '')) return [];
  return lines.flatMap((line) => entryProblems(line, read));
}

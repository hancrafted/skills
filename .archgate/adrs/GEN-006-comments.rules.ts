/// <reference path="../rules.d.ts" />

const PROVENANCE = '(GEN-006 [no-comments])';
const LADDER = 'Ladder: GEN-006 §2; names: GEN-007.';
const ADR_FILE = '.archgate/adrs/GEN-006-comments.md';
const ADR_GLOB = '.archgate/adrs/*.md';
const REGISTRY_HEADER = /^\|\s*Marker\s*\|\s*Read by\s*\|/;

const MARKER_REGISTRY = [
  '// ARRANGE',
  '// ACT',
  '// ASSERT',
  '// @ts-expect-error',
  '{/* @ts-expect-error */}',
  '/// <reference … />',
  '// <label>: <target>',
  '/* <label>: <target> */',
];

const AAA_MARKERS = ['ARRANGE', 'ACT', 'ASSERT'];
const TS_EXPECT_ERROR = '@ts-expect-error';
const REFERENCE_BARE = /^\/ <reference (?:path|types|lib|no-default-lib)="[^"]*" \/>$/;
const REFERENCE_OPEN = /^\/ <reference\b/;
const LINT_DIRECTIVE = /^\s*(?:eslint|oxlint)-(?:disable|enable)\b/;
const POINTER_OPEN = /^\s*(decision|tech-debt):(.*)$/s;
const URL_OPEN = /^https?:\/\//;
const THIS_REPO_URL = /^https:\/\/github\.com\/hancrafted\/skills\//;

const GENERIC_ARROW_PARAMETERS = /^[A-Za-z_$][\w$]*>\s*\((?:[^()]|\([^()]*\))*\)\s*(?::[^=]*)?=>/;

const SCRIPT_EXTENSION = /\.(?:[cm]?[jt]s|[jt]sx)$/;
const JSX_EXTENSION = /\.[jt]sx$/;
const CSS_EXTENSION = /\.css$/;
const REGEX_AFTER_WORDS = new Set([
  'return',
  'typeof',
  'instanceof',
  'in',
  'of',
  'new',
  'delete',
  'void',
  'throw',
  'case',
  'do',
  'else',
  'yield',
  'await',
]);

const TARGETS = {
  decision: {
    grammar: /(?:([A-Z]+-\d{3}) §(\d+)(?:\.(\d+))?|(docs\/decision-records\/(?:[a-z0-9-]+\/)?\d{4}-[a-z0-9-]+\.md))/,
    takes:
      'an Archgate ADR section, `decision: ARCH-003 §2`, or a Decision record path, `decision: docs/decision-records/drive/0017-example.md`',
  },
  ['tech-debt']: {
    grammar: /https:\/\/github\.com\/hancrafted\/skills\/issues\/\d+/,
    takes: 'an issue URL of this repo, `tech-debt: https://github.com/hancrafted/skills/issues/<n>`',
  },
} as const;

type Label = keyof typeof TARGETS;
const LABELS = Object.keys(TARGETS) as Label[];

const HELP = {
  exportDoc: [
    'Exported declaration JSDoc',
    'Move the contract into the type and a test named for it, then delete the comment; a doc that restates the name just goes; a unit in it becomes a full-word suffix of the name (GEN-007), and a contract a test already pins needs no move: cite that test in the commit body.',
  ],
  localDoc: [
    'Non-exported declaration JSDoc',
    'Delete it if it restates the code; otherwise rename so the name says it. A reason a test already names needs no move: cite that test in the commit body and delete the comment. An ADR it cites becomes a `// decision: <ID> §<n>` pointer, a Decision record a `// decision: docs/decision-records/<file>.md` pointer; an issue number moves to the commit body.',
  ],
  body: [
    'In-body comment',
    'Extract a named constant or function that says it, or add a pointer marker on the line above. A reason for a catch is the name of its binding, or of the function that wraps it; in a test, fold it into the it or describe name; a reason about archgate itself, such as rules files being unable to import each other, goes to the commit body. A unit or a sum of measured parts in it is a full-word suffix on the name, the sum computed from named parts.',
  ],
  header: [
    'File header comment',
    'Delete it, or add a pointer marker; a module says what it is through its name and its doc. Each ADR section it cites becomes one `// decision:` pointer above the first import, or above the first declaration in a file with none, as in a rules file; an ADR cited without a section is resolved to one by reading it first. A pointer sits directly above code: no blank line under it, and a file opening with the `use client` directive puts its pointers on the lines under it. A bare path, a bold lead-in or an external URL has no target and goes to the commit body. What a test file pins belongs in its it and describe names.',
  ],
  trailing: [
    'Marker with trailing text',
    'Strip the text after the marker; move the text down the ladder. In a test the text goes into the it name; `// ARRANGE / ACT` is two markers short, so write each marker bare on its own line; a `@ts-expect-error` keeps the marker bare and its reason goes to the it name.',
  ],
  directive: [
    'Lint directive',
    'Turn the rule off in the lint config behind a files: glob, with its reason, or fix the code.',
  ],
  css: ['CSS comment', 'Delete it, or add a `/* decision: … */` pointer marker above it.'],
  jsx: [
    'JSX comment',
    'Delete it, or extract a component named for it (`HeaderSpacer`, `CrossCenteredInCircle`) and pin the reason in a test name.',
  ],
  catch: [
    'Comment in an empty catch',
    'Why is there a try? Remove it if nothing throws, or handle the error explicitly, in a fix: commit of its own with a test first.',
  ],
} as const;

type Position = keyof typeof HELP;

interface Comment {
  block: boolean;
  start: number;
  end: number;
  body: string;
}

interface Frame {
  mode: 'code' | 'template' | 'tag' | 'children';
  depth: number;
  nested: boolean;
  closing: boolean;
}

interface Scan {
  src: string;
  i: number;
  jsx: boolean;
  valueBefore: boolean;
  comments: Comment[];
  stack: Frame[];
}

interface Finding {
  line: number;
  text: string;
}

const frame = (mode: Frame['mode'], nested = true, closing = false): Frame => ({
  mode,
  depth: 0,
  nested,
  closing,
});
const top = (s: Scan) => s.stack[s.stack.length - 1];

function shebangEnd(src: string): number {
  if (!src.startsWith('#!')) return 0;
  const end = src.indexOf('\n');
  return end < 0 ? src.length : end;
}

function readLineComment(s: Scan): void {
  const found = s.src.indexOf('\n', s.i);
  const end = found < 0 ? s.src.length : found;
  s.comments.push({
    block: false,
    start: s.i,
    end,
    body: s.src.slice(s.i + 2, end),
  });
  s.i = end;
}

function readBlockComment(s: Scan): void {
  const close = s.src.indexOf('*/', s.i + 2);
  const bodyEnd = close < 0 ? s.src.length : close;
  const end = close < 0 ? s.src.length : close + 2;
  s.comments.push({
    block: true,
    start: s.i,
    end,
    body: s.src.slice(s.i + 2, bodyEnd),
  });
  s.i = end;
}

function readCommentAt(s: Scan): boolean {
  const pair = s.src.slice(s.i, s.i + 2);
  if (pair === '//') readLineComment(s);
  else if (pair === '/*') readBlockComment(s);
  else return false;
  return true;
}

function skipQuoted(s: Scan, quote: string, escapes: boolean): void {
  s.i++;
  while (s.i < s.src.length) {
    const ch = s.src[s.i];
    if (escapes && ch === '\\') s.i += 2;
    else if (ch === quote || (escapes && ch === '\n')) return void (s.i += ch === quote ? 1 : 0);
    else s.i++;
  }
}

function skipRegex(s: Scan): void {
  let inClass = false;
  s.i++;
  while (s.i < s.src.length && s.src[s.i] !== '\n') {
    const ch = s.src[s.i];
    if (ch === '\\') s.i++;
    else if (ch === '[' || ch === ']') inClass = ch === '[';
    else if (ch === '/' && !inClass) break;
    s.i++;
  }
  s.i++;
  while (/[a-z]/.test(s.src[s.i] ?? '')) s.i++;
}

function startsJsx(s: Scan): boolean {
  const rest = s.src.slice(s.i + 1, s.i + 120);
  if (rest.startsWith('>')) return true;
  if (/^[A-Za-z_$][\w$.:-]*(?:\s+extends\b|\s*,)/.test(rest)) return false;
  if (GENERIC_ARROW_PARAMETERS.test(rest)) return false;
  return /^[A-Za-z_$]/.test(rest);
}

function closeBrace(s: Scan): void {
  const current = top(s);
  s.i++;
  if (current.depth === 0 && current.nested) s.stack.pop();
  else current.depth--;
  s.valueBefore = true;
}

function readWord(s: Scan): void {
  const word = /^[\w$]+/.exec(s.src.slice(s.i))?.[0] ?? s.src[s.i];
  s.i += word.length;
  s.valueBefore = !REGEX_AFTER_WORDS.has(word);
}

function stepPunctuation(s: Scan, ch: string): void {
  if ((ch === '+' || ch === '-') && s.src[s.i + 1] === ch) {
    s.i += 2;
    return;
  }
  if (ch === '/') {
    if (s.valueBefore) s.i++;
    else skipRegex(s);
    s.valueBefore = !s.valueBefore;
    return;
  }
  if (ch === '<' && s.jsx && !s.valueBefore && startsJsx(s)) {
    s.stack.push(frame('tag'));
    s.i++;
    return;
  }
  s.valueBefore = ch === ')' || ch === ']';
  s.i++;
}

function stepCode(s: Scan): void {
  const ch = s.src[s.i];
  if (/\s/.test(ch)) s.i++;
  else if (readCommentAt(s)) return;
  else if (ch === "'" || ch === '"') {
    skipQuoted(s, ch, true);
    s.valueBefore = true;
  } else if (ch === '`') {
    s.stack.push(frame('template'));
    s.i++;
  } else if (ch === '{') {
    top(s).depth++;
    s.i++;
    s.valueBefore = false;
  } else if (ch === '}') closeBrace(s);
  else if (/[\w$]/.test(ch)) readWord(s);
  else stepPunctuation(s, ch);
}

function stepTemplate(s: Scan): void {
  const ch = s.src[s.i];
  if (ch === '\\') s.i += 2;
  else if (ch === '`') {
    s.stack.pop();
    s.i++;
    s.valueBefore = true;
  } else if (ch === '$' && s.src[s.i + 1] === '{') {
    s.stack.push(frame('code'));
    s.i += 2;
    s.valueBefore = false;
  } else s.i++;
}

function closeElement(s: Scan, tagFrames: number): void {
  s.stack.splice(s.stack.length - tagFrames, tagFrames);
  if (top(s).mode === 'code') s.valueBefore = true;
}

function stepTag(s: Scan): void {
  const ch = s.src[s.i];
  if (readCommentAt(s)) return;
  if (ch === '"' || ch === "'") skipQuoted(s, ch, false);
  else if (ch === '{') {
    s.stack.push(frame('code'));
    s.i++;
    s.valueBefore = false;
  } else if (ch === '/' && s.src[s.i + 1] === '>') {
    s.i += 2;
    closeElement(s, 1);
  } else if (ch === '>') {
    s.i++;
    if (top(s).closing) closeElement(s, 2);
    else s.stack[s.stack.length - 1] = frame('children');
  } else s.i++;
}

function stepChildren(s: Scan): void {
  const ch = s.src[s.i];
  if (ch === '{') {
    s.stack.push(frame('code'));
    s.valueBefore = false;
    s.i++;
  } else if (ch === '<') {
    const closing = s.src[s.i + 1] === '/';
    s.stack.push(frame('tag', true, closing));
    s.i += closing ? 2 : 1;
  } else s.i++;
}

const STEP: Record<Frame['mode'], (s: Scan) => void> = {
  code: stepCode,
  template: stepTemplate,
  tag: stepTag,
  children: stepChildren,
};

function scanScript(src: string, jsx: boolean): Comment[] {
  const s: Scan = {
    src,
    i: shebangEnd(src),
    jsx,
    valueBefore: false,
    comments: [],
    stack: [frame('code', false)],
  };
  while (s.i < src.length) STEP[top(s).mode](s);
  return s.comments;
}

function scanCss(src: string): Comment[] {
  const s: Scan = {
    src,
    i: 0,
    jsx: false,
    valueBefore: false,
    comments: [],
    stack: [],
  };
  while (s.i < src.length) {
    const ch = src[s.i];
    if (src.startsWith('/*', s.i)) readBlockComment(s);
    else if (ch === '"' || ch === "'") skipQuoted(s, ch, true);
    else s.i++;
  }
  return s.comments;
}

function blankComments(src: string, comments: Comment[]): string {
  const chars = src.split('');
  const ranges: [number, number][] = [[0, shebangEnd(src)], ...comments.map((c): [number, number] => [c.start, c.end])];
  for (const [start, end] of ranges) {
    for (let i = start; i < end; i++) if (chars[i] !== '\n') chars[i] = ' ';
  }
  return chars.join('');
}

const lineOf = (src: string, offset: number) => src.slice(0, offset).split('\n').length;

function decisionSectionHas(markdown: string, section: number, item: number | null): boolean {
  const decision = /^## Decision\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(markdown)?.[1] ?? '';
  const anchor = new RegExp(`^### ${section}\\.\\s[^\\n]*$([\\s\\S]*?)(?=^### |(?![\\s\\S]))`, 'm').exec(decision);
  if (!anchor) return false;
  return item === null || new RegExp(`^${item}\\.\\s`, 'm').test(anchor[1]);
}

async function readOrNull(ctx: RuleContext, path: string): Promise<string | null> {
  try {
    return await ctx.readFile(path);
  } catch {
    return null;
  }
}

async function checkDecision(ctx: RuleContext, match: RegExpMatchArray): Promise<string | null> {
  const [, id, section, item, designAdr] = match;
  if (designAdr) return (await readOrNull(ctx, designAdr)) === null ? `${designAdr} does not exist` : null;
  const adr = (await ctx.glob(ADR_GLOB)).find((file) => file.startsWith(`.archgate/adrs/${id}-`));
  if (!adr) return `no ADR ${id} under .archgate/adrs/`;
  const where = item ? `${section}.${item}` : section;
  const found = decisionSectionHas(await ctx.readFile(adr), Number(section), item ? Number(item) : null);
  return found ? null : `${id} has no Decision §${where}`;
}

const TARGET_CHECKS: Record<Label, (ctx: RuleContext, match: RegExpMatchArray) => Promise<string | null>> = {
  decision: checkDecision,
  'tech-debt': async () => null,
};

const whole = (label: Label) => new RegExp(`^${TARGETS[label].grammar.source}$`);
const withTail = (label: Label) => new RegExp(`^${TARGETS[label].grammar.source}\\s+\\S`);

function pointerShapeProblem(label: Label, target: string): string | null {
  if (withTail(label).test(target)) return 'trailing';
  if (URL_OPEN.test(target) && !THIS_REPO_URL.test(target))
    return `${target} is an external URL; an outside fact goes to the commit body.`;
  const owner = LABELS.find((other) => other !== label && whole(other).test(target));
  const kind = owner ? ` — that target belongs to ${owner}:` : '';
  return `${label}: takes ${TARGETS[label].takes}${kind}.`;
}

function placementProblem(src: string, comment: Comment): boolean {
  const lineStart = src.lastIndexOf('\n', comment.start - 1) + 1;
  const lineEnd = src.indexOf('\n', comment.end);
  const restOfLine = src.slice(comment.end, lineEnd < 0 ? src.length : lineEnd);
  const nextLine = lineEnd < 0 ? '' : src.slice(lineEnd + 1).split('\n')[0];
  return src.slice(lineStart, comment.start).trim() !== '' || restOfLine.trim() !== '' || nextLine.trim() === '';
}

async function pointerFinding(ctx: RuleContext, src: string, comment: Comment, css: boolean): Promise<string | null> {
  const [, rawLabel, rawTarget] = POINTER_OPEN.exec(comment.body) ?? [];
  const label = rawLabel as Label;
  const target = rawTarget.trim();
  if (comment.block !== css)
    return `Pointer marker: write it as ${css ? `/* ${label}: … */ in CSS` : `// ${label}: … outside CSS`}.`;
  const shape = whole(label).exec(target);
  if (!shape) {
    const problem = pointerShapeProblem(label, target);
    return problem === 'trailing' ? 'trailing' : `Pointer marker: ${problem}`;
  }
  if (placementProblem(src, comment))
    return 'Pointer marker: put it on its own line, directly above the code it explains.';
  const missing = await TARGET_CHECKS[label](ctx, shape);
  return missing === null ? null : `Pointer marker: ${missing}; repoint it or remove it.`;
}

function markerVerdict(comment: Comment, jsxSlot: boolean): 'bare' | 'trailing' | null {
  const body = comment.body.trim();
  if (!comment.block && AAA_MARKERS.some((m) => body === m)) return 'bare';
  if (!comment.block && AAA_MARKERS.some((m) => new RegExp(`^${m}\\b`).test(body))) return 'trailing';
  if (!comment.block && REFERENCE_OPEN.test(comment.body))
    return REFERENCE_BARE.test(comment.body.trim()) ? 'bare' : 'trailing';
  if (comment.block && !jsxSlot) return null;
  if (body === TS_EXPECT_ERROR) return 'bare';
  return body.startsWith(TS_EXPECT_ERROR) ? 'trailing' : null;
}

function scriptPosition(code: string, src: string, comment: Comment, jsx: boolean): Position {
  const before = code.slice(0, comment.start).trimEnd();
  const after = code.slice(comment.end).trimStart();
  if (jsx && comment.block && before.endsWith('{') && after.startsWith('}')) return 'jsx';
  if (/\bcatch\s*(?:\([^()]*\))?\s*\{$/.test(before) && after.startsWith('}')) return 'catch';
  const docBlock = comment.block && comment.body.startsWith('*');
  if (docBlock && !/^[ \t]*\r?\n[ \t]*\r?\n/.test(src.slice(comment.end)))
    return after.startsWith('export') ? 'exportDoc' : 'localDoc';
  if (/^(?:(['"])use (?:client|server)\1;?\s*)*$/.test(before)) return 'header';
  return 'body';
}

const positionMessage = (position: Position) => `${HELP[position][0]}: ${HELP[position][1]} ${LADDER} ${PROVENANCE}`;

async function scriptFinding(ctx: RuleContext, src: string, code: string, comment: Comment, jsx: boolean) {
  const jsxSlot = jsx && code.slice(0, comment.start).trimEnd().endsWith('{');
  if (LINT_DIRECTIVE.test(comment.body)) return positionMessage('directive');
  const marker = markerVerdict(comment, jsxSlot);
  if (marker === 'bare') return null;
  if (marker === 'trailing') return positionMessage('trailing');
  if (POINTER_OPEN.test(comment.body)) return pointerMessage(await pointerFinding(ctx, src, comment, false));
  return positionMessage(scriptPosition(code, src, comment, jsx));
}

function pointerMessage(finding: string | null): string | null {
  if (finding === null) return null;
  return finding === 'trailing' ? positionMessage('trailing') : `${finding} ${LADDER} ${PROVENANCE}`;
}

async function cssFinding(ctx: RuleContext, src: string, comment: Comment) {
  if (POINTER_OPEN.test(comment.body)) return pointerMessage(await pointerFinding(ctx, src, comment, true));
  return positionMessage('css');
}

async function findingsIn(ctx: RuleContext, file: string): Promise<Finding[]> {
  const src = await ctx.readFile(file);
  const css = CSS_EXTENSION.test(file);
  const jsx = JSX_EXTENSION.test(file);
  const comments = css ? scanCss(src) : scanScript(src, jsx);
  const code = blankComments(src, comments);
  const findings: Finding[] = [];
  for (const comment of comments) {
    const text = css ? await cssFinding(ctx, src, comment) : await scriptFinding(ctx, src, code, comment, jsx);
    if (text !== null) findings.push({ line: lineOf(src, comment.start), text });
  }
  return findings;
}

function governed(file: string): boolean {
  if (!file.includes('/') || /(?:^|\/)fixtures\//.test(file) || /\.generated\./.test(file)) return false;
  return SCRIPT_EXTENSION.test(file) || CSS_EXTENSION.test(file);
}

function registryInAdr(markdown: string): string[] {
  const lines = markdown.split('\n').map((line) => line.trim());
  const start = lines.findIndex((line) => REGISTRY_HEADER.test(line));
  if (start < 0) return [];
  const rows = lines
    .slice(start + 2)
    .filter((_, index, rest) => rest.slice(0, index + 1).every((l) => l.startsWith('|')));
  return rows.flatMap((row) => [...(row.split('|')[1] ?? '').matchAll(/`([^`]+)`/g)].map((m) => m[1]));
}

async function checkRegistryParity(ctx: RuleContext): Promise<void> {
  const documented = registryInAdr((await readOrNull(ctx, ADR_FILE)) ?? '');
  const missing = MARKER_REGISTRY.filter((m) => !documented.includes(m));
  const extra = documented.filter((m) => !MARKER_REGISTRY.includes(m));
  if (missing.length === 0 && extra.length === 0) return;
  const list = (items: string[]) => items.map((m) => `\`${m}\``).join(', ') || 'none';
  ctx.report.violation({
    message: `The marker registry table and the rule's registry differ — missing from the ADR table: ${list(missing)}; missing from the rule: ${list(extra)}. Change both together ${PROVENANCE}.`,
    file: ADR_FILE,
  });
}

export default {
  rules: {
    'no-comments': {
      description:
        'Governed code carries no prose comment, JSDoc included, in TS, JS and CSS: only a registered marker, bare, survives, and every pointer marker resolves to a target of its kind. Checks the files this run changed, so a commit checks its staged files and the full run every file.',
      severity: 'error',
      async check(ctx) {
        await checkRegistryParity(ctx);
        const changed = new Set(ctx.changedFiles);
        for (const file of ctx.scopedFiles.filter((f) => changed.has(f) && governed(f))) {
          for (const finding of await findingsIn(ctx, file)) {
            ctx.report.violation({
              message: finding.text,
              file,
              line: finding.line,
            });
          }
        }
      },
    },
  },
} satisfies RuleSet;

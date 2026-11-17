/// <reference path="../rules.d.ts" />

// decision: ARCH-003 §3.2
const TEST_GLOBS = ['skills/*/scripts/**/*.test.ts', 'tools/**/*.test.ts'];

async function testFiles(ctx: RuleContext): Promise<string[]> {
  const found = await Promise.all(TEST_GLOBS.map((glob) => ctx.glob(glob)));
  return [...new Set(found.flat())];
}
const BLOCKS = ['success cases', 'failure cases', 'edge cases'];

function laneSibling(file: string): string {
  return file.endsWith('.slow.test.ts')
    ? file.replace(/\.slow\.test\.ts$/, '.test.ts')
    : file.replace(/\.test\.ts$/, '.slow.test.ts');
}
const MARKERS = ['ARRANGE', 'ACT', 'ASSERT'];

const TOP_DESCRIBE_RE = /^(?:test\.)?describe(?:\.\w+)*\(\s*(['"`])(.*?)\1/;
const TEST_START_RE =
  /^\s*(?:it|test)(?!\.(?:describe|beforeEach|afterEach|beforeAll|afterAll|use|extend)\b)(?:\.\w+)*(?:\([\s\S]*?\))?\s*\(/;
const BLOCK_START_RE = /^\s*(?:test\.)?describe(?:\.\w+)*\(/;
const MARKER_COMMENT_RE = /^\s*\/\/\s*(arrange|act|assert)\b(.*)$/i;
const SECOND_MARKER_RE = /\b(arrange|act|assert)\b/i;

interface Body {
  line: number;
  markers: string[];
  malformed: string[];
}

function testBodies(lines: string[]): Body[] {
  const bodies: Body[] = [];
  let current: Body | null = null;
  lines.forEach((text, index) => {
    if (TEST_START_RE.test(text)) {
      current = { line: index + 1, markers: [], malformed: [] };
      bodies.push(current);
      return;
    }
    if (BLOCK_START_RE.test(text)) {
      current = null;
      return;
    }
    const marker = MARKER_COMMENT_RE.exec(text);
    if (current === null || marker === null) return;
    const word = marker[1];
    if (word !== word.toUpperCase() || SECOND_MARKER_RE.test(marker[2])) current.malformed.push(text.trim());
    else current.markers.push(word);
  });
  return bodies;
}

const ASSERT_MARKER_RE = /^\s*\/\/\s*ASSERT\s*$/;
const INDENT_RE = /^\s*/;
const NUMBER_RE = /^(?:0[xX][\da-fA-F_]+|\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?)n?/;
const REGEX_PRECEDER_RE = /[(,=:[!&|?{};]$|^$/;

interface Magic {
  line: number;
  literal: string;
}

function magicIn(text: string, firstLine: number): Magic[] {
  const found: Magic[] = [];
  let line = firstLine;
  let i = 0;
  let lastSignificant = '';
  while (i < text.length) {
    const ch = text[i];
    if (ch === '\n') {
      line++;
      i++;
      continue;
    }
    if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end === -1 ? text.length : end + 2;
      line += text.slice(i, stop).split('\n').length - 1;
      i = stop;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      i++;
      while (i < text.length && text[i] !== ch) {
        if (text[i] === '\\') i++;
        if (text[i] === '\n') line++;
        i++;
      }
      i++;
      lastSignificant = ch;
      continue;
    }
    if (ch === '/' && REGEX_PRECEDER_RE.test(lastSignificant)) {
      i++;
      let inClass = false;
      while (i < text.length && text[i] !== '\n' && (inClass || text[i] !== '/')) {
        if (text[i] === '\\') i++;
        else if (text[i] === '[') inClass = true;
        else if (text[i] === ']') inClass = false;
        i++;
      }
      i++;
      while (i < text.length && /[a-z]/i.test(text[i])) i++;
      lastSignificant = '/';
      continue;
    }
    if (/\d/.test(ch) && !/[\w$.]/.test(text[i - 1] ?? ' ')) {
      const m = NUMBER_RE.exec(text.slice(i));
      if (m !== null) {
        const value = Number(m[0].replace(/_/g, '').replace(/n$/, ''));
        if (value !== 0 && value !== 1) found.push({ line, literal: m[0] });
        i += m[0].length;
        lastSignificant = '0';
        continue;
      }
    }
    if (!/\s/.test(ch)) lastSignificant = ch;
    i++;
  }
  return found;
}

function assertBlocks(lines: string[]): { start: number; text: string }[] {
  const blocks: { start: number; text: string }[] = [];
  let testIndent = -1;
  let start = -1;
  let buffer: string[] = [];
  const flush = () => {
    if (start !== -1) blocks.push({ start, text: buffer.join('\n') });
    start = -1;
    buffer = [];
  };
  lines.forEach((text, index) => {
    if (TEST_START_RE.test(text) || BLOCK_START_RE.test(text)) {
      flush();
      testIndent = TEST_START_RE.test(text) ? INDENT_RE.exec(text)![0].length : -1;
      return;
    }
    if (ASSERT_MARKER_RE.test(text)) {
      flush();
      start = index + 2;
      return;
    }
    if (start === -1) return;
    const closes = /^\s*\}/.test(text) && INDENT_RE.exec(text)![0].length <= testIndent;
    if (closes) flush();
    else buffer.push(text);
  });
  flush();
  return blocks;
}

export default {
  rules: {
    'suite-three-blocks': {
      description:
        'Every test file in skill scripts and repository tools splits at top level into exactly three describe blocks — success cases, failure cases, edge cases — once each, with no fourth name; a *.slow.test.ts and its fast sibling hold the three between them (§2.1).',
      severity: 'error',
      async check(ctx) {
        const files = await testFiles(ctx);
        const blocksOf = new Map<string, string[]>();
        for (const file of files) {
          const lines = (await ctx.readFile(file)).split('\n');
          const seen: string[] = [];
          blocksOf.set(file, seen);
          lines.forEach((text, index) => {
            const m = TOP_DESCRIBE_RE.exec(text);
            if (m === null) return;
            const name = m[2];
            if (!BLOCKS.includes(name)) {
              ctx.report.violation({
                message: `Top-level describe '${name}' is not one of success cases, failure cases, edge cases — fold it into the block it belongs to (ARCH-003 [suite-three-blocks]).`,
                file,
                line: index + 1,
              });
            } else if (seen.includes(name)) {
              ctx.report.violation({
                message: `Top-level describe '${name}' appears twice — merge the two blocks (ARCH-003 [suite-three-blocks]).`,
                file,
                line: index + 1,
              });
            }
            seen.push(name);
          });
        }
        for (const file of files) {
          const held = [...(blocksOf.get(file) ?? []), ...(blocksOf.get(laneSibling(file)) ?? [])];
          const missing = BLOCKS.filter((name) => !held.includes(name));
          if (missing.length > 0) {
            ctx.report.violation({
              message: `Test file has no top-level describe '${missing.join("', '")}' — every suite splits into success cases, failure cases and edge cases (ARCH-003 [suite-three-blocks]).`,
              file,
            });
          }
        }
      },
    },
    'test-body-aaa': {
      description:
        'Every it/test body in skill scripts and repository tools carries // ARRANGE, // ACT and // ASSERT, uppercase, exactly once each, in that order, one marker per comment (§3.1).',
      severity: 'error',
      async check(ctx) {
        for (const file of await testFiles(ctx)) {
          const lines = (await ctx.readFile(file)).split('\n');
          for (const body of testBodies(lines)) {
            for (const comment of body.malformed) {
              ctx.report.violation({
                message: `Marker comment '${comment}' must be exactly one uppercase marker — split a combined comment into separate // ARRANGE, // ACT, // ASSERT lines (ARCH-003 [test-body-aaa]).`,
                file,
                line: body.line,
              });
            }
            if (body.malformed.length > 0) continue;
            if (body.markers.join() !== MARKERS.join()) {
              ctx.report.violation({
                message: `Test body carries [${body.markers.join(', ')}] — it needs // ARRANGE, // ACT, // ASSERT exactly once each, in that order (ARCH-003 [test-body-aaa]).`,
                file,
                line: body.line,
              });
            }
          }
        }
      },
    },
    'assert-no-magic': {
      description:
        'The // ASSERT block of every test in skill scripts and repository tools holds no number literal other than 0, 1 and -1 — name the value in // ARRANGE (§3.2).',
      severity: 'error',
      async check(ctx) {
        for (const file of await testFiles(ctx)) {
          const lines = (await ctx.readFile(file)).split('\n');
          for (const block of assertBlocks(lines)) {
            for (const { line, literal } of magicIn(block.text, block.start)) {
              ctx.report.violation({
                message: `Magic number ${literal} in // ASSERT — name it in // ARRANGE so a reviewer can disagree with it (ARCH-003 [assert-no-magic]).`,
                file,
                line,
              });
            }
          }
        }
      },
    },
  },
} satisfies RuleSet;

/// <reference path="../rules.d.ts" />

import { describe, expect, it } from 'vitest';
import ruleSet from './GEN-004-escalated-tech-debt.rules';

interface Reported {
  message: string;
  file?: string;
  line?: number;
}

function globToRegExp(pattern: string): RegExp {
  const segments = pattern.split('/');
  let body = '';
  segments.forEach((segment, index) => {
    const separator = index === 0 ? '' : '/';
    if (segment === '**') {
      body += index === segments.length - 1 ? `${separator}.*` : `${separator}(?:[^/]+/)*`;
      return;
    }
    const literal = segment
      .split('*')
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
      .join('[^/]*');
    body += segments[index - 1] === '**' ? literal : separator + literal;
  });
  return new RegExp(`^${body}$`);
}

function makeCtx(files: Record<string, string>) {
  const violations: Reported[] = [];
  const ctx = {
    projectRoot: '/repo',
    scopedFiles: Object.keys(files),
    changedFiles: [],
    async glob(pattern: string) {
      const re = globToRegExp(pattern);
      return Object.keys(files).filter((f) => re.test(f));
    },
    async grepFiles(pattern: RegExp, fileGlob: string) {
      const re = globToRegExp(fileGlob);
      const matches: GrepMatch[] = [];
      for (const [file, content] of Object.entries(files)) {
        if (!re.test(file)) continue;
        content.split('\n').forEach((text, index) => {
          const found = text.match(pattern);
          if (found) {
            matches.push({ file, line: index + 1, column: (found.index ?? 0) + 1, content: text });
          }
        });
      }
      return matches;
    },
    async readFile(path: string) {
      if (path in files) return files[path];
      throw new Error(`ENOENT: ${path}`);
    },
    report: {
      violation: (detail: Reported) => violations.push(detail),
      warning: () => {},
      info: () => {},
    },
  } as unknown as RuleContext;
  return { ctx, violations };
}

const FILE = 'skills/commit/scripts/lib/parser.ts';
const ISSUE = 'https://github.com/hancrafted/skills/issues/317';

const MARK = `tech-${'debt'}`;

const rule = ruleSet.rules['tech-debt-links-issue'];

async function run(files: Record<string, string>) {
  const { ctx, violations } = makeCtx(files);
  await rule.check(ctx);
  return violations;
}

describe('tech-debt-links-issue', () => {
  it('passes on a source file with no marker', async () => {
    // ARRANGE
    const files = { [FILE]: 'export const answer = 42;\n' };
    // ACT
    const violations = await run(files);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('passes on a marker whose line links an issue', async () => {
    // ARRANGE
    const files = { [FILE]: `// ${MARK}: fenced parser, ${ISSUE}\nexport const a = 1;\n` };
    // ACT
    const violations = await run(files);
    // ASSERT
    expect(violations).toEqual([]);
  });

  const unlinked: [label: string, file: string, source: string][] = [
    ['line comment', FILE, `// ${MARK}: fenced parser\n`],
    ['block comment', FILE, `/* ${MARK}: fenced parser */\n`],
    ['hash comment', 'tools/sync.sh', `# ${MARK}: fenced script\n`],
    ['marker beside code', FILE, `const a = 1; // ${MARK}: fenced\n`],
    ['bare issue number, no link', FILE, `// ${MARK}: see #317\n`],
  ];

  for (const [label, file, source] of unlinked) {
    it(`fails on a ${label} without an issue link`, async () => {
      // ARRANGE
      const files = { [file]: source };
      // ACT
      const violations = await run(files);
      // ASSERT
      expect(violations).toHaveLength(1);
      expect(violations[0].file).toBe(file);
    });
  }

  it('reports the line the marker sits on', async () => {
    // ARRANGE
    const expectedLine = 3;
    const files = { [FILE]: `export const a = 1;\nexport const b = 2;\n// ${MARK}: fenced\n` };
    // ACT
    const violations = await run(files);
    // ASSERT
    expect(violations[0].line).toBe(expectedLine);
  });

  it('passes on prose naming the marker away from the comment opener', async () => {
    // ARRANGE
    const files = { [FILE]: `// Every ${MARK} comment links an issue.\nexport const a = 1;\n` };
    // ACT
    const violations = await run(files);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('leaves a markdown file alone', async () => {
    // ARRANGE
    const files = { 'docs/notes.md': `# ${MARK}: heading, no link\n` };
    // ACT
    const violations = await run(files);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('carries the GEN-004 provenance tag in its messages', async () => {
    // ARRANGE
    const provenance = '(GEN-004 [tech-debt-links-issue])';
    const files = { [FILE]: `// ${MARK}: fenced\n` };
    // ACT
    const violations = await run(files);
    // ASSERT
    expect(violations[0].message).toContain(provenance);
  });

  it('checks workflow comments as source markers', async () => {
    // ARRANGE
    const file = '.github/workflows/verify.yml';
    const files = { [file]: `# ${MARK}: fenced workflow\n` };
    // ACT
    const violations = await run(files);
    // ASSERT
    expect(violations).toHaveLength(1);
    expect(violations[0].file).toBe(file);
  });

  it('leaves the root test harness and skill prose outside the source scope', async () => {
    // ARRANGE
    const files = {
      'tests/commit-msg.test.ts': `// ${MARK}: fixture\n`,
      'skills/commit/SKILL.md': `# ${MARK}: heading\n`,
    };
    // ACT
    const violations = await run(files);
    // ASSERT
    expect(violations).toEqual([]);
  });
});

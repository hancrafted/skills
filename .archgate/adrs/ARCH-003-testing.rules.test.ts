/// <reference path="../rules.d.ts" />

// Sibling test for ARCH-003-testing.rules.ts — pass and fail path for
// `suite-three-blocks`, `test-body-aaa` and `assert-no-magic`, plus their easy-to-get-wrong
// boundaries: nested describes, it.each, combined and lowercase markers, and
// the skill-script and tool scopes.

import { describe, expect, it } from 'vitest';
import ruleSet from './ARCH-003-testing.rules';

interface Reported {
  message: string;
  file?: string;
  line?: number;
}

// Stands in for archgate's RuleContext over an in-memory file set. The rules
// glob skill-script and repository-tool test siblings.
function makeCtx(files: Record<string, string>) {
  const violations: Reported[] = [];
  const ctx = {
    projectRoot: '/repo',
    scopedFiles: Object.keys(files),
    changedFiles: [],
    async glob(pattern: string) {
      const shapes: Record<string, (f: string) => boolean> = {
        'skills/*/scripts/**/*.test.ts': (f) => /^skills\/[^/]+\/scripts\/.*\.test\.ts$/.test(f),
        'tools/**/*.test.ts': (f) => f.startsWith('tools/') && f.endsWith('.test.ts'),
      };
      if (!(pattern in shapes)) throw new Error(`unexpected glob ${pattern}`);
      return Object.keys(files).filter(shapes[pattern]);
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

const FILE = 'tools/thing.test.ts';
const BODY = `    // ARRANGE\n    const a = 1;\n    // ACT\n    const b = a;\n    // ASSERT\n    expect(b).toBe(a);\n`;
const test = (title: string, body = BODY) => `  it('${title}', () => {\n${body}  });\n`;
const block = (name: string, inner = test('works')) => `describe('${name}', () => {\n${inner}});\n`;
const SUITE = [block('success cases'), block('failure cases'), block('edge cases')].join('\n');

describe('suite-three-blocks', () => {
  const rule = ruleSet.rules['suite-three-blocks'];

  it('passes a suite split into success, failure and edge cases, with a nested describe inside one', async () => {
    // ARRANGE
    const nested = `  describe('script arguments', () => {\n  ${test('nests')}  });\n`;
    const source = [block('success cases', nested), block('failure cases'), block('edge cases')].join('\n');
    const { ctx, violations } = makeCtx({ [FILE]: source });
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('fails a fourth top-level name, on its line', async () => {
    // ARRANGE
    const source = `${SUITE}\n${block('script arguments')}`;
    const expectedLine = source.split('\n').indexOf("describe('script arguments', () => {") + 1;
    const { ctx, violations } = makeCtx({ [FILE]: source });
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toMatch(/'script arguments' is not one of/);
    expect(violations[0].line).toBe(expectedLine);
  });

  it('fails a missing block and names it', async () => {
    // ARRANGE
    const source = [block('success cases'), block('edge cases')].join('\n');
    const { ctx, violations } = makeCtx({ [FILE]: source });
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations.map((v) => v.message)).toEqual([expect.stringMatching(/no top-level describe 'failure cases'/)]);
  });

  it('fails a block that appears twice', async () => {
    // ARRANGE
    const source = `${SUITE}\n${block('edge cases')}`;
    const { ctx, violations } = makeCtx({ [FILE]: source });
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations.map((v) => v.message)).toEqual([expect.stringMatching(/'edge cases' appears twice/)]);
  });

  it('passes a slow file holding one block when it and its fast sibling hold all three between them', async () => {
    // ARRANGE
    const fast = [block('success cases'), block('edge cases')].join('\n');
    const slow = block('failure cases');
    const { ctx, violations } = makeCtx({
      'tools/thing.pure.test.ts': fast,
      'tools/thing.pure.slow.test.ts': slow,
    });
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('fails a slow file without a fast sibling, naming the blocks it lacks', async () => {
    // ARRANGE
    const slowFile = 'tools/thing.pure.slow.test.ts';
    const { ctx, violations } = makeCtx({ [slowFile]: block('success cases') });
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations).toEqual([
      expect.objectContaining({
        file: slowFile,
        message: expect.stringMatching(/no top-level describe 'failure cases', 'edge cases'/),
      }),
    ]);
  });

  it('fails a slow file with a fourth top-level name, even beside a full fast sibling', async () => {
    // ARRANGE
    const { ctx, violations } = makeCtx({
      'tools/thing.pure.test.ts': SUITE,
      'tools/thing.pure.slow.test.ts': block('slow graders'),
    });
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations.map((v) => v.message)).toEqual([expect.stringMatching(/'slow graders' is not one of/)]);
  });

  it('fails a file with one subject-named suite', async () => {
    // ARRANGE
    const source = block('ScriptRunner');
    const { ctx, violations } = makeCtx({ [FILE]: source });
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations).toHaveLength(2);
  });

  it('passes a Playwright suite split by test.describe, its hooks not taken for tests', async () => {
    // ARRANGE
    const pw = (name: string) =>
      `test.describe('${name}', () => {\n  test.beforeEach(async () => {});\n${test('works').replace('  it(', '  test(')}});\n`;
    const source = [pw('success cases'), pw('failure cases'), pw('edge cases')].join('\n');
    const { ctx, violations } = makeCtx({ [FILE]: source });
    // ACT
    await rule.check(ctx);
    await ruleSet.rules['test-body-aaa'].check(ctx);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('fails a fourth top-level test.describe name', async () => {
    // ARRANGE
    const source = `${SUITE}\ntest.describe('the output', () => {\n${test('works')}});\n`;
    const { ctx, violations } = makeCtx({ [FILE]: source });
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations.map((v) => v.message)).toEqual([expect.stringMatching(/'the output' is not one of/)]);
  });

  it('judges slow browser graders under tools and skill scripts', async () => {
    // ARRANGE
    const source = block('ScriptRunner');
    const judged = ['skills/x/scripts/y.slow.test.ts', 'tools/a11y.slow.test.ts'];
    const { ctx, violations } = makeCtx(Object.fromEntries(judged.map((f) => [f, source])));
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect([...new Set(violations.map((v) => v.file))]).toEqual(judged);
  });

  it('leaves the shell commit tests, rules tests and non-test files alone', async () => {
    // ARRANGE
    const source = block('ScriptRunner');
    const { ctx, violations } = makeCtx({
      'tests/commit-msg.test.ts': source,
      '.archgate/adrs/X.rules.test.ts': source,
      'tools/thing.ts': source,
      'skills/x/SKILL.md': source,
    });
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('carries the ARCH-003 provenance tag in its messages', async () => {
    // ARRANGE
    const provenance = '(ARCH-003 [suite-three-blocks])';
    const { ctx, violations } = makeCtx({ [FILE]: block('ScriptRunner') });
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations[0].message).toContain(provenance);
  });
});

describe('test-body-aaa', () => {
  const rule = ruleSet.rules['test-body-aaa'];

  it('passes bodies marked once each, in order, including it.each and nested tests', async () => {
    // ARRANGE
    const each = `  it.each(['a', 'b'])('handles %s', (x) => {\n${BODY}  });\n`;
    const nested = `  describe('inner', () => {\n  ${test('nests')}  });\n`;
    const source = block('success cases', test('one') + each + nested);
    const { ctx, violations } = makeCtx({ [FILE]: source });
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations).toEqual([]);
  });

  const failing: [label: string, body: string][] = [
    ['a combined // ARRANGE / ACT', `    // ARRANGE / ACT\n    const b = 1;\n    // ASSERT\n    expect(b).toBe(1);\n`],
    ['a combined // ARRANGE & ACT', `    // ARRANGE & ACT\n    const b = 1;\n    // ASSERT\n    expect(b).toBe(1);\n`],
    [
      'a lowercase marker',
      `    // Arrange\n    const a = 1;\n    // ACT\n    const b = a;\n    // ASSERT\n    expect(b).toBe(a);\n`,
    ],
    ['a missing marker', `    // ARRANGE\n    const a = 1;\n    // ASSERT\n    expect(a).toBe(1);\n`],
    ['markers out of order', `    // ACT\n    const a = 1;\n    // ARRANGE\n    // ASSERT\n    expect(a).toBe(1);\n`],
    ['a repeated marker', `${BODY}    // ASSERT\n    expect(1).toBe(1);\n`],
    ['no markers at all', `    expect(1).toBe(1);\n`],
  ];

  for (const [label, body] of failing) {
    it(`fails ${label}, on the test's line`, async () => {
      // ARRANGE
      const source = block('success cases', test('bad', body));
      const expectedLine = 2;
      const { ctx, violations } = makeCtx({ [FILE]: source });
      // ACT
      await rule.check(ctx);
      // ASSERT
      expect(violations).toHaveLength(1);
      expect(violations[0].line).toBe(expectedLine);
    });
  }

  it('judges each test on its own markers, not its neighbour’s', async () => {
    // ARRANGE
    const source = block('success cases', test('good') + test('bad', `    expect(1).toBe(1);\n`));
    const expectedLine = source.split('\n').indexOf("  it('bad', () => {") + 1;
    const { ctx, violations } = makeCtx({ [FILE]: source });
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations.map((v) => v.line)).toEqual([expectedLine]);
  });

  it('carries the ARCH-003 provenance tag in its messages', async () => {
    // ARRANGE
    const provenance = '(ARCH-003 [test-body-aaa])';
    const { ctx, violations } = makeCtx({ [FILE]: block('success cases', test('bad', `    expect(1).toBe(1);\n`)) });
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations[0].message).toContain(provenance);
  });
});

describe('assert-no-magic', () => {
  const rule = ruleSet.rules['assert-no-magic'];
  const withAssert = (assertion: string) =>
    block(
      'success cases',
      test('t', `    // ARRANGE\n    const a = 1;\n    // ACT\n    const b = a;\n    // ASSERT\n${assertion}\n`),
    );

  it('passes the exempt numbers, named constants, strings, regexes, comments and digits inside identifiers', async () => {
    // ARRANGE
    const assertion = [
      '    expect(b).toBe(a);',
      "    expect([b, 0, -1, 1.0]).toContain('v2');",
      '    expect(list[0]).toMatch(/^a{2,3}\\d+$/); // 42 here is a comment',
      '    expect(x2).toBe(item1);',
    ].join('\n');
    const { ctx, violations } = makeCtx({ [FILE]: withAssert(assertion) });
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('fails a number literal, on its own line, in a multi-line assertion', async () => {
    // ARRANGE
    const source = withAssert('    expect(b).toEqual({\n      count: 42,\n    });');
    const expectedLine = source.split('\n').findIndex((l) => l.includes('count: 42')) + 1;
    const { ctx, violations } = makeCtx({ [FILE]: source });
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations.map((v) => v.line)).toEqual([expectedLine]);
    expect(violations[0].message).toMatch(/Magic number 42/);
  });

  it.each([['toHaveLength(3)'], ['toBeCloseTo(0.5)'], ['toBe(10_000)'], ['toBe(-7)']])('fails %s', async (matcher) => {
    // ARRANGE
    const { ctx, violations } = makeCtx({ [FILE]: withAssert(`    expect(b).${matcher};`) });
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations).toHaveLength(1);
  });

  it('reads only the ASSERT block, not ARRANGE or ACT', async () => {
    // ARRANGE
    const body = `    // ARRANGE\n    const a = 42;\n    // ACT\n    const b = a + 7;\n    // ASSERT\n    expect(b).toBe(a);\n`;
    const { ctx, violations } = makeCtx({ [FILE]: block('success cases', test('t', body)) });
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('stops at the test end, so a helper between tests is not judged', async () => {
    // ARRANGE
    const helper = `const LIMIT = 99;\n`;
    const source = block('success cases', `${test('t')}${helper}`);
    const { ctx, violations } = makeCtx({ [FILE]: source });
    // ACT
    await rule.check(ctx);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('leaves the shell commit tests outside its scope and carries the provenance tag', async () => {
    // ARRANGE
    const source = withAssert('    expect(b).toBe(42);');
    const provenance = '(ARCH-003 [assert-no-magic])';
    const outside = makeCtx({ 'tests/commit-msg.test.ts': source });
    const inside = makeCtx({ [FILE]: source });
    // ACT
    await rule.check(outside.ctx);
    await rule.check(inside.ctx);
    // ASSERT
    expect(outside.violations).toEqual([]);
    expect(inside.violations[0].message).toContain(provenance);
  });
});

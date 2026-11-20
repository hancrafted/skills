/// <reference path="../rules.d.ts" />

import { describe, expect, it } from 'vitest';
import ruleSet from './GEN-006-comments.rules';

interface Reported {
  message: string;
  file?: string;
  line?: number;
}

interface Scope {
  scoped?: string[];
  changed?: string[];
}

const ADR = '.archgate/adrs/GEN-006-comments.md';
const REGISTRY_TABLE = [
  '| Marker | Read by |',
  '| --- | --- |',
  '| `// ARRANGE`, `// ACT`, `// ASSERT` | the Testing ADR, `test-body-aaa` |',
  '| `// @ts-expect-error`, `{/* @ts-expect-error */}` | tsc |',
  '| `/// <reference … />` | tsc |',
  '| `// <label>: <target>`, `/* <label>: <target> */` | this ADR |',
].join('\n');
const indent = (table: string) => table.replace(/^/gm, '   ');
const adrWith = (table: string) =>
  `# Comments\n\n## Decision\n\n### 4. Markers\n\n1. Registry:\n\n${indent(table)}\n\n## Consequences\n`;

const DOCS: Record<string, string> = {
  [ADR]: adrWith(REGISTRY_TABLE),
  '.archgate/adrs/ARCH-003-testing.md':
    '# Scene\n\n## Decision\n\n### 1. Wrapper\n\n1. One.\n\n### 4. Scene\n\n1. One.\n2. Two.\n3. Three.\n\n## Consequences\n\n### 7. Not a decision\n',
  'docs/decision-records/0017-example.md': '# Source tree\n',
  'docs/decision-records/drive/0004-example.md': '# Source tree\n',
};

const TS = 'tests/probe/probe.test.ts';
const TSX = 'tests/probe/probe.tsx';
const CSS = 'tests/probe/probe.module.css';

function globRegExp(pattern: string): RegExp {
  const body = pattern
    .split('/')
    .map((segment) =>
      segment === '**' ? '(?:[^/]+/)*' : `${segment.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')}/`,
    )
    .join('');
  return new RegExp(`^${body.replace(/\/$/, '')}$`);
}

function makeCtx(planted: Record<string, string>, scope: Scope) {
  const files = { ...DOCS, ...planted };
  const violations: Reported[] = [];
  const ctx = {
    projectRoot: '/repo',
    scopedFiles: scope.scoped ?? Object.keys(planted),
    changedFiles: scope.changed ?? Object.keys(planted),
    async glob(pattern: string) {
      const re = globRegExp(pattern);
      return Object.keys(files).filter((f) => re.test(f));
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

async function check(planted: Record<string, string>, scope: Scope = {}): Promise<Reported[]> {
  const { ctx, violations } = makeCtx(planted, scope);
  await ruleSet.rules['no-comments'].check(ctx);
  return violations;
}

const TECH_DEBT = 'tech-debt';
const LADDER = 'Ladder: GEN-006 §2; names: GEN-007.';
const PROVENANCE = '(GEN-006 [no-comments])';

describe('no-comments', () => {
  describe('success cases', () => {
    const bare: [label: string, file: string, source: string][] = [
      [
        '// ARRANGE',
        TS,
        "it('a', () => {\n  // ARRANGE\n  const a = 1;\n  // ACT\n  const b = a;\n  // ASSERT\n  expect(b).toBe(a);\n});\n",
      ],
      ['// @ts-expect-error', TS, "// @ts-expect-error\nconst n: number = 'a';\n"],
      ['/// <reference …>', TS, '/// <reference path="../rules.d.ts" />\n\nexport const a = 1;\n'],
      [
        '{/* @ts-expect-error */}',
        TSX,
        'export const A = () => (\n  <div>\n    {/* @ts-expect-error */}\n    <B wrong />\n  </div>\n);\n',
      ],
    ];
    for (const [label, file, source] of bare) {
      it(`admits the bare ${label} marker`, async () => {
        // ARRANGE
        const planted = { [file]: source };
        // ACT
        const violations = await check(planted);
        // ASSERT
        expect(violations).toEqual([]);
      });
    }

    const pointers: [label: string, file: string, source: string][] = [
      ['decision: to an ADR §', TS, '// decision: ARCH-003 §4\nexport const a = 1;\n'],
      ['decision: to an ADR §n.m', TS, '// decision: ARCH-003 §4.3\nexport const a = 1;\n'],
      [
        'decision: to a Decision record',
        TS,
        '// decision: docs/decision-records/0017-example.md\nexport const a = 1;\n',
      ],
      [
        'decision: to a skill’s Decision record',
        TS,
        '// decision: docs/decision-records/drive/0004-example.md\nexport const a = 1;\n',
      ],
      [
        'tech-debt: to this repo’s issue',
        TS,
        '// tech-debt: https://github.com/hancrafted/skills/issues/375\nexport const a = 1;\n',
      ],
      ['two stacked pointers', TS, '// decision: ARCH-003 §4\n// decision: ARCH-003 §1\nexport const a = 1;\n'],
      ['a CSS pointer', CSS, '/* decision: ARCH-003 §4.1 */\n.a {\n  color: red;\n}\n'],
    ];
    for (const [label, file, source] of pointers) {
      it(`admits a pointer marker: ${label}`, async () => {
        // ARRANGE
        const planted = { [file]: source };
        // ACT
        const violations = await check(planted);
        // ASSERT
        expect(violations).toEqual([]);
      });
    }

    const notComments: [label: string, file: string, source: string][] = [
      ['a // inside a string', TS, 'export const url = \'https://example.com\';\nexport const b = "/* no */";\n'],
      [
        'a // inside a template and its interpolation',
        TS,
        'export const t = `a // ${"b /* c */"} ${`d // ${1}`} e`;\n',
      ],
      ['a // inside a regex literal', TS, 'export const re = /https?:\\/\\/x/g;\nexport const cls = /[/*]+/;\n'],
      ['a division that is not a regex', TS, 'export const half = (a: number) => a / 2 / 1;\n'],
      ['a shebang and a use-client directive', TS, "#!/usr/bin/env node\n'use client';\nexport const a = 1;\n"],
      ['a // inside JSX text', TSX, "export const A = () => <p>Visit https://example.com, don't /* stop */</p>;\n"],
      ['a // inside a JSX attribute string', TSX, 'export const A = () => <a href="https://example.com">x</a>;\n'],
      ['a generic arrow in a .tsx file', TSX, 'export const id = <T,>(x: T) => x;\nexport const u = "// no";\n'],
      [
        'a // inside a CSS string',
        CSS,
        '.a {\n  background: url(\'https://example.com/a.png\');\n  content: "/* no */";\n}\n',
      ],
    ];
    for (const [label, file, source] of notComments) {
      it(`reads ${label} as code, not a comment`, async () => {
        // ARRANGE
        const planted = { [file]: source };
        // ACT
        const violations = await check(planted);
        // ASSERT
        expect(violations).toEqual([]);
      });
    }

    it('passes when the registry table in the ADR matches the registry the rule enforces', async () => {
      // ARRANGE
      const planted = { [TS]: 'export const a = 1;\n' };
      // ACT
      const violations = await check(planted);
      // ASSERT
      expect(violations).toEqual([]);
    });
  });

  describe('failure cases', () => {
    const positions: [position: string, file: string, source: string, help: string][] = [
      [
        'Exported declaration JSDoc',
        TS,
        'export const a = 1;\n\n/** The answer. */\nexport const b = 2;\n',
        'Move the contract into the type and a test named for it',
      ],
      [
        'Non-exported declaration JSDoc',
        TS,
        'export const a = 1;\n\n/** The answer. */\nconst b = 2;\n',
        'A reason a test already names needs no move: cite that test in the commit body and delete the comment',
      ],
      [
        'In-body comment',
        TS,
        'export function f() {\n  // add one\n  return 1;\n}\n',
        'in a test, fold it into the it or describe name',
      ],
      [
        'In-body comment',
        TS,
        'export const a = 1; // trailing note\n',
        'Extract a named constant or function that says it, or add a pointer marker',
      ],
      [
        'File header comment',
        TS,
        '// This module does things.\n\nexport const a = 1;\n',
        'Each ADR section it cites becomes one `// decision:` pointer above the first import',
      ],
      [
        'File header comment',
        TS,
        "'use client';\n/* Header. */\n\nexport const a = 1;\n",
        'Delete it, or add a pointer marker',
      ],
      [
        'Lint directive',
        TS,
        `// ${'eslint'}-disable-next-line no-console\nconsole.log(1);\n`,
        'Turn the rule off in the lint config behind a files: glob, with its reason',
      ],
      [
        'Lint directive',
        TS,
        `/* ${'oxlint'}-disable */\nexport const a = 1;\n`,
        'Turn the rule off in the lint config behind a files: glob, with its reason',
      ],
      [
        'CSS comment',
        CSS,
        '.a {\n  /* brand yellow */\n  color: #facc15;\n}\n',
        'Delete it, or add a `/* decision: … */` pointer marker above it',
      ],
      [
        'JSX comment',
        TSX,
        'export const A = () => (\n  <div>\n    {/* the list */}\n    <ul />\n  </div>\n);\n',
        'Delete it, or extract a component named for it',
      ],
      [
        'Comment in an empty catch',
        TS,
        'export function f() {\n  try {\n    g();\n  } catch {\n    // ignore\n  }\n}\n',
        'in a fix: commit of its own with a test first',
      ],
      [
        'Comment in an empty catch',
        TS,
        'export function f() {\n  try {\n    g();\n  } catch (error) {\n    /* fine */\n  }\n}\n',
        'Why is there a try? Remove it if nothing throws, or handle the error explicitly',
      ],
    ];
    for (const [position, file, source, help] of positions) {
      it(`reports a ${position} with its help line, the ladder and the naming ADR`, async () => {
        // ARRANGE
        const planted = { [file]: source };
        // ACT
        const violations = await check(planted);
        // ASSERT
        expect(violations).toHaveLength(1);
        expect(violations[0].file).toBe(file);
        expect(violations[0].message).toContain(`${position}:`);
        expect(violations[0].message).toContain(help);
        expect(violations[0].message).toContain(LADDER);
        expect(violations[0].message).toContain(PROVENANCE);
      });
    }

    const trailing: [label: string, file: string, source: string][] = [
      ['// ARRANGE', TS, "it('a', () => {\n  // ARRANGE the inputs\n  const a = 1;\n});\n"],
      ['// ACT', TS, "it('a', () => {\n  // ACT: run it\n  const a = 1;\n});\n"],
      ['// ASSERT', TS, "it('a', () => {\n  // ASSERT it holds\n  expect(1).toBe(1);\n});\n"],
      ['// @ts-expect-error', TS, "// @ts-expect-error wrong on purpose\nconst n: number = 'a';\n"],
      [
        '{/* @ts-expect-error */}',
        TSX,
        'export const A = () => (\n  <div>\n    {/* @ts-expect-error wrong prop */}\n    <B wrong />\n  </div>\n);\n',
      ],
      ['/// <reference …>', TS, '/// <reference path="../rules.d.ts" /> for the types\n\nexport const a = 1;\n'],
      ['decision:', TS, '// decision: ARCH-003 §4 because of paint\nexport const a = 1;\n'],
      [
        'tech-debt:',
        TS,
        '// tech-debt: https://github.com/hancrafted/skills/issues/375 hand-rolled parser\nexport const a = 1;\n',
      ],
    ];
    for (const [label, file, source] of trailing) {
      it(`reports the ${label} marker with text after it`, async () => {
        // ARRANGE
        const planted = { [file]: source };
        const expectedHelp = 'In a test the text goes into the it name';
        // ACT
        const violations = await check(planted);
        // ASSERT
        expect(violations).toHaveLength(1);
        expect(violations[0].message).toContain('Marker with trailing text:');
        expect(violations[0].message).toContain(expectedHelp);
        expect(violations[0].message).toContain(LADDER);
      });
    }

    const brokenPointers: [label: string, source: string, expected: string][] = [
      ['an ADR that does not exist', '// decision: ARCH-099 §1\nexport const a = 1;\n', 'no ADR ARCH-099'],
      [
        'an ADR § that does not exist',
        '// decision: ARCH-003 §9\nexport const a = 1;\n',
        'ARCH-003 has no Decision §9',
      ],
      [
        'an ADR item that does not exist',
        '// decision: ARCH-003 §4.7\nexport const a = 1;\n',
        'ARCH-003 has no Decision §4.7',
      ],
      [
        'a § outside the Decision section',
        '// decision: ARCH-003 §7\nexport const a = 1;\n',
        'ARCH-003 has no Decision §7',
      ],
      [
        'a Decision record that does not exist',
        '// decision: docs/decision-records/0999-gone.md\nexport const a = 1;\n',
        'docs/decision-records/0999-gone.md does not exist',
      ],
    ];
    for (const [label, source, expected] of brokenPointers) {
      it(`reports a pointer to ${label}`, async () => {
        // ARRANGE
        const planted = { [TS]: source };
        // ACT
        const violations = await check(planted);
        // ASSERT
        expect(violations).toHaveLength(1);
        expect(violations[0].message).toContain('Pointer marker:');
        expect(violations[0].message).toContain(expected);
        expect(violations[0].message).toContain(PROVENANCE);
      });
    }

    const wrongKind: [label: string, source: string, expected: string][] = [
      [
        'decision: to a URL',
        '// decision: https://github.com/hancrafted/skills/issues/375\nexport const a = 1;\n',
        'that target belongs to tech-debt:',
      ],
      [
        'tech-debt: to an ADR §',
        '// tech-debt: ARCH-003 §4\nexport const a = 1;\n',
        'that target belongs to decision:',
      ],
      [
        'tech-debt: to a pull request',
        `// ${TECH_DEBT}: https://github.com/hancrafted/skills/pull/375\nexport const a = 1;\n`,
        'tech-debt: takes',
      ],
      ['decision: with no target', '// decision:\nexport const a = 1;\n', 'decision: takes'],
      [
        'decision: to the retired docs/adr folder',
        '// decision: docs/adr/0017-example.md\nexport const a = 1;\n',
        'decision: takes',
      ],
    ];
    for (const [label, source, expected] of wrongKind) {
      it(`reports a pointer label with the wrong kind of target: ${label}`, async () => {
        // ARRANGE
        const planted = { [TS]: source };
        // ACT
        const violations = await check(planted);
        // ASSERT
        expect(violations).toHaveLength(1);
        expect(violations[0].message).toContain('Pointer marker:');
        expect(violations[0].message).toContain(expected);
      });
    }

    it('reports an external URL and sends it to the commit body', async () => {
      // ARRANGE
      const planted = {
        [TS]: '// decision: https://bugs.chromium.org/p/chromium/issues/detail?id=1\nexport const a = 1;\n',
      };
      const expectedHelp = 'an outside fact goes to the commit body';
      // ACT
      const violations = await check(planted);
      // ASSERT
      expect(violations).toHaveLength(1);
      expect(violations[0].message).toContain('external URL');
      expect(violations[0].message).toContain(expectedHelp);
    });

    it('reports a tech-debt pointer to another repo’s issue as an external URL', async () => {
      // ARRANGE
      const planted = {
        [TS]: '// tech-debt: https://github.com/other/repo/issues/1\nexport const a = 1;\n',
      };
      // ACT
      const violations = await check(planted);
      // ASSERT
      expect(violations).toHaveLength(1);
      expect(violations[0].message).toContain('external URL');
    });

    it('reports a pointer that does not sit directly above code', async () => {
      // ARRANGE
      const planted = {
        [TS]: 'export const a = 1;\n// decision: ARCH-003 §4\n\nexport const b = 2;\n',
      };
      const expectedHelp = 'on its own line, directly above the code it explains';
      // ACT
      const violations = await check(planted);
      // ASSERT
      expect(violations).toHaveLength(1);
      expect(violations[0].message).toContain(expectedHelp);
    });

    it('reports a pointer trailing code on its line', async () => {
      // ARRANGE
      const planted = {
        [TS]: 'export const a = 1; // decision: ARCH-003 §4\nexport const b = 2;\n',
      };
      const expectedHelp = 'on its own line, directly above the code it explains';
      // ACT
      const violations = await check(planted);
      // ASSERT
      expect(violations).toHaveLength(1);
      expect(violations[0].message).toContain(expectedHelp);
    });

    it('reports a pointer in block form outside CSS', async () => {
      // ARRANGE
      const planted = {
        [TS]: '/* decision: ARCH-003 §4 */\nexport const a = 1;\n',
      };
      const expectedHelp = 'write it as // decision:';
      // ACT
      const violations = await check(planted);
      // ASSERT
      expect(violations).toHaveLength(1);
      expect(violations[0].message).toContain(expectedHelp);
    });

    it('reports a CSS pointer to a missing target', async () => {
      // ARRANGE
      const planted = {
        [CSS]: '/* decision: ARCH-003 §9 */\n.a {\n  color: red;\n}\n',
      };
      // ACT
      const violations = await check(planted);
      // ASSERT
      expect(violations).toHaveLength(1);
      expect(violations[0].message).toContain('ARCH-003 has no Decision §9');
    });

    it('reports the line each comment opens on', async () => {
      // ARRANGE
      const planted = {
        [TS]: 'export const a = `x\ny`;\n/*\n * b\n */\nexport const b = 2; // c\n',
      };
      const expectedLines = [3, 6];
      // ACT
      const violations = await check(planted);
      // ASSERT
      expect(violations.map((v) => v.line)).toEqual(expectedLines);
    });

    it('reports a registry row the ADR table lacks, and one it adds', async () => {
      // ARRANGE
      const drifted = REGISTRY_TABLE.replace('`// ARRANGE`, ', '') + '\n| `// #__PURE__` | the bundler |';
      const planted = {
        [TS]: 'export const a = 1;\n',
        [ADR]: adrWith(drifted),
      };
      const expectedMissing = 'missing from the ADR table: `// ARRANGE`';
      const expectedExtra = 'missing from the rule: `// #__PURE__`';
      // ACT
      const violations = await check(planted);
      // ASSERT
      expect(violations).toHaveLength(1);
      expect(violations[0].file).toBe(ADR);
      expect(violations[0].message).toContain(expectedMissing);
      expect(violations[0].message).toContain(expectedExtra);
    });
  });

  describe('edge cases', () => {
    const hiddenBehindLexerGuess: [label: string, file: string, source: string][] = [
      ['a slash after a postfix increment', TS, 'let i = 1;\nexport const h = i++ / 2; // x\n'],
      ['a slash after a postfix decrement', TS, 'let i = 1;\nexport const h = i-- / 2; // x\n'],
      ['a generic arrow type alias in a .tsx file', TSX, 'export type F = <T>(x: T) => T; // x\n'],
      [
        'a generic arrow type in a parameter in a .tsx file',
        TSX,
        'export const f = (cb: <K>(k: K) => void) => cb; // x\n',
      ],
      ['a protocol-relative url in CSS', CSS, '.a {\n  background: url(//x.png) /* x */;\n}\n'],
    ];
    for (const [label, file, source] of hiddenBehindLexerGuess) {
      it(`still reports the comment after ${label}`, async () => {
        // ARRANGE
        const planted = { [file]: source };
        // ACT
        const violations = await check(planted);
        // ASSERT
        expect(violations).toHaveLength(1);
      });
    }

    const outOfScope: [label: string, file: string, scope: Scope][] = [
      ['a file outside the files: globs', 'skills/x/other.ts', { scoped: [] }],
      ['a file the commit does not stage', TS, { changed: [] }],
      ['a fixture', 'tests/fixtures/sample.ts', {}],
      ['a generated file', 'tools/example.generated.ts', {}],
      ['a root config', 'vitest.config.ts', {}],
      ['a file in no governed language', 'docs/agents/x.md', {}],
    ];
    for (const [label, file, scope] of outOfScope) {
      it(`skips ${label}`, async () => {
        // ARRANGE
        const planted = { [file]: '// prose\nexport const a = 1;\n' };
        // ACT
        const violations = await check(planted, scope);
        // ASSERT
        expect(violations).toEqual([]);
      });
    }

    it('checks a staged file but not the unstaged one beside it', async () => {
      // ARRANGE
      const staged = 'tests/probe/staged.ts';
      const unstaged = 'tests/probe/unstaged.ts';
      const planted = {
        [staged]: '// prose\nexport const a = 1;\n',
        [unstaged]: '// working note\nexport const b = 1;\n',
      };
      // ACT
      const violations = await check(planted, { changed: [staged] });
      // ASSERT
      expect(violations.map((v) => v.file)).toEqual([staged]);
    });

    it('reads the closing comment of an unterminated block as running to the end of the file', async () => {
      // ARRANGE
      const planted = { [TS]: 'export const a = 1;\n/* never closed\n' };
      const expectedLine = 2;
      // ACT
      const violations = await check(planted);
      // ASSERT
      expect(violations).toHaveLength(1);
      expect(violations[0].line).toBe(expectedLine);
    });

    it('reads nested JSX with expressions and closes back into code', async () => {
      // ARRANGE
      const planted = {
        [TSX]:
          'export const A = () => (\n  <ul className="a//b">\n    {items.map((i) => <li key={i}>{i} // text</li>)}\n  </ul>\n);\nexport const b = 1; // note\n',
      };
      const expectedLine = 6;
      // ACT
      const violations = await check(planted);
      // ASSERT
      expect(violations.map((v) => v.line)).toEqual([expectedLine]);
    });
  });
});

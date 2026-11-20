/// <reference path="../rules.d.ts" />

import { describe, expect, it } from 'vitest';
import ruleSet from './SKL-003-skill-context.rules';

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

const rules = ruleSet.rules;
const CANON = 'docs/skills/context-protocol.md';
const BLOCK =
  'Context protocol (SKL-003), identical in every stateful skill:\n\n1. Read the README first.\n2. Run setup when it is missing.\n';
const FILE = 'skills/drive/SKILL.md';

async function run(rule: keyof typeof rules, files: Record<string, string>) {
  const { ctx, violations } = makeCtx(files);
  await rules[rule].check(ctx);
  return violations;
}

const skillMd = (opts: { state?: string; context?: string }) =>
  `---\nname: drive\nmetadata:\n  version: '1.0.0'${opts.state ? `\n  state: ${opts.state}` : ''}\n---\n\n# Drive\n\n## When to Use\n\nx\n\n${opts.context ?? ''}## Human gates\n\n- a: b.\n`;
const context = (block: string, homes = 'Homes: `docs/drive/`.') => `## Context\n\n${homes}\n\n${block}\n`;

describe('skill-context-section', () => {
  const RULE = 'skill-context-section';

  it('passes a stateful skill whose Context names a home', async () => {
    const files = { [FILE]: skillMd({ state: 'stateful', context: context(BLOCK) + '\n' }) };
    expect(await run(RULE, files)).toEqual([]);
  });

  it('passes a quoted stateful value', async () => {
    const files = { [FILE]: skillMd({ state: "'stateful'", context: context(BLOCK) + '\n' }) };
    expect(await run(RULE, files)).toEqual([]);
  });

  it('ignores a stateless skill with no Context section', async () => {
    expect(await run(RULE, { [FILE]: skillMd({}) })).toEqual([]);
  });

  it('fails a stateful skill with no Context section', async () => {
    const violations = await run(RULE, { [FILE]: skillMd({ state: 'stateful' }) });
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain('(SKL-003 [skill-context-section])');
    expect(violations[0].file).toBe(FILE);
  });

  it('fails a Context section that names no home', async () => {
    const files = { [FILE]: skillMd({ state: 'stateful', context: context(BLOCK, 'Nothing.') + '\n' }) };
    const violations = await run(RULE, files);
    expect(violations).toHaveLength(1);
    expect(violations[0].line).toBe(14);
  });

  it('ignores a Context heading inside a code fence', async () => {
    const fenced = '```md\n## Context\n\n`docs/drive/`\n```\n\n';
    const violations = await run(RULE, { [FILE]: skillMd({ state: 'stateful', context: fenced }) });
    expect(violations).toHaveLength(1);
  });

  it('ignores a skill that declares state: stateless', async () => {
    expect(await run(RULE, { [FILE]: skillMd({ state: 'stateless' }) })).toEqual([]);
  });
});

describe('skill-context-protocol', () => {
  const RULE = 'skill-context-protocol';
  const withBlock = (block: string) => ({
    [CANON]: BLOCK,
    [FILE]: skillMd({ state: 'stateful', context: context(block) + '\n' }),
  });

  it('passes a stateful skill carrying the block byte for byte', async () => {
    expect(await run(RULE, withBlock(BLOCK.trimEnd()))).toEqual([]);
  });

  it('ignores a stateless skill', async () => {
    expect(await run(RULE, { [CANON]: BLOCK, [FILE]: skillMd({}) })).toEqual([]);
  });

  it('fails a block that differs by one word', async () => {
    const violations = await run(RULE, withBlock(BLOCK.trimEnd().replace('missing', 'absent')));
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain('(SKL-003 [skill-context-protocol])');
    expect(violations[0].file).toBe(FILE);
  });

  it('fails a Context section with no block', async () => {
    const violations = await run(RULE, withBlock('Just prose.'));
    expect(violations).toHaveLength(1);
  });

  it('leaves a missing Context section to skill-context-section', async () => {
    const files = { [CANON]: BLOCK, [FILE]: skillMd({ state: 'stateful' }) };
    expect(await run(RULE, files)).toEqual([]);
  });

  it('fails when the canonical file is missing', async () => {
    const files = { [FILE]: skillMd({ state: 'stateful', context: context(BLOCK) + '\n' }) };
    const violations = await run(RULE, files);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain(CANON);
  });

  it('does not check a stateless skill when the canonical file is missing', async () => {
    expect(await run(RULE, { [FILE]: skillMd({}) })).toEqual([]);
  });
});

/// <reference path="../rules.d.ts" />

import { describe, expect, it } from 'vitest';
import ruleSet from './SKL-002-skill-design.rules';

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
const RULE = 'skill-human-gates-section';
const FILE = 'skills/cleanup/SKILL.md';

async function run(files: Record<string, string>) {
  const { ctx, violations } = makeCtx(files);
  await rules[RULE].check(ctx);
  return violations;
}

const skillMd = (gates: string, tail = '') =>
  `---\nname: cleanup\n---\n\n# Cleanup\n\n## Overview\n\nx\n\n${gates}${tail}`;

describe('success cases', () => {
  it('passes a list of trigger: reason items', async () => {
    // ARRANGE
    const gates =
      '## Human gates\n\n- Before deleting an unpushed branch: data loss.\n- Before filing an upstream ticket: outward-facing.\n\n';
    // ACT
    const violations = await run({ [FILE]: skillMd(gates, '## Gather\n\ntext\n') });
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('passes a skill with no Human gates section', async () => {
    // ARRANGE
    const files = { [FILE]: skillMd('## Gather\n\ntext\n') };
    // ACT
    const violations = await run(files);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('passes a numbered list and a trigger that holds a colon-free code span', async () => {
    // ARRANGE
    const gates = '## Human gates\n\n1. Before `git push --force`: history loss.\n\n';
    // ACT
    const violations = await run({ [FILE]: skillMd(gates) });
    // ASSERT
    expect(violations).toEqual([]);
  });
});

describe('failure cases', () => {
  it('fails an empty section', async () => {
    // ARRANGE
    const files = { [FILE]: skillMd('## Human gates\n\n## Gather\n\ntext\n') };
    // ACT
    const violations = await run(files);
    // ASSERT
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain('(SKL-002 [skill-human-gates-section])');
    expect(violations[0].file).toBe(FILE);
  });

  it('fails an item with no reason', async () => {
    // ARRANGE
    const files = { [FILE]: skillMd('## Human gates\n\n- Before deleting a branch:\n\n') };
    // ACT
    const violations = await run(files);
    // ASSERT
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain('<trigger>: <reason>');
  });

  it('fails an item with no colon', async () => {
    // ARRANGE
    const files = { [FILE]: skillMd('## Human gates\n\n- Before deleting a branch, data loss.\n\n') };
    // ACT
    const violations = await run(files);
    // ASSERT
    expect(violations).toHaveLength(1);
  });

  it('fails an item with no trigger', async () => {
    // ARRANGE
    const files = { [FILE]: skillMd('## Human gates\n\n- : data loss.\n\n') };
    // ACT
    const violations = await run(files);
    // ASSERT
    expect(violations).toHaveLength(1);
  });

  it('fails a line that is not a list item', async () => {
    // ARRANGE
    const gates = '## Human gates\n\nThe agent stops often.\n\n- Before deleting a branch: data loss.\n\n';
    // ACT
    const violations = await run({ [FILE]: skillMd(gates) });
    // ASSERT
    expect(violations).toHaveLength(1);
    expect(violations[0].line).toBe(13);
  });
});

describe('edge cases', () => {
  it('reports each bad item with its own line', async () => {
    // ARRANGE
    const gates = '## Human gates\n\n- good one: reason.\n- bad one\n- another bad one\n\n';
    // ACT
    const violations = await run({ [FILE]: skillMd(gates) });
    // ASSERT
    expect(violations.map((violation) => violation.line)).toEqual([14, 15]);
  });

  it('ignores a Human gates heading inside a code fence', async () => {
    // ARRANGE
    const tail = '```md\n## Human gates\n```\n';
    // ACT
    const violations = await run({ [FILE]: skillMd('## Gather\n\ntext\n\n', tail) });
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('ends the section at the next heading of any level', async () => {
    // ARRANGE
    const gates = '## Human gates\n\n- a: b.\n\n### 1. Step\n\nprose is fine here\n';
    // ACT
    const violations = await run({ [FILE]: skillMd(gates) });
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('accepts a section at the end of the file', async () => {
    // ARRANGE
    const gates = '## Human gates\n\n- a: b.';
    // ACT
    const violations = await run({ [FILE]: skillMd(gates) });
    // ASSERT
    expect(violations).toEqual([]);
  });
});

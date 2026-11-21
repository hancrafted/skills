/// <reference path="../rules.d.ts" />

import { describe, expect, it } from 'vitest';
import ruleSet from './SKL-001-skill-package.rules';

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

async function run(key: keyof typeof rules, files: Record<string, string>) {
  const { ctx, violations } = makeCtx(files);
  await rules[key].check(ctx);
  return violations;
}

const skillMd = (name: string, extra = '') => `---\nname: ${name}\n---\n\n# Title\n${extra}`;
const lines = (n: number) => Array.from({ length: n }, (_, i) => `line ${i}`).join('\n') + '\n';

describe('skill-name-matches-folder', () => {
  it('passes when name equals the folder', async () => {
    // ARRANGE
    const files = { 'skills/cleanup/SKILL.md': skillMd('cleanup') };
    // ACT
    const violations = await run('skill-name-matches-folder', files);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('passes on a quoted name', async () => {
    // ARRANGE
    const files = { 'skills/cleanup/SKILL.md': '---\nname: "cleanup"\n---\n# T\n' };
    // ACT
    const violations = await run('skill-name-matches-folder', files);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('fails when name differs from the folder', async () => {
    // ARRANGE
    const files = { 'skills/cleanup/SKILL.md': skillMd('clean-up') };
    // ACT
    const violations = await run('skill-name-matches-folder', files);
    // ASSERT
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain('(SKL-001 [skill-name-matches-folder])');
    expect(violations[0].file).toBe('skills/cleanup/SKILL.md');
  });

  it('fails when name is missing', async () => {
    // ARRANGE
    const files = { 'skills/cleanup/SKILL.md': '---\ndescription: x\n---\n# T\n' };
    // ACT
    const violations = await run('skill-name-matches-folder', files);
    // ASSERT
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain('missing');
  });
});

describe('skill-size-budget', () => {
  it('passes at exactly 500 lines', async () => {
    // ARRANGE
    const files = { 'skills/a/SKILL.md': lines(500) };
    // ACT
    const violations = await run('skill-size-budget', files);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('fails at 501 lines', async () => {
    // ARRANGE
    const files = { 'skills/a/SKILL.md': lines(501) };
    // ACT
    const violations = await run('skill-size-budget', files);
    // ASSERT
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain('501 lines');
    expect(violations[0].message).toContain('(SKL-001 [skill-size-budget])');
  });
});

describe('skill-size-budget tokens', () => {
  it('passes at exactly 5,000 estimated tokens', async () => {
    // ARRANGE
    const files = { 'skills/a/SKILL.md': 'x'.repeat(20_000) };
    // ACT
    const violations = await run('skill-size-budget', files);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('fails at 5,001 estimated tokens, rounding up', async () => {
    // ARRANGE
    const files = { 'skills/a/SKILL.md': 'x'.repeat(20_001) };
    // ACT
    const violations = await run('skill-size-budget', files);
    // ASSERT
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain('5001 tokens');
    expect(violations[0].message).toContain('(SKL-001 [skill-size-budget])');
  });

  it('reports lines and tokens separately when both are over', async () => {
    // ARRANGE
    const files = { 'skills/a/SKILL.md': `${'y'.repeat(30)}\n`.repeat(701) };
    // ACT
    const violations = await run('skill-size-budget', files);
    // ASSERT
    expect(violations).toHaveLength(2);
  });
});

describe('skill-links-one-level', () => {
  const skill = '# T\n\nSee [setup](references/setup.md) and [more](references/more.md).\n';

  it('passes when references link nowhere else in the skill', async () => {
    // ARRANGE
    const files = {
      'skills/a/SKILL.md': skill,
      'skills/a/references/setup.md': 'Plain text, [web](https://example.com), [anchor](#top).\n',
      'skills/a/references/more.md': 'Names `references/setup.md` in code only.\n',
    };
    // ACT
    const violations = await run('skill-links-one-level', files);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('ignores links inside code fences', async () => {
    // ARRANGE
    const files = {
      'skills/a/SKILL.md': skill,
      'skills/a/references/setup.md': '```md\n[x](more.md)\n```\n',
    };
    // ACT
    const violations = await run('skill-links-one-level', files);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('passes a sideways link between two references SKILL.md links', async () => {
    // ARRANGE
    const files = {
      'skills/a/SKILL.md': skill,
      'skills/a/references/setup.md': 'first\nSee [more](more.md).\n',
      'skills/a/references/more.md': 'text\n',
    };
    // ACT
    const violations = await run('skill-links-one-level', files);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('passes a link from a reference to a file SKILL.md also links', async () => {
    // ARRANGE
    const files = {
      'skills/a/SKILL.md': `${skill}Words in [glossary](GLOSSARY.md).\n`,
      'skills/a/references/setup.md': '[g](../GLOSSARY.md)\n',
      'skills/a/references/more.md': 'text\n',
    };
    // ACT
    const violations = await run('skill-links-one-level', files);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('fails when a reference links a file SKILL.md does not link', async () => {
    // ARRANGE
    const files = {
      'skills/a/SKILL.md': skill,
      'skills/a/references/setup.md': 'first\nSee [deep](deep.md).\n',
      'skills/a/references/more.md': 'text\n',
      'skills/a/references/deep.md': 'text\n',
    };
    // ACT
    const violations = await run('skill-links-one-level', files);
    // ASSERT
    const deep = violations.filter((v) => v.file === 'skills/a/references/setup.md');
    expect(deep).toHaveLength(1);
    expect(deep[0]).toMatchObject({ line: 2 });
    expect(deep[0].message).toContain('(SKL-001 [skill-links-one-level])');
  });

  it('fails a reference that SKILL.md does not link', async () => {
    // ARRANGE
    const files = {
      'skills/a/SKILL.md': skill,
      'skills/a/references/setup.md': 'text\n',
      'skills/a/references/more.md': 'text\n',
      'skills/a/references/orphan.md': 'text\n',
    };
    // ACT
    const violations = await run('skill-links-one-level', files);
    // ASSERT
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ file: 'skills/a/references/orphan.md' });
    expect(violations[0].message).toContain('(SKL-001 [skill-links-one-level])');
  });

  it('fails when a reference links up to another skill file', async () => {
    // ARRANGE
    const files = {
      'skills/a/SKILL.md': skill,
      'skills/a/references/setup.md': '[g](../GLOSSARY.md)\n',
    };
    // ACT
    const violations = await run('skill-links-one-level', files);
    // ASSERT
    expect(violations).toHaveLength(1);
  });
});

describe('skill-reference-toc', () => {
  const toc = '# Ref\n\n- [One](#one)\n- [Two](#two)\n\n## One\n';

  it('passes on a short reference without a contents list', async () => {
    // ARRANGE
    const files = { 'skills/a/references/r.md': `# Ref\n\n## One\n${lines(90)}` };
    // ACT
    const violations = await run('skill-reference-toc', files);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('passes on a long reference that opens with a contents list', async () => {
    // ARRANGE
    const files = { 'skills/a/references/r.md': toc + lines(120) };
    // ACT
    const violations = await run('skill-reference-toc', files);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('fails on a long reference with no contents list', async () => {
    // ARRANGE
    const files = { 'skills/a/references/r.md': `# Ref\n\n## One\n${lines(120)}` };
    // ACT
    const violations = await run('skill-reference-toc', files);
    // ASSERT
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain('(SKL-001 [skill-reference-toc])');
  });

  it('fails when the contents list sits after the first H2', async () => {
    // ARRANGE
    const files = { 'skills/a/references/r.md': `# Ref\n\n## One\n- [One](#one)\n${lines(120)}` };
    // ACT
    const violations = await run('skill-reference-toc', files);
    // ASSERT
    expect(violations).toHaveLength(1);
  });
});

describe('skill-allowed-layout', () => {
  it('passes on known files and folders', async () => {
    // ARRANGE
    const files = {
      'skills/a/SKILL.md': 'x',
      'skills/a/GLOSSARY.md': 'x',
      'skills/a/package.json': '{}',
      'skills/a/markdown-harness.config.yaml': 'x',
      'skills/a/scripts/run.ts': 'x',
      'skills/a/references/r.md': 'x',
      'skills/a/assets/c.json': 'x',
    };
    // ACT
    const violations = await run('skill-allowed-layout', files);
    // ASSERT
    expect(violations).toEqual([]);
  });

  it('fails on a catalog folder, which moved to assets', async () => {
    // ARRANGE
    const files = { 'skills/a/catalog/c.json': 'x' };
    // ACT
    const violations = await run('skill-allowed-layout', files);
    // ASSERT
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain('skills/a/catalog/');
  });

  it('fails on an unknown top-level file', async () => {
    // ARRANGE
    const files = { 'skills/a/SKILL.md': 'x', 'skills/a/LEARNINGS.md': 'x' };
    // ACT
    const violations = await run('skill-allowed-layout', files);
    // ASSERT
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain('skills/a/LEARNINGS.md');
    expect(violations[0].message).toContain('(SKL-001 [skill-allowed-layout])');
  });

  it('fails once on an unknown folder however many files it holds', async () => {
    // ARRANGE
    const files = { 'skills/a/docs/one.md': 'x', 'skills/a/docs/two.md': 'x' };
    // ACT
    const violations = await run('skill-allowed-layout', files);
    // ASSERT
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain('skills/a/docs/');
  });

  it('fails on a known file name used as a folder', async () => {
    // ARRANGE
    const files = { 'skills/a/SKILL.md/x.md': 'x' };
    // ACT
    const violations = await run('skill-allowed-layout', files);
    // ASSERT
    expect(violations).toHaveLength(1);
  });
});

/// <reference path="../rules.d.ts" />

// decision: SKL-001 §3
const SKILL_FILE_GLOB = 'skills/*/SKILL.md';
const SKILL_FILES_GLOB = 'skills/*/**';
const REFERENCE_GLOB = 'skills/*/references/**/*.md';

const MAX_BODY_LINES = 500;
const MAX_BODY_TOKENS = 5000;
const CHARS_PER_TOKEN = 4;
const TOC_THRESHOLD_LINES = 100;

const ALLOWED_FOLDERS = new Set(['scripts', 'references', 'assets', 'agents', 'evals']);
const ALLOWED_FILES = new Set([
  'SKILL.md',
  'GLOSSARY.md',
  'CHANGELOG.md',
  'package.json',
  'markdown-harness.config.yaml',
]);

const FENCE_RE = /^[ \t]*(```|~~~)/;
const LINK_RE = /\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const H2_RE = /^##[ \t]+\S/;
const TOC_ENTRY_RE = /^[ \t]*(?:[-*+]|\d+\.)[ \t]+.*\]\(#[^)\s]+\)/;

function skillOf(path: string): string {
  return path.split('/')[1];
}

function frontmatterName(source: string): string | undefined {
  const lines = source.split('\n');
  if (lines[0]?.trim() !== '---') return undefined;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') return undefined;
    const found = lines[i].match(/^name:[ \t]*(.*?)[ \t]*$/);
    if (found) return found[1].replace(/^(['"])(.*)\1$/, '$2');
  }
  return undefined;
}

function lineCount(source: string): number {
  const lines = source.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines.length;
}

function estimateTokens(source: string): number {
  return Math.ceil(source.length / CHARS_PER_TOKEN);
}

function localLinks(source: string): { target: string; line: number }[] {
  const links: { target: string; line: number }[] = [];
  let fenced = false;
  source.split('\n').forEach((text, index) => {
    if (FENCE_RE.test(text)) {
      fenced = !fenced;
      return;
    }
    if (fenced) return;
    const prose = text.replace(/`[^`]*`/g, '');
    for (const match of prose.matchAll(LINK_RE)) {
      const raw = match[1];
      if (raw.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith('//')) continue;
      const target = raw.split('#')[0];
      if (target) links.push({ target, line: index + 1 });
    }
  });
  return links;
}

function resolve(fromFile: string, target: string): string {
  const parts = fromFile.split('/').slice(0, -1);
  for (const segment of target.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') parts.pop();
    else parts.push(segment);
  }
  return parts.join('/');
}

export default {
  rules: {
    'skill-name-matches-folder': {
      description:
        "A skill's frontmatter name equals its folder name, so the name an agent invokes is the name a person finds on disk.",
      severity: 'error',
      async check(ctx) {
        for (const file of await ctx.glob(SKILL_FILE_GLOB)) {
          const folder = skillOf(file);
          const name = frontmatterName(await ctx.readFile(file));
          if (name === folder) continue;
          ctx.report.violation({
            message: `frontmatter name ${name === undefined ? 'is missing' : `"${name}" differs from`} folder "${folder}" — make \`name: ${folder}\` or rename the folder (SKL-001 [skill-name-matches-folder]).`,
            file,
            line: 1,
          });
        }
      },
    },

    'skill-size-budget': {
      description: `SKILL.md is at most ${MAX_BODY_LINES} lines and about ${MAX_BODY_TOKENS} tokens (characters / ${CHARS_PER_TOKEN}, rounded up), so loading a skill stays cheap and compaction keeps all of it.`,
      severity: 'error',
      async check(ctx) {
        for (const file of await ctx.glob(SKILL_FILE_GLOB)) {
          const source = await ctx.readFile(file);
          const lines = lineCount(source);
          if (lines > MAX_BODY_LINES) {
            ctx.report.violation({
              message: `SKILL.md has ${lines} lines, over the ${MAX_BODY_LINES}-line budget — move branch detail into references/ (SKL-001 [skill-size-budget]).`,
              file,
              line: MAX_BODY_LINES + 1,
            });
          }
          const tokens = estimateTokens(source);
          if (tokens > MAX_BODY_TOKENS) {
            ctx.report.violation({
              message: `SKILL.md is about ${tokens} tokens (characters / ${CHARS_PER_TOKEN}), over the ${MAX_BODY_TOKENS}-token budget — move branch detail into references/ (SKL-001 [skill-size-budget]).`,
              file,
              line: 1,
            });
          }
        }
      },
    },

    'skill-links-one-level': {
      description:
        'Every reference is linked from SKILL.md; a linked markdown file fails only when it links a file of the skill that SKILL.md does not link.',
      severity: 'error',
      async check(ctx) {
        const references = await ctx.glob(REFERENCE_GLOB);
        for (const skillFile of await ctx.glob(SKILL_FILE_GLOB)) {
          const linked = new Set<string>();
          for (const { target } of localLinks(await ctx.readFile(skillFile))) {
            const path = resolve(skillFile, target);
            if (path !== skillFile) linked.add(path);
          }
          for (const orphan of references) {
            if (skillOf(orphan) !== skillOf(skillFile) || linked.has(orphan)) continue;
            ctx.report.violation({
              message: `${orphan} is not linked from SKILL.md — link it from SKILL.md or delete it (SKL-001 [skill-links-one-level]).`,
              file: orphan,
            });
          }
          for (const reference of linked) {
            if (!reference.endsWith('.md')) continue;
            let source: string;
            try {
              source = await ctx.readFile(reference);
            } catch {
              continue;
            }
            for (const { target, line } of localLinks(source)) {
              const path = resolve(reference, target);
              if (path === reference || skillOf(path) !== skillOf(skillFile) || linked.has(path)) continue;
              ctx.report.violation({
                message: `${reference} links ${path}, which SKILL.md does not link — link it from SKILL.md (SKL-001 [skill-links-one-level]).`,
                file: reference,
                line,
              });
            }
          }
        }
      },
    },

    'skill-reference-toc': {
      description: `A reference file over ${TOC_THRESHOLD_LINES} lines opens with a contents list linking its own headings, before its first H2.`,
      severity: 'error',
      async check(ctx) {
        for (const file of await ctx.glob(REFERENCE_GLOB)) {
          const source = await ctx.readFile(file);
          const lines = lineCount(source);
          if (lines <= TOC_THRESHOLD_LINES) continue;
          const head: string[] = [];
          let fenced = false;
          for (const text of source.split('\n')) {
            if (FENCE_RE.test(text)) fenced = !fenced;
            if (!fenced && H2_RE.test(text)) break;
            head.push(text);
          }
          if (head.some((text) => TOC_ENTRY_RE.test(text))) continue;
          ctx.report.violation({
            message: `reference has ${lines} lines but no contents list before its first H2 — add a list linking its headings (SKL-001 [skill-reference-toc]).`,
            file,
            line: 1,
          });
        }
      },
    },

    'skill-allowed-layout': {
      description: "A skill folder's top level holds only SKILL.md, the known folders and the known files.",
      severity: 'error',
      async check(ctx) {
        const seen = new Set<string>();
        for (const file of await ctx.glob(SKILL_FILES_GLOB)) {
          const [, skill, entry, ...rest] = file.split('/');
          if (!skill || !entry) continue;
          const isFolder = rest.length > 0;
          const key = `${skill}/${entry}`;
          if (seen.has(key)) continue;
          seen.add(key);
          if (isFolder ? ALLOWED_FOLDERS.has(entry) : ALLOWED_FILES.has(entry)) continue;
          ctx.report.violation({
            message: `skills/${key}${isFolder ? '/' : ''} is not in the allowed layout — use SKILL.md, scripts/, references/, assets/, agents/, evals/, GLOSSARY.md, CHANGELOG.md, package.json or markdown-harness.config.yaml (SKL-001 [skill-allowed-layout]).`,
            file,
          });
        }
      },
    },
  },
} satisfies RuleSet;

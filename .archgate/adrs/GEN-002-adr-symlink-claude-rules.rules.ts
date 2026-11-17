/// <reference path="../rules.d.ts" />

const ADR_MD_GLOB = '.archgate/adrs/*.md';
const CLAUDE_RULES_GLOB = '.claude/rules/*.md';
const ADR_BASENAME_RE = /^([A-Z]+-\d{3})-.+\.md$/;
const CLAUDE_ADR_LINK_RE = /^[a-z]+-\d{3}-.+\.md$/;

function basename(p: string): string {
  return p.split('/').pop() ?? p;
}

function adrFiles(files: string[]): string[] {
  return files.filter((f) => ADR_BASENAME_RE.test(basename(f)));
}

function extractFrontmatter(content: string): string | null {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : null;
}

function getFrontmatterValue(fm: string, key: string): string | null {
  const re = new RegExp(`^${key}[ \\t]*:[ \\t]*(.*)$`, 'm');
  const m = fm.match(re);
  if (!m) return null;
  return m[1]
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();
}

function hasNonEmptyPaths(fm: string): boolean {
  const val = getFrontmatterValue(fm, 'paths');
  return val !== null && val !== '' && !/^\[\s*\]$/.test(val);
}

function symlinkPathFor(file: string): string {
  return `.claude/rules/${basename(file).toLowerCase()}`;
}

export default {
  rules: {
    'adr-claude-rules-symlink': {
      description:
        'Every ADR with a non-empty paths: has a .claude/rules/<basename-lowercased>.md runtime entry; an ADR with empty/absent paths: has none; no orphaned ADR-named entry lingers. Presence only — the reader resolves symlinks, so a copied body is indistinguishable from a pointer.',
      severity: 'error',
      async check(ctx) {
        const files = adrFiles(await ctx.glob(ADR_MD_GLOB));
        const entries = new Set(await ctx.glob(CLAUDE_RULES_GLOB));
        const expected = new Set<string>();
        for (const file of files) {
          const fm = extractFrontmatter(await ctx.readFile(file)) ?? '';
          const link = symlinkPathFor(file);
          if (hasNonEmptyPaths(fm)) {
            expected.add(link);
            if (!entries.has(link)) {
              ctx.report.violation({
                message: `ADR declares paths: but has no runtime symlink — create '${link}' as a symlink to the ADR (GEN-002 [adr-claude-rules-symlink]).`,
                file,
              });
            }
          } else if (entries.has(link)) {
            ctx.report.violation({
              message: `ADR has empty/absent paths: but a runtime entry exists at '${link}' — remove it, or write paths: as an inline flow list if the ADR was meant to be scoped (GEN-002 [adr-claude-rules-symlink]).`,
              file,
            });
          }
        }
        for (const entry of entries) {
          if (expected.has(entry)) continue;
          if (!CLAUDE_ADR_LINK_RE.test(basename(entry))) continue;
          ctx.report.violation({
            message: `Runtime symlink '${entry}' has no backing ADR with a non-empty paths: — remove the orphan (GEN-002 [adr-claude-rules-symlink]).`,
            file: entry,
          });
        }
      },
    },
    'claude-agents-entry': {
      description:
        'Root CLAUDE.md resolves to the canonical AGENTS.md instructions. RuleContext checks readable shared content; filesystem verification checks the symlink and its exact target.',
      severity: 'error',
      async check(ctx) {
        try {
          const canonical = await ctx.readFile('AGENTS.md');
          const runtime = await ctx.readFile('CLAUDE.md');
          if (runtime === canonical) return;
        } catch {}
        ctx.report.violation({
          message:
            'Root CLAUDE.md must resolve to AGENTS.md — keep CLAUDE.md as a symlink to AGENTS.md (GEN-002 [claude-agents-entry]).',
          file: 'CLAUDE.md',
        });
      },
    },
  },
} satisfies RuleSet;

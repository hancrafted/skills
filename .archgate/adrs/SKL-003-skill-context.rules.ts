/// <reference path="../rules.d.ts" />

// decision: SKL-003 §4
const SKILL_FILE_GLOB = 'skills/*/SKILL.md';
const CANONICAL_BLOCK_FILE = 'docs/skills/context-protocol.md';
const CONTEXT_HEADING = '## Context';

const FENCE_RE = /^[ \t]*(```|~~~)/;
const H1_H2_RE = /^#{1,2}[ \t]+\S/;
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;
const STATEFUL_RE = /^[ \t]+state:[ \t]*(['"]?)stateful\1[ \t]*$/m;
const HOME_RE = /`docs\/[^`\s]+\/`/;

function isStateful(content: string): boolean {
  const front = content.match(FRONTMATTER_RE);
  if (!front) return false;
  const [, metadataAndAfter = ''] = front[1].split(/^metadata:[ \t]*$/m);
  return STATEFUL_RE.test(metadataAndAfter);
}

function findContextSectionOrNull(content: string): { line: number; body: string } | null {
  const lines = content.split('\n');
  let fenced = false;
  let start = -1;
  for (let index = 0; index < lines.length; index++) {
    const text = lines[index];
    if (FENCE_RE.test(text)) {
      fenced = !fenced;
      continue;
    }
    if (fenced || !H1_H2_RE.test(text)) continue;
    if (start >= 0) return { line: start + 1, body: lines.slice(start + 1, index).join('\n') };
    if (text.trim() === CONTEXT_HEADING) start = index;
  }
  return start >= 0 ? { line: start + 1, body: lines.slice(start + 1).join('\n') } : null;
}

async function statefulSkills(ctx: RuleContext): Promise<{ file: string; content: string }[]> {
  const found: { file: string; content: string }[] = [];
  for (const file of await ctx.glob(SKILL_FILE_GLOB)) {
    const content = await ctx.readFile(file);
    if (isStateful(content)) found.push({ file, content });
  }
  return found;
}

export default {
  rules: {
    'skill-context-section': {
      description: 'A stateful skill has a `## Context` section that names each home it reads or writes.',
      severity: 'error',
      async check(ctx) {
        for (const { file, content } of await statefulSkills(ctx)) {
          const section = findContextSectionOrNull(content);
          if (!section) {
            ctx.report.violation({
              message: `Stateful skill has no \`${CONTEXT_HEADING}\` section — add it, naming each home as \`docs/<name>/\` (SKL-003 [skill-context-section]).`,
              file,
            });
          } else if (!HOME_RE.test(section.body)) {
            ctx.report.violation({
              message: `\`${CONTEXT_HEADING}\` names no home — write each as a code span like \`docs/<name>/\` (SKL-003 [skill-context-section]).`,
              file,
              line: section.line,
            });
          }
        }
      },
    },
    'skill-context-protocol': {
      description: `A stateful skill's \`${CONTEXT_HEADING}\` section carries the protocol block of ${CANONICAL_BLOCK_FILE} byte for byte.`,
      severity: 'error',
      async check(ctx) {
        const skills = await statefulSkills(ctx);
        if (skills.length === 0) return;
        let block: string;
        try {
          block = (await ctx.readFile(CANONICAL_BLOCK_FILE)).trim();
        } catch {
          ctx.report.violation({
            message: `The canonical context protocol block ${CANONICAL_BLOCK_FILE} is missing or unreadable (SKL-003 [skill-context-protocol]).`,
            file: CANONICAL_BLOCK_FILE,
          });
          return;
        }
        for (const { file, content } of skills) {
          const section = findContextSectionOrNull(content);
          if (section && !section.body.includes(block)) {
            ctx.report.violation({
              message: `\`${CONTEXT_HEADING}\` does not carry the protocol block of ${CANONICAL_BLOCK_FILE} byte for byte — copy it unchanged (SKL-003 [skill-context-protocol]).`,
              file,
              line: section.line,
            });
          }
        }
      },
    },
  },
} satisfies RuleSet;

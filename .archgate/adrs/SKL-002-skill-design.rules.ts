/// <reference path="../rules.d.ts" />

// decision: SKL-002 §2
const SKILL_FILE_GLOB = 'skills/*/SKILL.md';
const GATES_HEADING = '## Human gates';

const FENCE_RE = /^[ \t]*(```|~~~)/;
const HEADING_RE = /^#{1,6}[ \t]+\S/;
const ITEM_RE = /^(?:[-*+]|\d+\.)[ \t]+(.*)$/;

function isGateItem(text: string): boolean {
  const colon = text.indexOf(': ');
  if (colon < 0) return false;
  return text.slice(0, colon).trim() !== '' && text.slice(colon + 2).trim() !== '';
}

export default {
  rules: {
    'skill-human-gates-section': {
      description:
        'A `## Human gates` section is a non-empty list whose every item is one line reading `<trigger>: <reason>`, both parts filled.',
      severity: 'error',
      async check(ctx) {
        for (const file of await ctx.glob(SKILL_FILE_GLOB)) {
          const lines = (await ctx.readFile(file)).split('\n');
          let fenced = false;
          let inSection = false;
          let sectionLine = 0;
          let items = 0;
          const closeSection = () => {
            if (inSection && items === 0) {
              ctx.report.violation({
                message: `\`${GATES_HEADING}\` holds no list item — list each stop as \`- <trigger>: <reason>\`, or drop the section when the skill never stops (SKL-002 [skill-human-gates-section]).`,
                file,
                line: sectionLine,
              });
            }
            inSection = false;
          };
          lines.forEach((text, index) => {
            if (FENCE_RE.test(text)) {
              fenced = !fenced;
              return;
            }
            if (fenced) return;
            if (HEADING_RE.test(text)) {
              closeSection();
              if (text.trim() === GATES_HEADING) {
                inSection = true;
                sectionLine = index + 1;
                items = 0;
              }
              return;
            }
            if (!inSection || text.trim() === '') return;
            const item = text.match(ITEM_RE);
            if (item && isGateItem(item[1])) {
              items++;
              return;
            }
            ctx.report.violation({
              message: `\`${GATES_HEADING}\` line reads "${text.trim()}" — write one line per item as \`- <trigger>: <reason>\`, both parts filled (SKL-002 [skill-human-gates-section]).`,
              file,
              line: index + 1,
            });
            if (item) items++;
          });
          closeSection();
        }
      },
    },
  },
} satisfies RuleSet;

/// <reference path="../rules.d.ts" />

// decision: GEN-004 §2.4
const SOURCE_DIRS = ['skills/*/scripts', 'tools', '.github'];
const SOURCE_GLOBS = [
  '**/*.ts',
  '**/*.tsx',
  '**/*.js',
  '**/*.jsx',
  '**/*.mjs',
  '**/*.cjs',
  '**/*.css',
  '**/*.sh',
  '**/*.yml',
  '**/*.yaml',
];

const MARKER_RE = /(?:\/\/|\/\*|#)[ \t]*tech-debt\b/;

const ISSUE_LINK_RE = /https?:\/\/\S+\/issues\/\d+/;

export default {
  rules: {
    'tech-debt-links-issue': {
      description:
        'Every tech-debt comment links a GitHub issue on its own line. An accepted shortcut is fenced, marked with such a comment and filed; a marker without its issue is a shortcut nobody will be reminded of.',
      severity: 'error',
      async check(ctx) {
        for (const directory of SOURCE_DIRS) {
          for (const glob of SOURCE_GLOBS) {
            for (const hit of await ctx.grepFiles(MARKER_RE, `${directory}/${glob}`)) {
              if (ISSUE_LINK_RE.test(hit.content)) continue;
              ctx.report.violation({
                message: `tech-debt comment without an issue link — file the issue and put its URL on this line (GEN-004 [tech-debt-links-issue]).`,
                file: hit.file,
                line: hit.line,
              });
            }
          }
        }
      },
    },
  },
} satisfies RuleSet;

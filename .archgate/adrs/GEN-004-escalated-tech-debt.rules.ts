/// <reference path="../rules.d.ts" />

// GEN-004 — Escalated Tech Debt: an accepted shortcut stays fenced, marked and
// filed. One Discipline so far; the escalation itself (name the trade-off,
// state the cost, get it accepted) is human work no check can see, so the rule
// holds the part a file shows: every marker names its issue.
// Self-contained by design: archgate forbids imports between rules files.
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

// A marker is live only as the FIRST token of a comment, so the opener must sit
// immediately before the keyword — prose naming the marker is not one, which
// keeps this ADR's own vocabulary writable (GEN-004 §1.2). Matched textually,
// so the rule reaches every language with these comment openers.
const MARKER_RE = /(?:\/\/|\/\*|#)[ \t]*tech-debt\b/;

// The issue link must share the marker's line: a bare `#317` resolves nowhere.
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

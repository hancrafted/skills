/// <reference path="../rules.d.ts" />

// GEN-003 — Codebase Hygiene: skill scripts and repository tools, in every language.
//
// `no-eslint-disable` — inline lint suppression stays unspent. eslint.config.mjs
// is the single source of truth for what this repo enforces; a directive comment
// forks that truth at one line and does it invisibly, since `npm run verify`
// stays green while the rule stops holding at that site (GEN-003 §1).
// Self-contained by design: archgate forbids imports
// between rules files.
const SOURCE_GLOBS = ['skills/*/scripts/**/*', 'tools/**/*'];

// An eslint directive is only live as the FIRST token of a comment, so the
// opener must sit immediately before the keyword — prose naming a directive is
// not one, which is what keeps this ADR's own vocabulary writable. Matched
// textually, so the ban reaches files eslint is not configured to lint.
// Paired enable directives are part of the same suppression vocabulary.
const ESLINT_DIRECTIVE_RE = /(?:\/\/|\/\*)[ \t]*eslint-(?:disable|enable)\b/;

export default {
  rules: {
    'no-eslint-disable': {
      description:
        'No skill script or repository tool carries an eslint directive comment — eslint-disable, its -line and -next-line variants, or the paired enable — in either the // or the /* */ form. A lint rule wrong for a class of files is turned off in eslint.config.mjs behind a files: glob carrying its reason.',
      severity: 'error',
      async check(ctx) {
        for (const glob of SOURCE_GLOBS) {
          for (const hit of await ctx.grepFiles(ESLINT_DIRECTIVE_RE, glob)) {
            ctx.report.violation({
              message: `Inline eslint suppression — delete the directive and fix the code, or turn the rule off in eslint.config.mjs behind a files: glob carrying its reason (GEN-003 [no-eslint-disable]).`,
              file: hit.file,
              line: hit.line,
            });
          }
        }
      },
    },
  },
} satisfies RuleSet;

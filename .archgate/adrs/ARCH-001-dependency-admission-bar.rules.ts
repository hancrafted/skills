/// <reference path="../rules.d.ts" />

// decision: ARCH-001 §1.1
const PACKAGE_JSON = 'package.json';
const DEP_FIELDS = ['dependencies', 'devDependencies'] as const;

const SEMVER_CORE = String.raw`\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?`;
const EXACT_RE = new RegExp(`^${SEMVER_CORE}$`);
const TILDE_RE = new RegExp(`^~${SEMVER_CORE}$`);

function isAllowedRange(range: string): boolean {
  return EXACT_RE.test(range) || TILDE_RE.test(range);
}

export default {
  rules: {
    'dependency-range-form': {
      description:
        'Every dependencies/devDependencies entry in package.json is declared as either an exact x.y.z pin or a ~x.y.z tilde range — ^, *, latest, other dist-tags, bare comparison ranges, git/GitHub URLs, file: links and link: links are all refused.',
      severity: 'error',
      async check(ctx) {
        let raw: string;
        try {
          raw = await ctx.readFile(PACKAGE_JSON);
        } catch {
          return;
        }
        let pkg: Record<string, unknown>;
        try {
          pkg = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          ctx.report.violation({
            message: `package.json is not valid JSON — cannot verify dependency ranges (ARCH-001 [dependency-range-form]).`,
            file: PACKAGE_JSON,
          });
          return;
        }
        for (const field of DEP_FIELDS) {
          const deps = pkg[field];
          if (deps === undefined) continue;
          if (typeof deps !== 'object' || deps === null || Array.isArray(deps)) {
            ctx.report.violation({
              message: `package.json '${field}' must be an object mapping package name to range (ARCH-001 [dependency-range-form]).`,
              file: PACKAGE_JSON,
            });
            continue;
          }
          for (const [name, value] of Object.entries(deps as Record<string, unknown>)) {
            const range = String(value);
            if (isAllowedRange(range)) continue;
            ctx.report.violation({
              message: `${field}.${name} uses range '${range}' — only an exact 'x.y.z' pin or a '~x.y.z' tilde range is allowed (ARCH-001 [dependency-range-form]).`,
              file: PACKAGE_JSON,
            });
          }
        }
      },
    },
  },
} satisfies RuleSet;

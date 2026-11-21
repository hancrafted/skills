// @ts-check

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-cross-skill-scripts',
      severity: 'error',
      comment: 'A skill ships independently; its scripts import only their own skill.',
      from: { path: '^skills/([^/]+)/scripts/' },
      to: { path: '^skills/[^/]+/scripts/', pathNot: '^skills/$1/scripts/' },
    },
    {
      name: 'module-folder-through-index',
      severity: 'error',
      comment:
        "A folder under drive's scripts/ is a module: code outside it imports only its index.ts. The rule governs drive; #75 widens it.",
      from: { path: '^skills/drive/scripts/(?:[^/]+$|([^/]+)/)' },
      to: {
        path: '^skills/drive/scripts/[^/]+/',
        pathNot: ['^skills/drive/scripts/[^/]+/index\\.ts$', '^skills/drive/scripts/$1/'],
      },
    },
    {
      name: 'pure-no-node-io',
      severity: 'error',
      comment: 'Pure modules accept data and return values; I/O belongs in process adapters.',
      from: { path: '\\.pure\\.ts$' },
      to: {
        path: '^(node:)?(fs|child_process|net|http|https|http2|dns|dgram|tls|worker_threads|cluster|readline|process|os|perf_hooks|crypto)(/|$)',
      },
    },
    {
      name: 'no-unresolved',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  options: {
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^|/)(node_modules|\\.worktrees|\\.references|\\.agents|\\.claude)/' },
  },
};

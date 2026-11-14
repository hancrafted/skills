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
    exclude: { path: '(^|/)(node_modules|\\.worktrees|\\.agents|\\.claude)/' },
  },
};

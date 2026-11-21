export const WORKTREE_KEYS = [
  'dir',
  'baseBranch',
  'remote',
  'invoke',
  'install',
  'preflight',
  'lock',
  'beforeMerge',
  'beforeRemove',
  'afterMerge',
  'afterRemove',
] as const;
export const PARALLEL_KEYS = ['default', 'harnessCap'] as const;
export const GRILL_KEYS = ['format'] as const;
export const NOTIFY_KEYS = ['adapter'] as const;
export const PHASE_KEYS = ['skills', 'model'] as const;

export const PROJECT_SETTINGS: readonly string[] = [
  'decisionDocs',
  ...WORKTREE_KEYS.map((key) => `worktree.${key}`),
  ...PARALLEL_KEYS.map((key) => `parallel.${key}`),
  ...GRILL_KEYS.map((key) => `grill.${key}`),
  'models.<provider>.<tier>',
  'models.<provider>',
];

export const BINDING_SETTINGS: readonly string[] = [
  'agentType',
  ...PHASE_KEYS.map((key) => `phases.<phase>.${key}`),
  ...NOTIFY_KEYS.map((key) => `notify.${key}`),
];

export const SETTING_NAMES: readonly string[] = [...PROJECT_SETTINGS, ...BINDING_SETTINGS];
export const SETTING_GROUPS = ['worktree', 'parallel', 'models', 'grill', 'notify', 'phases'] as const;

const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function matcher(name: string): RegExp {
  const body = name
    .split(/(<[a-z]+>)/)
    .map((part) => (part.startsWith('<') ? '[^.`\\s]+' : escape(part)))
    .join('');
  return new RegExp(`^${body}$`);
}

const MATCHERS = SETTING_NAMES.map(matcher);

export function isKnownSetting(mention: string): boolean {
  if (mention.endsWith('.*')) {
    const prefix = mention.slice(0, -1);
    return SETTING_NAMES.some((name) => name.startsWith(prefix));
  }
  return MATCHERS.some((pattern) => pattern.test(mention));
}

export function settingMentions(markdown: string): string[] {
  const groups = SETTING_GROUPS.join('|');
  return [...markdown.matchAll(new RegExp(`\`((?:${groups})\\.[^\`\\s]*)\``, 'g'))].map((match) => match[1] ?? '');
}

export const unknownSettings = (markdown: string): string[] =>
  settingMentions(markdown).filter((mention) => !isKnownSetting(mention));

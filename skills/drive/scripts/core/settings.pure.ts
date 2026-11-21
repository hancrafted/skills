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
export const ADAPTER_KEY = 'adapter';
export const NOTIFY_KEYS = [ADAPTER_KEY] as const;
export const SKILLS_KEY = 'skills';
export const MODEL_KEY = 'model';
export const PHASE_KEYS = [SKILLS_KEY, MODEL_KEY] as const;
export const AGENT_TYPE_KEY = 'agentType';
export const PHASES_KEY = 'phases';
export const NOTIFY_KEY = 'notify';
export const MODELS_KEY = 'models';
export const PHASES = ['define', 'reason', 'implement', 'verify', 'evolve'] as const;
export const TIERS = ['mid', 'top'] as const;

export const PROJECT_SETTINGS: readonly string[] = [
  'decisionDocs',
  ...WORKTREE_KEYS.map((key) => `worktree.${key}`),
  ...PARALLEL_KEYS.map((key) => `parallel.${key}`),
  ...GRILL_KEYS.map((key) => `grill.${key}`),
  `${MODELS_KEY}.<provider>.<tier>`,
  `${MODELS_KEY}.<provider>`,
];

export const BINDING_SETTINGS: readonly string[] = [
  AGENT_TYPE_KEY,
  ...PHASE_KEYS.map((key) => `${PHASES_KEY}.<phase>.${key}`),
  ...NOTIFY_KEYS.map((key) => `${NOTIFY_KEY}.${key}`),
];

export const SETTING_NAMES: readonly string[] = [...PROJECT_SETTINGS, ...BINDING_SETTINGS];
export const SETTING_GROUPS = ['worktree', 'parallel', MODELS_KEY, 'grill', NOTIFY_KEY, PHASES_KEY] as const;

const PLACEHOLDERS: Readonly<Record<string, string>> = {
  '<phase>': `(?:${[...PHASES, '<phase>'].join('|')})`,
  '<tier>': `(?:${[...TIERS, '<tier>'].join('|')})`,
};

const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function matcher(name: string): RegExp {
  const body = name
    .split(/(<[a-z]+>)/)
    .map((part) => (part.startsWith('<') ? (PLACEHOLDERS[part] ?? '[^.`\\s]+') : escape(part)))
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

import { type Tier } from './binding.pure.ts';
import { MODELS_KEY, TIERS } from './settings.pure.ts';
import { isRecord, isText } from './yaml.pure.ts';

export type ModelsConfig = Record<string, Record<Tier, string>>;

function readProvider(provider: string, entry: unknown): Record<Tier, string> | { error: string } {
  if (!isRecord(entry)) return { error: `${MODELS_KEY}.${provider} must be a mapping of tier to model` };
  const unknown = Object.keys(entry).find((key) => !(TIERS as readonly string[]).includes(key));
  if (unknown !== undefined)
    return {
      error: `unknown tier '${unknown}' in ${MODELS_KEY}.${provider}; expected ${TIERS.join(', ')}`,
    };
  const missing = TIERS.find((tier) => !isText(entry[tier]));
  if (missing !== undefined)
    return {
      error: `${MODELS_KEY}.${provider}.${missing} must be a non-empty string`,
    };
  return Object.fromEntries(TIERS.map((tier) => [tier, entry[tier]])) as Record<Tier, string>;
}

export function readModels(section: unknown, file: string): { models: ModelsConfig } | { error: string } {
  if (section === undefined || section === null) return { models: {} };
  if (!isRecord(section))
    return {
      error: `${MODELS_KEY} in ${file} must be a mapping of provider to tiers`,
    };
  const models: ModelsConfig = {};
  for (const [provider, entry] of Object.entries(section)) {
    const read = readProvider(provider, entry);
    if ('error' in read) return read;
    models[provider] = read;
  }
  return { models };
}

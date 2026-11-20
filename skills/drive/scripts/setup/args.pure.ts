import { isTier, PHASES, type Binding, type Phase, type SeedOptions } from '../core/index.ts';

export type SetupOptions = SeedOptions & { check?: boolean; approveLearnings?: boolean };

const USAGE = { error: 'usage: drive setup [--check] [--approve-learnings] [--agent-type <type>] [--tier mid|top]' };

function readOption(options: SetupOptions, flag: string | undefined, value: string): boolean {
  if (flag === '--agent-type') options.agentType = value;
  else if (flag === '--tier' && isTier(value)) options.tier = value;
  else return false;
  return true;
}

export function parseSetupArgs(args: readonly string[]): SetupOptions | { error: string } {
  const options: SetupOptions = {};
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--check') options.check = true;
    else if (args[i] === '--approve-learnings') options.approveLearnings = true;
    else {
      const value = args[i + 1];
      if (value === undefined || value.startsWith('--') || !readOption(options, args[i], value)) return USAGE;
      i += 1;
    }
  }
  return options;
}

export interface MissingSkill {
  skill: string;
  phases: Phase[];
}

export function missingBindingSkills(binding: Binding, installed: readonly string[]): MissingSkill[] {
  const missing = new Map<string, Phase[]>();
  for (const phase of PHASES)
    for (const skill of binding.phases[phase].skills)
      if (!installed.includes(skill)) missing.set(skill, [...(missing.get(skill) ?? []), phase]);
  return [...missing].map(([skill, phases]) => ({ skill, phases })).sort((a, b) => a.skill.localeCompare(b.skill));
}

import { describe, expect, it } from 'vitest';
import { missingBindingSkills, parseSetupArgs } from './setup-args.pure.ts';
const phase = (skills: string[]) => ({ model: 'mid' as const, skills, inline: false });
const binding = {
  agentType: 'x',
  notify: { adapter: 'none' as const },
  phases: {
    define: phase(['grill-me', 'research']),
    reason: phase(['research', 'to-spec']),
    implement: phase([]),
    verify: phase([]),
    evolve: phase([]),
  },
};

describe('success cases', () => {
  describe('parseSetupArgs', () => {
    it('reads --agent-type and --tier, and rejects a tier that is not mid or top', () => {
      // ARRANGE
      const valid = ['--agent-type', 'team:dev', '--tier', 'top'];
      const invalid = ['--tier', 'opus'];
      const expectedValid = { agentType: 'team:dev', tier: 'top' };
      const expectedInvalid = { error: 'usage: drive setup [--check] [--agent-type <type>] [--tier mid|top]' };
      // ACT
      const parsedValid = parseSetupArgs(valid);
      const parsedInvalid = parseSetupArgs(invalid);
      // ASSERT
      expect(parsedValid).toEqual(expectedValid);
      expect(parsedInvalid).toEqual(expectedInvalid);
    });
  });
  describe('parseSetupArgs --check', () => {
    it('reads --check as a flag that takes no value, beside the seeding options', () => {
      // ARRANGE
      const argvs = [['--check'], ['--check', '--tier', 'top'], ['--tier', 'top', '--check']];
      const expected = [{ check: true }, { check: true, tier: 'top' }, { check: true, tier: 'top' }];
      // ACT
      const parsed = argvs.map(parseSetupArgs);
      // ASSERT
      expect(parsed).toEqual(expected);
    });
  });
});

describe('failure cases', () => {
  describe('missingBindingSkills', () => {
    it('names each bound skill that is not installed once, with the phases that bind it', () => {
      // ARRANGE
      const installed = ['research'];
      // ACT
      const missing = missingBindingSkills(binding, installed);
      // ASSERT
      expect(missing).toEqual([
        { skill: 'grill-me', phases: ['define'] },
        { skill: 'to-spec', phases: ['reason'] },
      ]);
    });
  });
});

describe('edge cases', () => {
  describe('missingBindingSkills', () => {
    it('finds nothing missing when every bound skill is installed', () => {
      // ARRANGE
      const installed = ['grill-me', 'research', 'to-spec'];
      // ACT
      const missing = missingBindingSkills(binding, installed);
      // ASSERT
      expect(missing).toEqual([]);
    });
  });
});

import { describe, expect, it } from 'vitest';
import {
  CATALOG,
  type DetectedSkill,
  INLINE_NOTE,
  mergeDetected,
  PHASE_TIERS,
  PHASES,
  readBinding,
  updateBinding,
} from './binding.pure.ts';
const installed = (name: string, source = 'other/skills'): DetectedSkill => ({
  name,
  origin: 'installed',
  source,
});
const authored = (name: string): DetectedSkill => ({
  name,
  origin: 'authored',
  source: null,
});
const known = (name: string) => installed(name, CATALOG.source);
const binding = (text: string) => {
  const read = readBinding(text);
  if ('error' in read) throw new Error(read.error);
  return read;
};

describe('success cases', () => {
  describe('notify', () => {
    it.each(['push-notification', 'none'])('accepts the %s adapter', (adapter) => {
      // ARRANGE
      const text = updateBinding(null, []).replace('adapter: push-notification', `adapter: ${adapter}`);
      // ACT
      const result = binding(text);
      // ASSERT
      expect(result.notify).toEqual({ adapter });
    });
  });
  describe('updateBinding seeding', () => {
    it('binds a known skill to every phase the catalog gives it, n:m', () => {
      // ARRANGE
      const detected = [known('improve-codebase-architecture'), known('tdd')];
      // ACT
      const result = binding(updateBinding(null, detected));
      // ASSERT
      expect(result.phases.reason.skills).toEqual(['improve-codebase-architecture']);
      expect(result.phases.verify.skills).toEqual(['improve-codebase-architecture']);
      expect(result.phases.evolve.skills).toEqual(['improve-codebase-architecture']);
      expect(result.phases.implement.skills).toEqual(['tdd']);
    });

    it('seeds the agent type, and one tier per phase from the options or the per-phase presets', () => {
      // ARRANGE
      // ACT
      const seeded = binding(updateBinding(null, [], { agentType: 'team:dev', tier: 'top' }));
      const defaults = binding(updateBinding(null, []));
      // ASSERT
      expect(seeded.agentType).toBe('team:dev');
      expect(PHASES.map((phase) => seeded.phases[phase].model)).toEqual(PHASES.map(() => 'top'));
      expect(defaults.agentType).toBe('general-purpose');
      expect(PHASES.map((phase) => defaults.phases[phase].model)).toEqual(PHASES.map((phase) => PHASE_TIERS[phase]));
    });

    it('presets mid for define, implement and evolve and top for reason and verify', () => {
      // ARRANGE
      // ACT
      const result = binding(updateBinding(null, []));
      // ASSERT
      expect(PHASES.map((phase) => result.phases[phase].model)).toEqual(['mid', 'top', 'mid', 'top', 'mid']);
    });
  });
  describe('updateBinding re-running', () => {
    it('keeps a hand edit and a comment, and adds a newly installed skill', () => {
      // ARRANGE
      const first = updateBinding(null, [known('tdd')]);
      const edited = first
        .replace('agentType: general-purpose', 'agentType: team:dev # mine')
        .replace(/(implement:\n\s+model: )\w+/, '$1top');
      // ACT
      const second = updateBinding(edited, [known('tdd'), known('code-review')]);
      // ASSERT
      const result = binding(second);
      expect(second).toContain('# mine');
      expect(result.agentType).toBe('team:dev');
      expect(result.phases.implement.model).toBe('top');
      expect(result.phases.verify.skills).toEqual(['code-review']);
      expect(result.phases.verify.inline).toBe(false);
    });
  });
  describe('mergeDetected', () => {
    it('keeps the first sighting of a name, drops the excluded one and sorts by name', () => {
      // ARRANGE
      const groups = [[authored('b')], [known('b'), known('a'), known('self')], [installed('c')]];
      // ACT
      const merged = mergeDetected(groups, 'self');
      // ASSERT
      expect(merged.map((skill) => `${skill.name}:${skill.origin}`)).toEqual([
        'a:installed',
        'b:authored',
        'c:installed',
      ]);
    });
  });
});

describe('failure cases', () => {
  describe('notify', () => {
    it('fails on an unknown adapter and lists the known ones', () => {
      // ARRANGE
      const text = updateBinding(null, []).replace('adapter: push-notification', 'adapter: carrier-pigeon');
      // ACT
      const result = readBinding(text);
      // ASSERT
      expect(result).toEqual({
        error: "notify.adapter 'carrier-pigeon' is unknown; expected push-notification, none",
      });
    });
  });
  describe('updateBinding re-running', () => {
    it('refuses text that is not a binding', () => {
      // ARRANGE
      // ACT
      // ASSERT
      expect(() => updateBinding('a: [', [])).toThrow('not valid YAML');
      expect(() => updateBinding('- a', [])).toThrow('must be a mapping');
    });
  });
  describe('readBinding', () => {
    it('names the first thing wrong', () => {
      // ARRANGE
      const texts = ['agentType: x\nphases: {}', 'phases: {}', '- a'];
      // ACT
      const errors = texts.map((text) => readBinding(text));
      // ASSERT
      expect(errors).toEqual([
        { error: 'phases.define must be a mapping' },
        { error: 'agentType must be a non-empty string' },
        { error: 'binding must be a mapping' },
      ]);
    });
  });
  describe('readBinding tiers', () => {
    it('rejects a model that is not a tier, naming the phase', () => {
      // ARRANGE
      const text = updateBinding(null, []).replace(/(implement:\n\s+model: )\w+/, '$1sonnet');
      // ACT
      const result = readBinding(text);
      // ASSERT
      expect(result).toEqual({
        error: 'phases.implement.model must be a tier: mid or top',
      });
    });
  });
});

describe('edge cases', () => {
  describe('notify', () => {
    it('defaults to push-notification when absent', () => {
      // ARRANGE
      const full = PHASES.map((phase) => `  ${phase}: { model: mid, skills: [] }`).join('\n');
      // ACT
      const result = binding(`agentType: x\nphases:\n${full}\n`);
      // ASSERT
      expect(result.notify).toEqual({ adapter: 'push-notification' });
    });

    it('seeds notify once and keeps a hand edit', () => {
      // ARRANGE
      const first = updateBinding(null, []);
      const edited = first.replace('adapter: push-notification', 'adapter: none # quiet');
      // ACT
      const second = updateBinding(edited, []);
      // ASSERT
      expect(first).toContain('notify:');
      expect(second).toBe(edited);
      expect(binding(second).notify).toEqual({ adapter: 'none' });
    });
  });
  describe('updateBinding seeding', () => {
    it('marks a phase with no skill as done inline, in data and in a comment', () => {
      // ARRANGE
      const detected = [known('tdd')];
      // ACT
      const text = updateBinding(null, detected);
      const result = binding(text);
      // ASSERT
      expect(result.phases.implement.inline).toBe(false);
      expect(PHASES.filter((phase) => result.phases[phase].inline)).toEqual(['define', 'reason', 'verify', 'evolve']);
      expect(text).toContain(`skills: [] #${INLINE_NOTE}`);
    });

    it('binds nothing for an authored skill, a skill from another source or an unknown name', () => {
      // ARRANGE
      const detected = [authored('tdd'), installed('tdd'), known('no-such-skill')];
      // ACT
      const result = binding(updateBinding(null, detected));
      // ASSERT
      expect(PHASES.every((phase) => result.phases[phase].inline)).toBe(true);
    });

    it('matches a skill found only by folder, which names no source, to the catalog by name', () => {
      // ARRANGE
      const byFolder: DetectedSkill = {
        name: 'tdd',
        origin: 'installed',
        source: null,
      };
      // ACT
      const result = binding(updateBinding(null, [byFolder]));
      // ASSERT
      expect(result.phases.implement.skills).toEqual(['tdd']);
    });
  });
  describe('updateBinding re-running', () => {
    it('does not add back a skill the human removed, and drops the inline note once a phase has a skill', () => {
      // ARRANGE
      const first = updateBinding(null, [known('tdd')]);
      const removed = first.replace(/skills:\n(\s+)- tdd/, 'skills: []');
      const phasesStillInline = 4;
      // ACT
      const same = binding(updateBinding(removed, [known('tdd')]));
      const bound = updateBinding(removed, [known('tdd'), known('pr')]);
      // ASSERT
      expect(same.phases.implement.skills).toEqual([]);
      expect(bound).toContain(`verify:\n    model: ${PHASE_TIERS.verify}\n    skills:\n      - pr`);
      expect(bound.match(/none bound/g)).toHaveLength(phasesStillInline);
      expect(binding(bound).phases.verify.skills).toEqual(['pr']);
    });

    it('is idempotent', () => {
      // ARRANGE
      const first = updateBinding(null, [known('tdd'), known('pr')]);
      // ACT
      const second = updateBinding(first, [known('tdd'), known('pr')]);
      // ASSERT
      expect(second).toBe(first);
    });
  });
});

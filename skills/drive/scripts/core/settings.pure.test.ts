import { describe, expect, it } from 'vitest';
import { readBinding } from './binding.pure.ts';
import { readModels } from './models.pure.ts';
import {
  ADAPTER_KEY,
  AGENT_TYPE_KEY,
  MODEL_KEY,
  NOTIFY_KEY,
  PHASES,
  PHASES_KEY,
  SKILLS_KEY,
  TIERS,
  unknownSettings,
} from './settings.pure.ts';

describe('success cases', () => {
  it('reads a binding written with the key names the settings list exports', () => {
    // ARRANGE
    const phases = Object.fromEntries(PHASES.map((phase) => [phase, { [MODEL_KEY]: TIERS[0], [SKILLS_KEY]: [] }]));
    const text = JSON.stringify({
      [AGENT_TYPE_KEY]: 'general-purpose',
      [PHASES_KEY]: phases,
      [NOTIFY_KEY]: { [ADAPTER_KEY]: 'none' },
    });

    // ACT
    const binding = readBinding(text);

    // ASSERT
    expect(binding).toMatchObject({ agentType: 'general-purpose', notify: { adapter: 'none' } });
  });

  it('reads models written with every tier the settings list exports', () => {
    // ARRANGE
    const section = { claude: Object.fromEntries(TIERS.map((tier) => [tier, `model-${tier}`])) };

    // ACT
    const read = readModels(section, 'project.yml');

    // ASSERT
    expect(read).toEqual({ models: section });
  });

  it('accepts names, placeholders and group wildcards', () => {
    // ARRANGE
    const text = '`grill.format` `phases.<phase>.model` `models.claude` `worktree.*` `notify.adapter`';

    // ACT
    const unknown = unknownSettings(text);

    // ASSERT
    expect(unknown).toEqual([]);
  });
});

describe('failure cases', () => {
  it('reports an unknown name planted in a fixture string', () => {
    // ARRANGE
    const text = 'Read `grill.format` then `grill.layout` and `worktree.nope`; `phases.<phase>.color` too.';

    // ACT
    const unknown = unknownSettings(text);

    // ASSERT
    expect(unknown).toEqual(['grill.layout', 'worktree.nope', 'phases.<phase>.color']);
  });

  it('reports a misspelled phase or tier, which a wildcard once accepted', () => {
    // ARRANGE
    const text = '`phases.implemnt.model` `models.claude.tpo` `phases.implement.model` `models.claude.top`';

    // ACT
    const unknown = unknownSettings(text);

    // ASSERT
    expect(unknown).toEqual(['phases.implemnt.model', 'models.claude.tpo']);
  });
});

describe('edge cases', () => {
  it('ignores backticked words outside the setting groups', () => {
    // ARRANGE
    const text = 'Run `worktree` or `drive.ts` or `phasesX.y`, see `notify.*`.';

    // ACT
    const unknown = unknownSettings(text);

    // ASSERT
    expect(unknown).toEqual([]);
  });
});

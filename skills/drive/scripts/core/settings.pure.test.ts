import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { unknownSettings } from './settings.pure.ts';

const SKILL = path.resolve(import.meta.dirname, '../..');

function markdownIn(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : markdownIn(full);
    return entry.name.endsWith('.md') ? [full] : [];
  });
}

describe('success cases', () => {
  it('knows every setting name drive markdown mentions', () => {
    // ARRANGE
    const files = markdownIn(SKILL);
    const fewestFiles = 1;

    // ACT
    const unknown = files.flatMap((file) =>
      unknownSettings(readFileSync(file, 'utf8')).map((name) => `${path.relative(SKILL, file)}: ${name}`),
    );

    // ASSERT
    expect(files.length).toBeGreaterThan(fewestFiles);
    expect(unknown).toEqual([]);
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

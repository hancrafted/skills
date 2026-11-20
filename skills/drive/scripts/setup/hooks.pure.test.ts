import { describe, expect, it } from 'vitest';
import { addAdapterHooks } from './hooks.pure.ts';
const ENTRY = 'skills/drive/scripts/drive.ts';
const existing = JSON.stringify(
  {
    hooks: {
      SubagentStart: [{ hooks: [{ type: 'command', command: 'other start' }] }],
    },
    env: { A: '1' },
  },
  null,
  2,
);

describe('success cases', () => {
  describe('addAdapterHooks', () => {
    it('adds an async hook beside the existing ones and keeps them', () => {
      // ARRANGE
      const other = 'other start';
      const startHooks = 2;
      // ACT
      const result = addAdapterHooks(existing, ENTRY);
      // ASSERT
      if (!('text' in result)) throw new Error(result.note);
      const hooks = JSON.parse(result.text).hooks;
      expect(hooks.SubagentStart).toHaveLength(startHooks);
      expect(hooks.SubagentStart[0].hooks[0].command).toBe(other);
      expect(hooks.SubagentStart[1].hooks[0]).toEqual({
        type: 'command',
        command: 'node "${CLAUDE_PROJECT_DIR}/skills/drive/scripts/harness/claude/adapter.ts" start',
        async: true,
      });
      expect(hooks.SubagentStop[0].hooks[0].command).toContain('harness/claude/adapter.ts" stop');
      expect(JSON.parse(result.text).env).toEqual({ A: '1' });
    });
  });
});

describe('failure cases', () => {
  describe('addAdapterHooks', () => {
    it('notes instead of overwriting an unreadable file', () => {
      // ARRANGE
      const unreadable = '{not json';
      // ACT
      const result = addAdapterHooks(unreadable, ENTRY);
      // ASSERT
      expect(result).toHaveProperty('note');
    });
  });
});

describe('edge cases', () => {
  describe('addAdapterHooks', () => {
    it('is idempotent', () => {
      // ARRANGE
      const once = addAdapterHooks(null, ENTRY);
      if (!('text' in once)) throw new Error(once.note);
      // ACT
      const twice = addAdapterHooks(once.text, ENTRY);
      // ASSERT
      expect(twice).toEqual(once);
    });
  });
});

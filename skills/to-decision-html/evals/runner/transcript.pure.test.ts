import { describe, expect, it } from 'vitest';
import { runFacts, toolCalls } from './transcript.pure.ts';

const line = (event: unknown): string => JSON.stringify(event);
const assistant = (content: unknown[], parent: string | null = null): string =>
  line({ type: 'assistant', parent_tool_use_id: parent, message: { content } });

describe('transcript', () => {
  describe('success cases', () => {
    it('lists every tool call in order, a subagent call included', () => {
      // ARRANGE
      const read = { file_path: '/work/handoff.md' };
      const bash = { command: 'ls', description: 'List files' };
      const lines = [
        assistant([
          { type: 'text', text: 'Reading.' },
          { type: 'tool_use', id: 't1', name: 'Read', input: read },
        ]),
        line({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't1' }] } }),
        assistant([{ type: 'tool_use', id: 't2', name: 'Bash', input: bash }], 't0'),
      ];
      const expected = [
        { name: 'Read', input: read },
        { name: 'Bash', input: bash },
      ];

      // ACT
      const calls = toolCalls(lines);

      // ASSERT
      expect(calls).toEqual(expected);
    });

    it('reads the working folder, model, duration, tokens and cost', () => {
      // ARRANGE
      const lines = [
        line({ type: 'system', subtype: 'init', cwd: '/private/work', model: 'claude-test-1' }),
        line({
          type: 'result',
          is_error: false,
          duration_ms: 65400,
          total_cost_usd: 1.25,
          usage: { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 3, cache_creation_input_tokens: 4 },
        }),
      ];
      const expected = {
        cwd: '/private/work',
        model: 'claude-test-1',
        durationSeconds: 65.4,
        tokens: 127,
        costUsd: 1.25,
        error: null,
      };

      // ACT
      const facts = runFacts(lines);

      // ASSERT
      expect(facts).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('reports a run that ended in an error result', () => {
      // ARRANGE
      const lines = [line({ type: 'result', is_error: true, subtype: 'error_max_turns', duration_ms: 1000 })];
      const expected = 'the agent ended with error_max_turns';

      // ACT
      const { error } = runFacts(lines);

      // ASSERT
      expect(error).toBe(expected);
    });

    it('reports a run that never produced a result', () => {
      // ARRANGE
      const lines = [line({ type: 'system', subtype: 'init', cwd: '/w', model: 'm' })];
      const expected = 'the transcript has no result; the agent was stopped or crashed';

      // ACT
      const { error } = runFacts(lines);

      // ASSERT
      expect(error).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('skips blank and unparsable lines, such as a stderr warning', () => {
      // ARRANGE
      const input = { file_path: '/w/a.md' };
      const lines = ['', 'Warning: not JSON', assistant([{ type: 'tool_use', id: 't', name: 'Read', input }])];
      const expected = [{ name: 'Read', input }];

      // ACT
      const calls = toolCalls(lines);

      // ASSERT
      expect(calls).toEqual(expected);
    });
  });
});

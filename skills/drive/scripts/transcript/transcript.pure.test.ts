import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractEvents, localTime, renderEvents } from './transcript.pure.ts';
const FIXTURE = readFileSync(path.join(import.meta.dirname, 'fixtures', 'session-93f19e8f.trimmed.jsonl'), 'utf8');
const line = (o: object) => `${JSON.stringify(o)}\n`;
const texts = (events: readonly { kind: string; text: string }[], kind: string) =>
  events.filter((e) => e.kind === kind).map((e) => e.text);
const result = (content: string, extra: object = {}) =>
  line({
    type: 'user',
    timestamp: 'a',
    message: { content: [{ type: 'tool_result', tool_use_id: 'u1', content, ...extra }] },
  });

describe('success cases', () => {
  describe('extractEvents on the trimmed session 93f19e8f', () => {
    it('surfaces the Operator message "what twekas?" and the relayed merge-conflict link', () => {
      // ARRANGE
      const asked = 'what twekas?';
      const relayed = 'pull/760?panel=mergeStatus has merge conflicts';
      // ACT
      const { events } = extractEvents(FIXTURE);
      // ASSERT
      expect(texts(events, 'operator')).toEqual(
        expect.arrayContaining([expect.stringContaining(asked), expect.stringContaining(relayed)]),
      );
    });

    it('surfaces the null-exit push as an error', () => {
      // ARRANGE
      const nullExit = 'failed (null)';
      // ACT
      const { events } = extractEvents(FIXTURE);
      // ASSERT
      expect(texts(events, 'error')).toContainEqual(expect.stringContaining(nullExit));
    });
  });
  describe('extractEvents', () => {
    it('reads Orchestrator questions, interrupts and refusals', () => {
      // ARRANGE
      const text =
        line({
          type: 'assistant',
          timestamp: 'a',
          message: {
            content: [{ type: 'text', text: 'Ready.\nShall I merge?' }],
          },
        }) +
        line({
          type: 'assistant',
          timestamp: 'b',
          message: {
            content: [
              {
                type: 'tool_use',
                name: 'AskUserQuestion',
                input: { questions: [{ question: 'Which base?' }] },
              },
            ],
          },
        }) +
        line({
          type: 'user',
          timestamp: 'c',
          message: {
            content: [{ type: 'text', text: '[Request interrupted by user]' }],
          },
        }) +
        line({
          type: 'user',
          timestamp: 'd',
          message: {
            content: [
              {
                type: 'tool_result',
                is_error: true,
                content: "The user doesn't want to proceed: permission denied",
              },
            ],
          },
        });
      const headLength = 20;
      const expected = [
        ['question', 'Shall I merge?'],
        ['question', 'Which base?'],
        ['interrupt', '[Request interrupted'],
        ['error', "The user doesn't wan"],
      ];
      // ACT
      const { events } = extractEvents(text);
      // ASSERT
      expect(events.map((e) => [e.kind, e.text.slice(0, headLength)])).toEqual(expected);
      expect(events.at(-1)?.text).toContain('[refusal]');
    });
  });
  describe('local time', () => {
    it('prints UTC timestamps in the reader local time', () => {
      // ARRANGE
      const d = new Date('2026-11-17T22:29:50.484Z');
      const expected = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:50`;
      const event = {
        t: '2026-11-17T22:29:50.484Z',
        kind: 'operator' as const,
        text: 'hi',
      };
      // ACT
      const local = localTime(event.t);
      const [rendered] = renderEvents('orch', [event]);
      // ASSERT
      expect(local).toContain(expected);
      expect(rendered).toContain('orch  operator');
    });
  });
});

describe('failure cases', () => {
  describe('tool errors', () => {
    it('prints an error from the is_error flag and from a non-zero exit code, marking refusals only on is_error', () => {
      // ARRANGE
      const flagged = result('permission denied', { is_error: true });
      const exited = result('build output', { exit_code: 2 });
      const plainFailure = result('boom', { is_error: true });
      // ACT
      const flaggedEvents = extractEvents(flagged).events;
      const exitedEvents = extractEvents(exited).events;
      const plainEvents = extractEvents(plainFailure).events;
      // ASSERT
      expect(flaggedEvents).toEqual([{ t: 'a', kind: 'error', text: 'permission denied  [refusal]' }]);
      expect(exitedEvents).toEqual([{ t: 'a', kind: 'error', text: 'build output' }]);
      expect(plainEvents).toEqual([{ t: 'a', kind: 'error', text: 'boom' }]);
    });
  });
});

describe('edge cases', () => {
  describe('extractEvents on the trimmed session 93f19e8f', () => {
    it('leaves tool and Skill calls out unless asked', () => {
      // ARRANGE
      const skill = 'codebase-design';
      const tool = 'Bash';
      // ACT
      const without = extractEvents(FIXTURE).events;
      const withTools = extractEvents(FIXTURE, { tools: true }).events;
      // ASSERT
      expect(without.filter((e) => e.kind === 'tool' || e.kind === 'skill')).toEqual([]);
      expect(withTools).toContainEqual(expect.objectContaining({ kind: 'skill', text: skill }));
      expect(withTools).toContainEqual(
        expect.objectContaining({ kind: 'tool', text: expect.stringMatching(new RegExp(`^${tool}`)) }),
      );
    });
  });
  describe('extractEvents', () => {
    it('ignores system-injected user text and the brief a Subagent was given', () => {
      // ARRANGE
      const text =
        line({
          type: 'user',
          timestamp: 'a',
          isMeta: true,
          message: { content: 'skill body' },
        }) +
        line({
          type: 'user',
          timestamp: 'b',
          origin: { kind: 'task-notification' },
          message: { content: '<task-notification/>' },
        }) +
        line({
          type: 'user',
          timestamp: 'c',
          isSidechain: true,
          message: { content: 'You are a Subagent' },
        }) +
        'not json\n';
      // ACT
      const { events } = extractEvents(text);
      // ASSERT
      expect(events).toEqual([]);
    });

    it('keeps an Operator message sent with an image or as several blocks', () => {
      // ARRANGE
      const note = 'slide 3 looks off';
      const text = line({
        type: 'user',
        timestamp: 'a',
        message: {
          content: [
            { type: 'text', text: note },
            { type: 'image', source: {} },
          ],
        },
      });
      // ACT
      const { events } = extractEvents(text);
      // ASSERT
      expect(events).toEqual([{ t: 'a', kind: 'operator', text: `${note} [image]` }]);
    });

    it('prints a slash command as itself and drops local command output unless --tools', () => {
      // ARRANGE
      const command =
        '<command-message>drive</command-message>\n<command-name>/drive</command-name>\n<command-args>sweep it</command-args>';
      const output = '<local-command-stdout>Set model</local-command-stdout>';
      const text =
        line({ type: 'user', timestamp: 'a', message: { content: command } }) +
        line({ type: 'user', timestamp: 'b', message: { content: output } });
      // ACT
      const plain = extractEvents(text).events;
      const withTools = extractEvents(text, { tools: true }).events;
      // ASSERT
      expect(plain).toEqual([{ t: 'a', kind: 'operator', text: '/drive sweep it' }]);
      expect(withTools.map((e) => e.text)).toEqual(['/drive sweep it', output]);
    });

    it('skips lines already read and counts the lines it saw', () => {
      // ARRANGE
      const text =
        line({ type: 'user', timestamp: 'a', message: { content: 'one' } }) +
        line({ type: 'user', timestamp: 'b', message: { content: 'two' } });
      const linesSeen = 2;
      // ACT
      const { events, lines } = extractEvents(text, { skip: 1 });
      // ASSERT
      expect(events.map((e) => e.text)).toEqual(['two']);
      expect(lines).toBe(linesSeen);
    });
  });
  describe('tool errors', () => {
    it('prints no event for a successful result that merely quotes "failed (null)" or "refused"', () => {
      // ARRANGE
      const quoted = result('✖ git push failed (null)\nthe push was refused and permission denied');
      // ACT
      const { events } = extractEvents(quoted);
      // ASSERT
      expect(events).toEqual([]);
    });
  });
});

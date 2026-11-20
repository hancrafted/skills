import { describe, expect, it } from 'vitest';
import { parseCommand } from './args.pure.ts';

describe('success cases', () => {
  describe('parseCommand', () => {
    it('reads the verb, --skill, value flags and the words after them', () => {
      // ARRANGE
      const argv = ['similar', '--skill', 'drive', 'push', 'exits', 'zero'];
      const expected = { verb: 'similar', skill: 'drive', flags: {}, approved: false, rest: ['push', 'exits', 'zero'] };
      // ACT
      const command = parseCommand(argv);
      // ASSERT
      expect(command).toEqual(expected);
    });

    it('reads record flags and the approval switch wherever they stand', () => {
      // ARRANGE
      const argv = ['file-upstream', '--approved', '--skill', 'commit', '--repo', 'o/r', '--failure', 'x'];
      const expected = {
        verb: 'file-upstream',
        skill: 'commit',
        flags: { repo: 'o/r', failure: 'x' },
        approved: true,
        rest: [],
      };
      // ACT
      const command = parseCommand(argv);
      // ASSERT
      expect(command).toEqual(expected);
    });

    it('lets check run without --skill, to cover every skill', () => {
      // ARRANGE
      const expected = { verb: 'check', skill: null, flags: {}, approved: false, rest: [] };
      // ACT
      const command = parseCommand(['check']);
      // ASSERT
      expect(command).toEqual(expected);
    });
  });
});

describe('failure cases', () => {
  describe('parseCommand', () => {
    it('refuses a verb that needs --skill when none is given', () => {
      // ARRANGE
      const expected = { error: 'list needs --skill <name>' };
      // ACT
      const command = parseCommand(['list']);
      // ASSERT
      expect(command).toEqual(expected);
    });

    it('refuses an unknown verb, an unknown flag and a flag with no value', () => {
      // ARRANGE
      const expected = [
        { error: 'unknown verb "count"' },
        { error: 'unknown flag --nope' },
        { error: '--skill needs a value' },
      ];
      // ACT
      const commands = [
        parseCommand(['count', '--skill', 'drive']),
        parseCommand(['list', '--skill', 'drive', '--nope', 'x']),
        parseCommand(['list', '--skill']),
      ];
      // ASSERT
      expect(commands).toEqual(expected);
    });
  });
});

describe('edge cases', () => {
  describe('parseCommand', () => {
    it('refuses an empty argument list', () => {
      // ARRANGE
      const expected = { error: 'no verb' };
      // ACT
      const command = parseCommand([]);
      // ASSERT
      expect(command).toEqual(expected);
    });
  });
});

import { describe, expect, it } from 'vitest';
import { intentStateOf, modeOf, STATUS_USAGE } from './intent.pure.ts';

const CONFIRMED_MARKER = '(confirmed)';

describe('success cases', () => {
  describe('modeOf', () => {
    it.each([
      ['# Decisions\n\nMode: intent-first\n', 'intent-first'],
      ['# Decisions\n\nMode: grill-first\n', 'grill-first'],
    ] as const)('reads %j as %s', (text, expected) => {
      // ARRANGE
      // ACT
      const mode = modeOf(text);
      // ASSERT
      expect(mode).toBe(expected);
    });
  });

  describe('intentStateOf', () => {
    it.each([
      ['# D\n\n### Intent statement (confirmed 2026-11-22)\n\nINTENT: x\n', 'confirmed'],
      ['# D\n\n### Intent statement (confirmed)\n\nINTENT: x\n', 'confirmed'],
      ['# D\n\n### Intent statement (unconfirmed)\n\nINTENT: x\n', 'unconfirmed'],
      ['# D\n\n### Intent statement\n\nINTENT: x\n', 'unconfirmed'],
    ] as const)('reads %j as %s', (text, expected) => {
      // ARRANGE
      // ACT
      const state = intentStateOf(text);
      // ASSERT
      expect(state).toBe(expected);
    });
  });
});

describe('failure cases', () => {
  it.each([
    [null, null],
    ['# Decisions\n\nResearch.\n', null],
    ['Mode: top-down\n', null],
  ] as const)('refuses mode in %j', (text, expected) => {
    // ARRANGE
    // ACT
    const mode = modeOf(text);
    // ASSERT
    expect(mode).toBe(expected);
  });

  it.each([
    [null],
    ['# D\n\n### Requirements grill\n'],
    ['# D\n\nThe Intent statement (confirmed later) is prose.\n'],
  ] as const)('reads %j as missing', (text) => {
    // ARRANGE
    // ACT
    const state = intentStateOf(text);
    // ASSERT
    expect(state).toBe('missing');
  });
});

describe('edge cases', () => {
  it.each([
    [
      'a changed intent appended after a confirmed one',
      '### Intent statement (confirmed 2026-11-22)\n\nA\n\n### Intent statement (unconfirmed)\n\nB\n',
      'unconfirmed',
    ],
    [
      'a changed intent confirmed after an unconfirmed one',
      '### Intent statement (unconfirmed)\n\nA\n\n### Intent statement (confirmed 2026-11-23)\n\nB\n',
      'confirmed',
    ],
  ] as const)('reads the last statement heading: %s', (_name, text, expected) => {
    // ARRANGE
    // ACT
    const state = intentStateOf(text);
    // ASSERT
    expect(state).toBe(expected);
  });

  it('documents the parser: a confirmed heading with no date still reads confirmed', () => {
    // ARRANGE
    // ACT
    const usage = STATUS_USAGE;
    // ASSERT
    expect(usage).toContain(CONFIRMED_MARKER);
  });
});

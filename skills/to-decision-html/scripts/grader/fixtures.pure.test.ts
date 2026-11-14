import { describe, expect, it } from 'vitest';
import { applyDefect, checkOfFixture } from './fixtures.pure.ts';

describe('success cases', () => {
  it('replaces each find text once, in order', () => {
    // ARRANGE
    const base = '<html data-mode="decide"><p>one</p></html>';
    const defect = {
      base: 'valid-decide.html',
      defect: 'Mode is unknown.',
      replace: [
        { find: 'decide', with: 'judge' },
        { find: '<p>one</p>', with: '' },
      ],
    };
    const expected = '<html data-mode="judge"></html>';

    // ACT
    const page = applyDefect(base, defect);

    // ASSERT
    expect(page).toBe(expected);
  });

  it('reads the check id before the double dash', () => {
    // ARRANGE
    const name = 'decide-controls--two-recommended';
    const expected = 'decide-controls';

    // ACT
    const id = checkOfFixture(name);

    // ASSERT
    expect(id).toBe(expected);
  });
});

describe('failure cases', () => {
  it('throws when a find text is missing, so a drifted base cannot hide a defect', () => {
    // ARRANGE
    const defect = { base: 'valid-decide.html', defect: 'x', replace: [{ find: 'absent', with: '' }] };
    const message = /"absent" occurs 0 times/;

    // ACT
    const apply = () => applyDefect('<html></html>', defect);

    // ASSERT
    expect(apply).toThrow(message);
  });

  it('returns null for a valid fixture', () => {
    // ARRANGE
    const name = 'valid-decide';

    // ACT
    const id = checkOfFixture(name);

    // ASSERT
    expect(id).toBeNull();
  });
});

describe('edge cases', () => {
  it('throws when a find text occurs twice, so a defect stays one defect', () => {
    // ARRANGE
    const defect = { base: 'valid-decide.html', defect: 'x', replace: [{ find: 'a', with: 'b' }] };
    const message = /"a" occurs 2 times/;

    // ACT
    const apply = () => applyDefect('a a', defect);

    // ASSERT
    expect(apply).toThrow(message);
  });

  it('takes the whole name when a broken fixture has no defect suffix', () => {
    // ARRANGE
    const name = 'offline';
    const expected = 'offline';

    // ACT
    const id = checkOfFixture(name);

    // ASSERT
    expect(id).toBe(expected);
  });
});

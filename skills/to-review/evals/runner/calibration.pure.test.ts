import { describe, expect, it } from 'vitest';
import { askedOf, atRung } from './calibration.pure.ts';

const CALIBRATION = [
  '# Calibration answers',
  '',
  '- **Depth:** `simple` on every item.',
  '- **Fidelity:** `mock` for every item. Use real card content.',
  '- **Recommendation:** recommend one Option per item.',
  '',
].join('\n');

describe('calibration answers', () => {
  describe('success cases', () => {
    it('reads the one rung the Fidelity line asks for every item', () => {
      // ARRANGE
      const expected = { fidelity: 'mock' };

      // ACT
      const asked = askedOf(CALIBRATION);

      // ASSERT
      expect(asked).toEqual(expected);
    });

    it('rewrites only the rung, so variants differ in nothing else', () => {
      // ARRANGE
      const expected = CALIBRATION.replace('`mock` for every item', '`prototype` for every item');

      // ACT
      const variant = atRung(CALIBRATION, 'prototype');

      // ASSERT
      expect(variant).toBe(expected);
      expect(askedOf(variant)).toEqual({ fidelity: 'prototype' });
    });
  });

  describe('failure cases', () => {
    it('refuses to rewrite a calibration that asks no single rung', () => {
      // ARRANGE
      const mixed = '- **Fidelity:** `mock` for the card item; the lowest rung that settles every other item.\n';

      // ACT
      const rewrite = () => atRung(mixed, 'diagram');

      // ASSERT
      expect(rewrite).toThrow('asks no single fidelity rung for every item');
    });
  });

  describe('edge cases', () => {
    it('asks nothing when the Fidelity line varies by item or names no rung on the ladder', () => {
      // ARRANGE
      const mixed = '- **Fidelity:** `mock` for the card item; the lowest rung that settles every other item.\n';
      const offLadder = '- **Fidelity:** `sketch` for every item.\n';

      // ACT
      const asked = [askedOf(mixed), askedOf(offLadder), askedOf('# No fidelity line\n')];

      // ASSERT
      expect(asked).toEqual([{}, {}, {}]);
    });
  });
});

import { describe, expect, it } from 'vitest';
import { check, contrastRatio } from './contrast.ts';

const WHITE = [255, 255, 255, 1] as const;
const BLACK = [0, 0, 0, 1] as const;
const sample = (id: string, color: readonly number[], layers: readonly (readonly number[])[] | null) => ({
  facts: { tag: 'p', id, item: null, text: '' },
  scheme: 'light',
  color,
  layers,
  fontSize: 16,
  fontWeight: 400,
});

describe('success cases', () => {
  it('is 21 for black on white', () => {
    // ARRANGE
    const [text, background] = [BLACK, WHITE];
    const expected = 21;
    const precision = 2;

    // ACT
    const ratio = contrastRatio(text, background);

    // ASSERT
    expect(ratio).toBeCloseTo(expected, precision);
  });

  it('passes #767676 body text on white and 3:1 large text', () => {
    // ARRANGE
    const samples = [
      sample('body', [0x76, 0x76, 0x76, 1], [WHITE]),
      { ...sample('title', [0x94, 0x94, 0x94, 1], [WHITE]), fontSize: 24 },
      { ...sample('bold', [0x94, 0x94, 0x94, 1], [WHITE]), fontSize: 19, fontWeight: 700 },
    ];

    // ACT
    const problems = check.judge(samples);

    // ASSERT
    expect(problems).toEqual([]);
  });
});

describe('failure cases', () => {
  it('puts #777777 on white just under 4.5', () => {
    // ARRANGE
    const text = [0x77, 0x77, 0x77, 1];
    const expected = 4.48;
    const precision = 2;

    // ACT
    const ratio = contrastRatio(text, WHITE);

    // ASSERT
    expect(ratio).toBeCloseTo(expected, precision);
  });

  it('fails body text under 4.5:1 and large text under 3:1, naming the theme', () => {
    // ARRANGE
    const samples = [
      sample('muted', [0x77, 0x77, 0x77, 1], [WHITE]),
      { ...sample('title', [0xa0, 0xa0, 0xa0, 1], [WHITE]), fontSize: 24, scheme: 'dark' },
    ];
    const expected = [
      'p#muted has contrast 4.47:1 in the light theme; AA needs 4.5:1',
      'p#title has contrast 2.61:1 in the dark theme; AA needs 3:1 for large text',
    ];

    // ACT
    const problems = check.judge(samples);

    // ASSERT
    expect(problems).toEqual(expected);
  });
});

describe('edge cases', () => {
  it('blends half-transparent black over white into mid grey', () => {
    // ARRANGE
    const text = [0, 0, 0, 0.5];
    const expected = 3.98;

    // ACT
    const ratio = contrastRatio(text, WHITE);

    // ASSERT
    expect(ratio).toBeCloseTo(expected, 1);
  });

  it('composites translucent backgrounds over the layers beneath them', () => {
    // ARRANGE
    const samples = [sample('on-tint', [0x77, 0x77, 0x77, 1], [BLACK, [255, 255, 255, 0.5]])];
    const expected = ['p#on-tint has contrast 1.12:1 in the light theme; AA needs 4.5:1'];

    // ACT
    const problems = check.judge(samples);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('skips text over an image, whose background it cannot know', () => {
    // ARRANGE
    const samples = [sample('on-photo', [0x77, 0x77, 0x77, 1], null)];

    // ACT
    const problems = check.judge(samples);

    // ASSERT
    expect(problems).toEqual([]);
  });
});

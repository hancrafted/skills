import { describe, expect, it } from 'vitest';
import { check } from './reduced-motion.ts';

const STILL = { animations: [], transitions: [], smoothScroll: false, moving: false };
const facts = (id: string) => ({ tag: 'article', id, item: 'store', text: '' });

describe('success cases', () => {
  it('passes a page that holds still under reduced motion', () => {
    // ARRANGE
    const observation = STILL;

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual([]);
  });
});

describe('failure cases', () => {
  it('fails running animations, motion transitions, smooth scrolling and script motion', () => {
    // ARRANGE
    const observation = {
      animations: [{ facts: facts('badge'), name: 'pulse', duration: 2000 }],
      transitions: [{ facts: facts('card'), property: 'transform', duration: 200 }],
      smoothScroll: true,
      moving: true,
    };
    const expected = [
      'article#badge in item "store" still runs animation "pulse" (2000ms) under prefers-reduced-motion: reduce',
      'article#card in item "store" still transitions transform over 200ms under prefers-reduced-motion: reduce',
      'the page still scrolls smoothly under prefers-reduced-motion: reduce; set scroll-behavior: auto there',
      'the page still moves on screen half a second after loading under prefers-reduced-motion: reduce; stop script-driven motion there',
    ];

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual(expected);
  });
});

describe('edge cases', () => {
  it('lets instant animations and transitions of a millisecond or less pass', () => {
    // ARRANGE
    const observation = {
      ...STILL,
      animations: [{ facts: facts('fade'), name: 'fade', duration: 0.01 }],
      transitions: [{ facts: facts('card'), property: 'all', duration: 1 }],
    };

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual([]);
  });
});

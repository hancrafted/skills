import { describe, expect, it } from 'vitest';
import { describeElement } from './element.pure.ts';

describe('success cases', () => {
  it('names an element by its id and item', () => {
    // ARRANGE
    const facts = { tag: 'textarea', id: 'c-store', item: 'store', text: '' };

    // ACT
    const described = describeElement(facts);

    // ASSERT
    expect(described).toBe('textarea#c-store in item "store"');
  });
});

describe('failure cases', () => {
  it('falls back to the text when the element has no id and sits outside any item', () => {
    // ARRANGE
    const facts = { tag: 'p', id: '', item: null, text: 'Files explored: handler.ts' };

    // ACT
    const described = describeElement(facts);

    // ASSERT
    expect(described).toBe('p "Files explored: handler.ts"');
  });
});

describe('edge cases', () => {
  it('shortens long text and collapses its whitespace', () => {
    // ARRANGE
    const facts = {
      tag: 'p',
      id: '',
      item: 'expiry',
      text: 'Reference:\n   the upstream feed publishes every five minutes',
    };

    // ACT
    const described = describeElement(facts);

    // ASSERT
    expect(described).toBe('p "Reference: the upstream feed pub…" in item "expiry"');
  });
});

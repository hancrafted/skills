import { describe, expect, it } from 'vitest';
import { check } from './depth-toggle.ts';

describe('success cases', () => {
  it('passes one revealing toggle on a "both" item and none elsewhere', () => {
    // ARRANGE
    const items = [
      { id: 'store', depth: 'simple', toggles: 0, revealed: null },
      { id: 'expiry', depth: 'both', toggles: 1, revealed: true },
      { id: 'audit', depth: 'detailed', toggles: 0, revealed: null },
    ];

    // ACT
    const problems = check.judge(items);

    // ASSERT
    expect(problems).toEqual([]);
  });
});

describe('failure cases', () => {
  it('fails a "both" item without a toggle', () => {
    // ARRANGE
    const items = [{ id: 'expiry', depth: 'both', toggles: 0, revealed: null }];
    const expected = [
      'item "expiry" has depth "both" but 0 [data-depth-toggle]; give it exactly one, starting on the simple view',
    ];

    // ACT
    const problems = check.judge(items);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails a toggle on a "simple" or "detailed" item', () => {
    // ARRANGE
    const items = [
      { id: 'store', depth: 'simple', toggles: 1, revealed: null },
      { id: 'audit', depth: 'detailed', toggles: 1, revealed: null },
    ];
    const expected = [
      'item "store" has depth "simple" but a [data-depth-toggle]; only "both" items toggle',
      'item "audit" has depth "detailed" but a [data-depth-toggle]; only "both" items toggle',
    ];

    // ACT
    const problems = check.judge(items);

    // ASSERT
    expect(problems).toEqual(expected);
  });
});

describe('edge cases', () => {
  it('fails a toggle that reveals no more text, so the item did not start on its simple view', () => {
    // ARRANGE
    const items = [{ id: 'expiry', depth: 'both', toggles: 1, revealed: false }];
    const expected = [
      'item "expiry": activating its [data-depth-toggle] shows no more text; start on the simple view and reveal the detail',
    ];

    // ACT
    const problems = check.judge(items);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails two toggles on one "both" item', () => {
    // ARRANGE
    const items = [{ id: 'expiry', depth: 'both', toggles: 2, revealed: true }];
    const expected = [
      'item "expiry" has depth "both" but 2 [data-depth-toggle]; give it exactly one, starting on the simple view',
    ];

    // ACT
    const problems = check.judge(items);

    // ASSERT
    expect(problems).toEqual(expected);
  });
});

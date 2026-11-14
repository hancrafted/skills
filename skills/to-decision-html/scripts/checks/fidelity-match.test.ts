import { describe, expect, it } from 'vitest';
import { FIXTURE_ASKED, fixturePage } from '../grader/fixtures.ts';
import { check } from './fidelity-match.ts';

const page = (items: string): string =>
  `<!doctype html><html data-page-id="p" data-revision="1" data-mode="decide"><body>${items}</body></html>`;

describe('success cases', () => {
  it('passes both valid pages at the rung their fixtures were asked for', () => {
    // ARRANGE
    const fidelity = FIXTURE_ASKED.fidelity!;
    const pages = ['valid-decide', 'valid-explain'].map((name) => ({ fidelity, html: fixturePage(name) }));

    // ACT
    const problems = pages.flatMap((observation) => check.judge(observation));

    // ASSERT
    expect(problems).toEqual([]);
  });
});

describe('failure cases', () => {
  it('fails an item built at another rung than the calibration asked for', () => {
    // ARRANGE
    const observation = { fidelity: FIXTURE_ASKED.fidelity!, html: fixturePage('fidelity-match--item-off-rung') };
    const expected = ['item "expiry" is built at wireframe; its calibration asked for diagram'];

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual(expected);
  });
});

describe('edge cases', () => {
  it('leaves a rung off the ladder, or a missing one, to page-attributes', () => {
    // ARRANGE
    const html = page(
      '<section data-item="a" data-fidelity="sketchy"></section><section data-item="b"></section>' +
        '<section data-item="c" data-fidelity="mock"></section>',
    );
    const expected = ['item "c" is built at mock; its calibration asked for prototype'];

    // ACT
    const problems = check.judge({ fidelity: 'prototype', html });

    // ASSERT
    expect(problems).toEqual(expected);
  });
});

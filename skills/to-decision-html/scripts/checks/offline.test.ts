import { describe, expect, it } from 'vitest';
import { check } from './offline.ts';

const PINNED = 'https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js';

describe('success cases', () => {
  it('passes a page that requested nothing', () => {
    // ARRANGE
    const observation = { partial: false, requests: [] };

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual([]);
  });

  it('passes pinned jsDelivr Mermaid on a page marked partial', () => {
    // ARRANGE
    const observation = { partial: true, requests: [PINNED] };

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual([]);
  });
});

describe('failure cases', () => {
  it('fails any request to another host or file', () => {
    // ARRANGE
    const requests = ['https://cdn.example.com/widgets.js', 'file:///tmp/logo.png'];
    const expected = [
      'requested https://cdn.example.com/widgets.js; a decision page loads nothing from outside itself',
      'requested file:///tmp/logo.png; a decision page loads nothing from outside itself',
    ];

    // ACT
    const problems = check.judge({ partial: true, requests });

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails pinned Mermaid on a page not marked partial', () => {
    // ARRANGE
    const expected = [`requested ${PINNED}; Mermaid from jsDelivr needs <html data-offline="partial">`];

    // ACT
    const problems = check.judge({ partial: false, requests: [PINNED] });

    // ASSERT
    expect(problems).toEqual(expected);
  });
});

describe('edge cases', () => {
  it('fails Mermaid without an exact version, even on a partial page', () => {
    // ARRANGE
    const unpinned = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
    const expected = [`requested ${unpinned}; pin Mermaid to an exact version such as mermaid@11.4.1`];

    // ACT
    const problems = check.judge({ partial: true, requests: [unpinned] });

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('reads partial from the rendered <html>', () => {
    // ARRANGE
    const html = '<html data-offline="partial"><body></body></html>';
    const loaded = {
      html,
      requests: [PINNED],
      mode: 'decide' as const,
      width: 1440,
      asked: {},
      page: undefined as never,
    };
    const expected = { partial: true, requests: [PINNED] };

    // ACT
    const observation = check.observe(loaded);

    // ASSERT
    expect(observation).toEqual(expected);
  });
});

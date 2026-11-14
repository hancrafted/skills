import { describe, expect, it } from 'vitest';
import { check } from './diagrams.ts';

const SOURCE = '\n  flowchart LR\n    Client --> Cache --> Service\n';

/** One Mermaid source as the check observes it; each test overrides the field it is about. */
const diagram = (fields: Partial<Parameters<typeof check.judge>[0]['diagrams'][number]> = {}) => ({
  name: 'store-flow',
  written: SOURCE,
  live: SOURCE,
  rendered: true,
  shown: false,
  ...fields,
});

describe('success cases', () => {
  it('passes a pre-rendered diagram whose source is unchanged', () => {
    // ARRANGE
    const observation = { partial: false, diagrams: [diagram()], unsourcedSvgs: [] };

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual([]);
  });

  it('passes a partial page that shows the source while Mermaid cannot load', () => {
    // ARRANGE
    const observation = { partial: true, diagrams: [diagram({ rendered: false, shown: true })], unsourcedSvgs: [] };

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual([]);
  });
});

describe('failure cases', () => {
  it('fails a source written with HTML entities, which a <script> keeps literally', () => {
    // ARRANGE
    const escaped = 'flowchart LR\n  Client --&gt; Cache';
    const expected = [
      'diagram "store-flow": its source contains HTML entities such as &gt;; a <script> keeps them literally, so write the Mermaid source unescaped',
    ];

    // ACT
    const problems = check.judge({
      partial: false,
      diagrams: [diagram({ written: escaped, live: escaped })],
      unsourcedSvgs: [],
    });

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails a source that a script changed or removed after load', () => {
    // ARRANGE
    const diagrams = [diagram({ live: 'flowchart LR\n  A' }), diagram({ name: 'expiry', live: null })];
    const expected = [
      'diagram "store-flow": its source changed after load; leave the <script type="text/x-mermaid"> untouched and render into another element',
      'diagram "expiry": its source was removed after load; leave the <script type="text/x-mermaid"> untouched and render into another element',
    ];

    // ACT
    const problems = check.judge({ partial: false, diagrams, unsourcedSvgs: [] });

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails a diagram with no SVG beside its source on a page that claims to be fully offline', () => {
    // ARRANGE
    const expected = [
      'diagram "store-flow" has no inline SVG beside its source; pre-render it, or mark the page data-offline="partial" and load pinned Mermaid',
    ];

    // ACT
    const problems = check.judge({ partial: false, diagrams: [diagram({ rendered: false })], unsourcedSvgs: [] });

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails a partial page that shows neither an SVG nor the source offline', () => {
    // ARRANGE
    const expected = [
      'diagram "store-flow" shows neither an SVG nor its source offline; show the source as text until Mermaid renders it',
    ];

    // ACT
    const problems = check.judge({ partial: true, diagrams: [diagram({ rendered: false })], unsourcedSvgs: [] });

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails a Mermaid-rendered SVG whose source is not on the page', () => {
    // ARRANGE
    const expected = [
      'an SVG rendered by Mermaid (flowchart-v2) has no <script type="text/x-mermaid"> source beside it',
    ];

    // ACT
    const problems = check.judge({ partial: false, diagrams: [], unsourcedSvgs: ['flowchart-v2'] });

    // ASSERT
    expect(problems).toEqual(expected);
  });
});

describe('edge cases', () => {
  it('passes a page without Mermaid diagrams', () => {
    // ARRANGE
    const observation = { partial: false, diagrams: [], unsourcedSvgs: [] };

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual([]);
  });

  it('fails an empty source', () => {
    // ARRANGE
    const expected = ['diagram "store-flow" has an empty source'];

    // ACT
    const problems = check.judge({
      partial: false,
      diagrams: [diagram({ written: '  \n', live: '  \n' })],
      unsourcedSvgs: [],
    });

    // ASSERT
    expect(problems).toEqual(expected);
  });
});

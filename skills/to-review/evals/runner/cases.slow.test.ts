import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CASES, hashProblems, keyProblems, loadCase, qualityKeys, readManifest, referenceOf } from './cases.ts';

const HASH_OF_FROZEN = '9c45da1b799a603c167323bd7ed4f52034ec28ea5e04373045a9c11f1ddc5446';
const scratch: string[] = [];
const tempCase = (): string => {
  const dir = mkdtempSync(path.join(tmpdir(), 'eval-case-'));
  scratch.push(dir);
  return dir;
};
afterEach(() => scratch.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));

describe('success cases', () => {
  it('keeps every frozen file byte-identical to its manifest hash', () => {
    // ARRANGE
    const { cases } = readManifest();

    // ACT
    const problems = cases.flatMap((entry) => hashProblems(CASES, entry.hashes));

    // ASSERT
    expect(problems).toEqual([]);
  });

  it('gives architecture-round its mode, prompt, attachments and frozen calibration answers', () => {
    // ARRANGE
    const expected = {
      id: 'architecture-round',
      evalId: 1,
      mode: 'decide',
      prompt: 'architecture-round/prompt.md',
      inputs: [
        'architecture-round/decisions.md',
        'architecture-round/review-engine.html',
        'architecture-round/review-explorable.html',
        'architecture-round/calibration.md',
      ],
    };

    // ACT
    const { id, evalId, mode, prompt, inputs } = loadCase('architecture-round');

    // ASSERT
    expect({ id, evalId, mode, prompt, inputs }).toEqual(expected);
  });

  it('loads all three cases with their frozen inputs', () => {
    // ARRANGE
    const expected = [
      {
        id: 'architecture-round',
        mode: 'decide',
        prompt: 'architecture-round/prompt.md',
        inputs: [
          'architecture-round/decisions.md',
          'architecture-round/review-engine.html',
          'architecture-round/review-explorable.html',
          'architecture-round/calibration.md',
        ],
      },
      {
        id: 'episode-spec',
        mode: 'decide',
        prompt: 'episode-spec/prompt.md',
        inputs: [
          'episode-spec/decisions.md',
          'episode-spec/visual-language.html',
          'episode-spec/episode-page.html',
          'episode-spec/design.css',
          'episode-spec/calibration.md',
        ],
      },
      {
        id: 'fortify-round',
        mode: 'decide',
        prompt: 'fortify-round/prompt.md',
        inputs: ['fortify-round/candidates.md', 'fortify-round/calibration.md'],
      },
    ];

    // ACT
    const loaded = ['architecture-round', 'episode-spec', 'fortify-round']
      .map(loadCase)
      .map(({ id, mode, prompt, inputs }) => ({ id, mode, prompt, inputs }));

    // ASSERT
    expect(loaded).toEqual(expected);
  });

  it('asks diagram fidelity for architecture-round and fortify-round and mock fidelity for episode-spec', () => {
    // ARRANGE
    const expected = [{ fidelity: 'diagram' }, { fidelity: 'mock' }, { fidelity: 'diagram' }];

    // ACT
    const asked = ['architecture-round', 'episode-spec', 'fortify-round'].map((id) => loadCase(id).asked);

    // ASSERT
    expect(asked).toEqual(expected);
  });

  it("draws every case's checklist and probe keys verbatim from what its run sees", () => {
    // ARRANGE
    const expectedIds = ['architecture-round', 'episode-spec', 'fortify-round'];
    const keyed = readManifest().cases.filter((entry) => qualityKeys(entry.id) !== null);

    // ACT
    const problems = keyed.flatMap((entry) => keyProblems(CASES, loadCase(entry.id), qualityKeys(entry.id)!));

    // ASSERT
    expect(keyed.map((entry) => entry.id)).toEqual(expectedIds);
    expect(problems).toEqual([]);
  });
  it('gives all three cases their frozen reference pages', () => {
    // ARRANGE
    const ids = ['architecture-round', 'episode-spec', 'fortify-round'];
    const expected = [
      'architecture-round/reference.html',
      'episode-spec/reference.html',
      'fortify-round/reference.html',
    ];

    // ACT
    const references = ids.map(referenceOf);

    // ASSERT
    expect(references).toEqual(expected);
    expect(references.map((file) => existsSync(path.join(CASES, file!)))).toEqual([true, true, true]);
  });
});

describe('failure cases', () => {
  it('names a frozen file whose bytes changed', () => {
    // ARRANGE
    const dir = tempCase();
    writeFileSync(path.join(dir, 'prompt.md'), 'frozen\n!');
    const expected = ['prompt.md no longer matches its frozen hash; restore it, or freeze a new case'];

    // ACT
    const problems = hashProblems(dir, { 'prompt.md': HASH_OF_FROZEN });

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it.each(['after-grill', 'ink', 'ticket'])('refuses the unapproved %s case', (id) => {
    // ARRANGE
    const expected = `no eval case "${id}"`;

    // ACT
    const load = () => loadCase(id);

    // ASSERT
    expect(load).toThrow(expected);
  });
});

describe('edge cases', () => {
  it("names a key quoted from outside the run's inputs, or not found in its file", () => {
    // ARRANGE
    const architecture = loadCase('architecture-round');
    const keys = qualityKeys('architecture-round')!;
    const [first, ...rest] = keys.probe;
    const broken = {
      checklist: keys.checklist,
      probe: [
        { ...first, source: { file: 'source.md', quote: 'magnetic' } },
        { ...rest[0], source: { file: 'decisions.md', quote: 'a quote the decisions never make' } },
        ...rest.slice(1),
      ],
    };
    const expected = [
      `probe ${first.id} quotes source.md, which the run never sees`,
      `probe ${rest[0].id} quotes text not in decisions.md: "a quote the decisions never make"`,
    ];

    // ACT
    const problems = keyProblems(CASES, architecture, broken);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it("names a ruling whose quote is not in the case's rounds.md", () => {
    // ARRANGE
    const episodeSpec = loadCase('episode-spec');
    const keys = qualityKeys('episode-spec')!;
    const [first, ...rest] = keys.checklist;
    const unquoted = 'a sentence Han never said';
    const broken = {
      checklist: [{ ...first, source: { session: 'd4eeec02', round: 1, quote: unquoted } }, ...rest],
      probe: keys.probe,
    };
    const expected = [`checklist ${first.id} quotes text not in rounds.md: "${unquoted}"`];

    // ACT
    const problems = keyProblems(CASES, episodeSpec, broken);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('names an answer key outside its choices, and a checklist of the wrong size', () => {
    // ARRANGE
    const architecture = loadCase('architecture-round');
    const keys = qualityKeys('architecture-round')!;
    const [first, ...rest] = keys.probe;
    const broken = {
      checklist: keys.checklist.slice(0, 2),
      probe: [{ ...first, answer: ['z'] }, ...rest],
    };
    const expected = [
      'checklist has 2 items; a case has 3 to 12',
      `probe ${first.id} keys z, which is not one of its choices`,
    ];

    // ACT
    const problems = keyProblems(CASES, architecture, broken);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('names a frozen file that is missing', () => {
    // ARRANGE
    const dir = tempCase();
    const expected = ['handoff.md is missing'];

    // ACT
    const problems = hashProblems(dir, { 'handoff.md': HASH_OF_FROZEN });

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('refuses a case the manifest does not list', () => {
    // ARRANGE
    const expected = 'no eval case "nope"; cases: architecture-round, episode-spec, fortify-round';

    // ACT
    const load = () => loadCase('nope');

    // ASSERT
    expect(load).toThrow(expected);
  });
});

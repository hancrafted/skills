import { describe, expect, it } from 'vitest';
import { indexPathsOf, parseIndex, replaceCommits, topLevelChanges } from './references.pure.ts';

const FIRST_COMMIT = 'a'.repeat(40);
const SECOND_COMMIT = 'b'.repeat(40);

const INDEX = [
  '---',
  'repos:',
  '  agent-skills:',
  '    url: https://example.test/agent-skills',
  `    commit: ${FIRST_COMMIT}`,
  '  plugins:',
  '    url: https://example.test/plugins',
  '    subfolder: pstack',
  `    commit: ${FIRST_COMMIT}`,
  '---',
  '',
  '# Reference repos',
  '',
  '- harness: `.references/agent-skills/skills/testing/SKILL.md`, then .references/plugins/pstack/README.md.',
  '- again: `.references/agent-skills/skills/testing/SKILL.md/`',
  '',
].join('\n');

describe('success cases', () => {
  it('reads each pin with its optional subfolder', () => {
    // ARRANGE
    const expected = [
      { name: 'agent-skills', url: 'https://example.test/agent-skills', subfolder: undefined, commit: FIRST_COMMIT },
      { name: 'plugins', url: 'https://example.test/plugins', subfolder: 'pstack', commit: FIRST_COMMIT },
    ];
    // ACT
    const pins = parseIndex(INDEX);
    // ASSERT
    expect(pins).toEqual(expected);
  });

  it('lists each distinct cache path the body names, without trailing punctuation', () => {
    // ARRANGE
    const expected = [
      { name: 'agent-skills', path: 'skills/testing/SKILL.md' },
      { name: 'plugins', path: 'pstack/README.md' },
    ];
    // ACT
    const paths = indexPathsOf(INDEX);
    // ASSERT
    expect(paths).toEqual(expected);
  });

  it('rewrites only the named pins and leaves the body untouched', () => {
    // ARRANGE
    const bodyStart = INDEX.indexOf('# Reference repos');
    // ACT
    const rewritten = replaceCommits(INDEX, { plugins: SECOND_COMMIT });
    const pins = parseIndex(rewritten);
    // ASSERT
    expect(pins.map((pin) => pin.commit)).toEqual([FIRST_COMMIT, SECOND_COMMIT]);
    expect(rewritten.slice(rewritten.indexOf('# Reference repos'))).toBe(INDEX.slice(bodyStart));
  });
});

describe('failure cases', () => {
  it('refuses an index without front matter', () => {
    // ARRANGE
    const text = '# Reference repos\n';
    // ACT
    const parse = () => parseIndex(text);
    // ASSERT
    expect(parse).toThrow(/front matter/);
  });

  it('refuses a pin without a commit', () => {
    // ARRANGE
    const text = '---\nrepos:\n  x:\n    url: https://example.test/x\n---\n';
    // ACT
    const parse = () => parseIndex(text);
    // ASSERT
    expect(parse).toThrow(/commit/);
  });
});

describe('edge cases', () => {
  it('reports added and removed top-level paths, and none when nothing moved', () => {
    // ARRANGE
    const before = ['README.md', 'skills', 'old'];
    const after = ['README.md', 'skills', 'new'];
    const expectedChange = { added: ['new'], removed: ['old'] };
    const expectedNone = { added: [], removed: [] };
    // ACT
    const change = topLevelChanges(before, after);
    const none = topLevelChanges(before, before);
    // ASSERT
    expect(change).toEqual(expectedChange);
    expect(none).toEqual(expectedNone);
  });
});

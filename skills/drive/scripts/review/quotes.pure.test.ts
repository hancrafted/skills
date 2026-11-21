import { describe, expect, it } from 'vitest';
import { CONTRADICTIONS_HEADING, quoteProblems } from './quotes.pure.ts';

const FILES: Record<string, string> = {
  'skills/a/one.md': 'first line\nAlways run the check.\nthird',
  'skills/a/two.md': 'Never run the check.\nsecond',
};
const read = (file: string): string | null => FILES[file] ?? null;
const report = (...entries: string[]): string =>
  `# Review\n\n## Findings\n\nx\n\n${CONTRADICTIONS_HEADING}\n\n${entries.join('\n')}\n`;
const PAIR = '- "Always run the check." (skills/a/one.md:2) vs "Never run the check." (skills/a/two.md:1)';

describe('success cases', () => {
  describe('quoteProblems', () => {
    it('passes a pair whose quotes sit on the stated lines', () => {
      // ARRANGE
      const text = report(PAIR);
      // ACT
      const problems = quoteProblems(text, read);
      // ASSERT
      expect(problems).toEqual([]);
    });
    it('passes none', () => {
      // ARRANGE
      const text = report('none');
      // ACT
      const problems = quoteProblems(text, read);
      // ASSERT
      expect(problems).toEqual([]);
    });
  });
});

describe('failure cases', () => {
  describe('quoteProblems', () => {
    it('names a quote that is not on the stated line', () => {
      // ARRANGE
      const entry = '- "Always run the check." (skills/a/one.md:3) vs "Never run the check." (skills/a/two.md:1)';
      const expected = ['quote not on skills/a/one.md:3: "Always run the check."'];
      // ACT
      const problems = quoteProblems(report(entry), read);
      // ASSERT
      expect(problems).toEqual(expected);
    });
    it('names a missing file', () => {
      // ARRANGE
      const entry = '- "Always run the check." (skills/a/one.md:2) vs "Never run the check." (skills/a/gone.md:1)';
      const expected = ['file not found: skills/a/gone.md'];
      // ACT
      const problems = quoteProblems(report(entry), read);
      // ASSERT
      expect(problems).toEqual(expected);
    });
    it('names a malformed entry', () => {
      // ARRANGE
      const entry = '- Always run the check vs Never run it';
      const expected = [`malformed entry, expected - "<quote>" (<file>:<line>) vs "<quote>" (<file>:<line>): ${entry}`];
      // ACT
      const problems = quoteProblems(report(entry), read);
      // ASSERT
      expect(problems).toEqual(expected);
    });
    it('names a missing section', () => {
      // ARRANGE
      const expected = [`the report has no "${CONTRADICTIONS_HEADING}" section; add it, one bullet per pair, or none`];
      // ACT
      const problems = quoteProblems('# Review\n\n## Findings\n\nx\n', read);
      // ASSERT
      expect(problems).toEqual(expected);
    });
  });
});

describe('edge cases', () => {
  describe('quoteProblems', () => {
    it('reports every bad entry, one line each, and ignores text after the section', () => {
      // ARRANGE
      const text = `${report(PAIR, '- bad', '- "x" (skills/a/gone.md:1) vs "Never run" (skills/a/two.md:1)')}\n## Next\n- also bad\n`;
      const expected = 2;
      // ACT
      const problems = quoteProblems(text, read);
      // ASSERT
      expect(problems).toHaveLength(expected);
    });
    it('treats an empty section as a missing none', () => {
      // ARRANGE
      const expected = [`"${CONTRADICTIONS_HEADING}" is empty; write one bullet per pair, or none`];
      // ACT
      const problems = quoteProblems(report(), read);
      // ASSERT
      expect(problems).toEqual(expected);
    });
  });
  it('reads the last Contradictions section outside code fences', () => {
    // ARRANGE
    const example = `${CONTRADICTIONS_HEADING}\n\n- "<quote>" (<file>:<line>) vs "<quote>" (<file>:<line>)`;
    const text = `# Review\n\n\`\`\`\n${example}\n\`\`\`\n\n${CONTRADICTIONS_HEADING}\n\n${PAIR}\n`;
    // ACT
    const problems = quoteProblems(text, read);
    // ASSERT
    expect(problems).toEqual([]);
  });
  it('reads the last Contradictions section when a section of that name comes earlier', () => {
    // ARRANGE
    const text = `${report('- bad')}\n## Notes\n\nx\n\n${CONTRADICTIONS_HEADING}\n\nnone\n`;
    // ACT
    const problems = quoteProblems(text, read);
    // ASSERT
    expect(problems).toEqual([]);
  });
  it('treats a blank quote as malformed, so it cannot match any line', () => {
    // ARRANGE
    const entry = '- " " (skills/a/one.md:1) vs "  " (skills/a/one.md:2)';
    // ACT
    const problems = quoteProblems(report(entry), read);
    // ASSERT
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('malformed entry');
  });
});

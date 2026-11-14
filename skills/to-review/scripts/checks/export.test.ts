import { describe, expect, it } from 'vitest';
import { COMMENT } from '../grader/feedback.pure.ts';
import { check, type ExportObservation } from './export.ts';

/** A page that round-trips the comment: Copy prompt and Save carry the same handoff, as a JSON payload. */
const handoff = `# Feedback on cache-layer, revision 2\n\n\`\`\`json\n${JSON.stringify({ comment: COMMENT }, null, 2)}\n\`\`\`\n`;
const passing: ExportObservation = {
  mode: 'decide',
  pageId: 'cache-layer',
  revision: '2',
  controls: { comment: true, copy: 1, save: 1 },
  typed: COMMENT,
  copied: handoff,
  download: { filename: 'cache-layer-r2-feedback.md', text: handoff },
};

describe('success cases', () => {
  it('passes a comment carried byte-identical as a JSON string by Copy prompt and Save', () => {
    // ARRANGE
    const observation = passing;

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual([]);
  });

  it('passes a comment carried verbatim', () => {
    // ARRANGE
    const text = `Page cache-layer\n\n${COMMENT}\n`;
    const observation = { ...passing, copied: text, download: { ...passing.download!, text } };

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual([]);
  });
});

describe('failure cases', () => {
  it('fails a handoff that collapsed the comment’s line breaks', () => {
    // ARRANGE
    const text = `Page cache-layer\n\n${COMMENT.replace(/\s+/g, ' ')}\n`;
    const observation = { ...passing, copied: text, download: { ...passing.download!, text } };
    const expected = [
      'Copy prompt did not carry the typed comment byte-identical',
      'the Save download did not carry the typed comment byte-identical',
    ];

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails a download under any other filename', () => {
    // ARRANGE
    const observation = { ...passing, download: { ...passing.download!, filename: 'feedback.md' } };
    const expected = ['Save downloaded "feedback.md"; expected "cache-layer-r2-feedback.md"'];

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails Copy prompt and Save carrying different handoffs', () => {
    // ARRANGE
    const observation = { ...passing, download: { ...passing.download!, text: `${handoff}\nSaved at 10:42\n` } };
    const expected = ['Copy prompt and Save carry different text; both must carry the same handoff'];

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual(expected);
  });
});

describe('edge cases', () => {
  it('names the missing controls and stops there', () => {
    // ARRANGE
    const observation: ExportObservation = {
      ...passing,
      controls: { comment: false, copy: 0, save: 2 },
      typed: null,
      copied: null,
      download: null,
    };
    const expected = [
      'no comment field: expected an editable <textarea> inside a [data-item] or [data-questions]',
      'the page has 0 [data-copy-prompt]; expected exactly one',
      'the page has 2 [data-save]; expected exactly one',
    ];

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails a field that altered the text while it was typed, and controls that produced nothing', () => {
    // ARRANGE
    const observation = { ...passing, typed: COMMENT.toUpperCase(), copied: null, download: null };
    const expected = [
      'the comment field holds different text from what was typed into it',
      'Copy prompt wrote nothing to the clipboard',
      'Save started no download',
    ];

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('leaves an explain page without a Questions field to explain-controls', () => {
    // ARRANGE
    const observation: ExportObservation = {
      ...passing,
      mode: 'explain',
      controls: { comment: false, copy: 1, save: 1 },
      typed: null,
      copied: null,
      download: null,
    };

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual([]);
  });

  it('leaves a missing page id to page-attributes', () => {
    // ARRANGE
    const observation = { ...passing, pageId: '', download: { ...passing.download!, filename: '-r2-feedback.md' } };

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual([]);
  });

  it('fails a handoff that does not name the page id', () => {
    // ARRANGE
    const text = `${COMMENT}\n`;
    const observation = { ...passing, copied: text, download: { ...passing.download!, text } };
    const expected = ['the handoff does not name the page id "cache-layer"'];

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual(expected);
  });
});

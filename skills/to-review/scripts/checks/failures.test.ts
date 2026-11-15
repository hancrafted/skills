import { describe, expect, it } from 'vitest';
import { check, type FailedPath, type FailuresObservation } from './failures.ts';

const kept: FailedPath = {
  fieldKept: true,
  draftKept: true,
  status: 'Copy failed. Copy the prompt below.',
  fallback: true,
};
const passing: FailuresObservation = {
  controls: { comment: true, copy: 1, save: 1, resetAll: 1, status: 1 },
  draftStored: true,
  copy: { ...kept, success: 'Copied the prompt.' },
  save: { ...kept, status: 'Save failed.', success: 'Download started.', downloaded: false },
  reset: {
    ...kept,
    status: 'Reset cancelled.',
    success: 'Reset all cleared every response.',
    asked: true,
    clearedOnConfirm: true,
  },
};
const reset = passing.reset!;

describe('success cases', () => {
  it('passes failed copy and save and a cancelled Reset all that keep input and say what happened', () => {
    // ARRANGE
    const observation = passing;

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual([]);
  });

  it('passes a cancelled Reset all that reports nothing', () => {
    // ARRANGE
    const observation = { ...passing, reset: { ...reset, status: '' } };

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual([]);
  });
});

describe('failure cases', () => {
  it('fails a failed copy announced with the success message', () => {
    // ARRANGE
    const observation = { ...passing, copy: { ...passing.copy, status: 'Copied the prompt.' } };
    const expected = ['a failed copy reported the success message "Copied the prompt."'];

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails a failed save that reported nothing and offered no prompt to copy by hand', () => {
    // ARRANGE
    const observation = { ...passing, save: { ...passing.save, status: '', fallback: false } };
    const expected = [
      'a failed save reported nothing; say that it failed',
      'after a failed save the page shows no prompt to copy by hand',
    ];

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails a cancelled Reset all that cleared the comment and its draft', () => {
    // ARRANGE
    const observation = { ...passing, reset: { ...reset, fieldKept: false, draftKept: false } };
    const expected = [
      'after a cancelled Reset all the comment field lost its text',
      'after a cancelled Reset all the draft lost the comment',
    ];

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails a Reset all that clears without asking', () => {
    // ARRANGE
    const observation = { ...passing, reset: { ...reset, asked: false } };
    const expected = ['Reset all asked for no confirmation; ask with confirm() first'];

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual(expected);
  });
});

describe('edge cases', () => {
  it('names the missing controls and stops there', () => {
    // ARRANGE
    const observation: FailuresObservation = {
      ...passing,
      controls: { ...passing.controls, resetAll: 0, status: 0 },
    };
    const expected = [
      'the page has 0 [data-reset-all]; expected exactly one',
      'no status message: expected an element with role="status" or aria-live',
    ];

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('fails a page that keeps no draft, and a Reset all that clears nothing even when confirmed', () => {
    // ARRANGE
    const observation = { ...passing, draftStored: false, reset: { ...reset, clearedOnConfirm: false } };
    const expected = [
      'the typed comment was not kept as a draft in localStorage under a key naming the page id',
      'a confirmed Reset all left the comment in place',
    ];

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual(expected);
  });

  it('leaves a page without a comment field to the checks that require one', () => {
    // ARRANGE
    const observation = { ...passing, controls: { ...passing.controls, comment: false }, draftStored: false };

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual([]);
  });

  it('passes an explain page, which has no Reset all to cancel', () => {
    // ARRANGE
    const observation: FailuresObservation = {
      ...passing,
      controls: { ...passing.controls, resetAll: null },
      reset: null,
    };

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual([]);
  });

  it('fails a save that still downloaded when the grader made building the file throw', () => {
    // ARRANGE
    const observation = { ...passing, save: { ...passing.save, downloaded: true } };
    const expected = [
      'Save still downloaded when URL.createObjectURL threw; build the file as a Blob behind an object URL',
    ];

    // ACT
    const problems = check.judge(observation);

    // ASSERT
    expect(problems).toEqual(expected);
  });
});

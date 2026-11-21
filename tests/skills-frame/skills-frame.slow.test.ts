import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkBody, checkRoot, CONTEXT_AND_GATES, FRAME, insertBefore, REPO_ROOT } from './helpers';

const MISSING = 'BODY_STRUCTURE__HEADING_MISSING';
const OUT_OF_ORDER = 'BODY_STRUCTURE__HEADING_OUT_OF_ORDER';
const REPEATED = 'BODY_STRUCTURE__HEADING_REPEATED';
const UNDEFINED = 'BODY_STRUCTURE__HEADING_UNDEFINED';

const PHASE_INTENT = 'never numbered';
const TITLE_INTENT = 'one per file';
const LEARN_INTENT = 'after a correction';

describe('success cases', () => {
  it('passes the frame with its required sections', () => {
    // ARRANGE
    const expectedViolations: unknown[] = [];
    // ACT
    const result = checkBody(FRAME);
    // ASSERT
    expect(result.governed).toBe(true);
    expect(result.violations).toEqual(expectedViolations);
    expect(result.status).toBe(0);
  });

  it('passes the frame with Context and Human gates after When to Use', () => {
    // ARRANGE
    const body = insertBefore(FRAME, 'Gather', CONTEXT_AND_GATES);
    // ACT
    const result = checkBody(body);
    // ASSERT
    expect(result.violations).toEqual([]);
    expect(result.status).toBe(0);
  });

  it('passes a body without Common Rationalizations and Red Flags, which a skill with no learning omits', () => {
    // ARRANGE
    const body = FRAME.replace('## Red Flags\n\n- A sign of drift.\n\n', '').replace(
      /## Common Rationalizations[\s\S]*?(?=## Verification)/,
      '',
    );
    // ACT
    const result = checkBody(body);
    // ASSERT
    expect(result.violations).toEqual([]);
    expect(result.status).toBe(0);
  });

  it('passes every skill under skills/', () => {
    // ARRANGE
    const skillsRoot = join(REPO_ROOT, 'skills');
    // ACT
    const result = checkRoot(skillsRoot);
    // ASSERT
    expect(result.governed).toBe(true);
    expect(result.violations).toEqual([]);
    expect(result.status).toBe(0);
  });
});

describe('failure cases', () => {
  it('fails a wrong order with the intent of the section out of place', () => {
    // ARRANGE
    const body = FRAME.replace('## Common Rationalizations', '## Red Flags').replace(
      '## Red Flags\n\n- A sign',
      '## Common Rationalizations\n\n- A sign',
    );
    // ACT
    const result = checkBody(body);
    // ASSERT
    expect(result.status).toBe(1);
    expect(result.violations.map((violation) => violation.code)).toContain(OUT_OF_ORDER);
  });

  it('fails a numbered H2 with the phase intent', () => {
    // ARRANGE
    const body = FRAME.replace('## Gather', '## 1. Gather');
    // ACT
    const result = checkBody(body);
    // ASSERT
    expect(result.status).toBe(1);
    expect(result.violations).toContainEqual(expect.objectContaining({ code: UNDEFINED, heading: '1. Gather' }));
    expect(result.violations.map((violation) => violation.text).join(' ')).toContain(PHASE_INTENT);
  });

  it('fails a heading after Verification with the phase intent', () => {
    // ARRANGE
    const body = `${FRAME}\n## See Also\n\nA link.\n`;
    // ACT
    const result = checkBody(body);
    // ASSERT
    expect(result.status).toBe(1);
    expect(result.violations).toContainEqual(
      expect.objectContaining({ code: OUT_OF_ORDER, text: expect.stringContaining(PHASE_INTENT) }),
    );
  });

  it('fails two H1 headings with the title intent', () => {
    // ARRANGE
    const body = `${FRAME}\n# Second title\n`;
    // ACT
    const result = checkBody(body);
    // ASSERT
    expect(result.status).toBe(1);
    expect(result.violations).toContainEqual(
      expect.objectContaining({ code: REPEATED, text: expect.stringContaining(TITLE_INTENT) }),
    );
  });

  it('fails a missing Learn step with its intent', () => {
    // ARRANGE
    const body = FRAME.replace('### 2. Learn', '### 2. Wrap up');
    // ACT
    const result = checkBody(body);
    // ASSERT
    expect(result.status).toBe(1);
    expect(result.violations).toContainEqual(
      expect.objectContaining({ code: MISSING, text: expect.stringContaining(LEARN_INTENT) }),
    );
  });
});

describe('edge cases', () => {
  it('fails a step after Learn, since Learn is the last step', () => {
    // ARRANGE
    const body = `${FRAME}\n### 3. Afterwards\n`;
    // ACT
    const result = checkBody(body);
    // ASSERT
    expect(result.status).toBe(1);
    expect(result.violations).toContainEqual(expect.objectContaining({ code: UNDEFINED, heading: '3. Afterwards' }));
  });

  it('fails Human gates placed before Context', () => {
    // ARRANGE
    const swapped = CONTEXT_AND_GATES.split('## Human gates');
    const body = insertBefore(FRAME, 'Gather', `## Human gates${swapped[1]}${swapped[0]}`);
    // ACT
    const result = checkBody(body);
    // ASSERT
    expect(result.status).toBe(1);
    expect(result.violations.map((violation) => violation.code)).toContain(OUT_OF_ORDER);
  });

  it('allows deeper unnumbered headings under a step', () => {
    // ARRANGE
    const body = FRAME.replace('#### A sub-part\n', '#### A sub-part\n\n##### Its detail\n');
    // ACT
    const result = checkBody(body);
    // ASSERT
    expect(result.violations).toEqual([]);
    expect(result.status).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import { checkSkill } from './helpers';

const RULE_ID = 'agentskills-spec';
const CLEAN = 'name: sample\ndescription: Does a thing. Use when the user asks for the thing.';

describe('success cases', () => {
  it('passes a clean skill', () => {
    // ARRANGE
    const expectedViolations: unknown[] = [];
    // ACT
    const result = checkSkill(CLEAN);
    // ASSERT
    expect(result.status).toBe(0);
    expect(result.violations).toEqual(expectedViolations);
  });

  it('passes a documented Claude Code key', () => {
    // ARRANGE
    const frontmatter = `${CLEAN}\ndisable-model-invocation: true`;
    // ACT
    const result = checkSkill(frontmatter);
    // ASSERT
    expect(result.status).toBe(0);
    expect(result.invalidFiles).toBe(0);
  });

  it('passes every documented Claude Code key', () => {
    // ARRANGE
    const keys = [
      'when_to_use',
      'argument-hint',
      'arguments',
      'disable-model-invocation',
      'user-invocable',
      'disallowed-tools',
      'model',
      'effort',
      'context',
      'agent',
      'background',
      'hooks',
      'paths',
      'shell',
    ];
    const frontmatter = [CLEAN, ...keys.map((key) => `${key}: value`)].join('\n');
    // ACT
    const result = checkSkill(frontmatter);
    // ASSERT
    expect(result.violations).toEqual([]);
    expect(result.status).toBe(0);
  });
});

describe('failure cases', () => {
  it('fails a typo of a Claude Code key, naming the rule and the key', () => {
    // ARRANGE
    const frontmatter = `${CLEAN}\ndisable-model-invokation: true`;
    const expectedViolation = { field: 'disable-model-invokation', violation: 'FRONTMATTER__UNKNOWN_KEY_FORBIDDEN' };
    // ACT
    const result = checkSkill(frontmatter);
    // ASSERT
    expect(result.status).toBe(1);
    expect(result.ruleIds).toContain(RULE_ID);
    expect(result.violations).toEqual([expect.objectContaining(expectedViolation)]);
  });

  it('fails a name outside the spec pattern', () => {
    // ARRANGE
    const frontmatter = 'name: Bad_Name\ndescription: Does a thing. Use when asked.';
    // ACT
    const result = checkSkill(frontmatter);
    // ASSERT
    expect(result.status).toBe(1);
    expect(result.violations).toEqual([expect.objectContaining({ field: 'name' })]);
    expect(result.ruleIds).toEqual([RULE_ID]);
  });

  it('fails a description longer than 1024 characters', () => {
    // ARRANGE
    const frontmatter = `name: sample\ndescription: Does a thing. Use when asked. ${'x'.repeat(1024)}`;
    // ACT
    const result = checkSkill(frontmatter);
    // ASSERT
    expect(result.status).toBe(1);
    expect(result.violations).toEqual([expect.objectContaining({ field: 'description' })]);
    expect(result.ruleIds).toEqual([RULE_ID]);
  });

  it.each([
    ['has no Use when', 'Does a thing for the user.'],
    ['contains an XML tag', 'Does a <b>thing</b>. Use when asked.'],
    ['contains a closing XML tag', 'Does a thing</b>. Use when asked.'],
    ['opens with I', 'I do a thing. Use when asked.'],
    ['opens with You', 'You do a thing. Use when asked.'],
    ['opens with Use when', 'Use when the user asks for a thing.'],
  ])('fails a description that %s', (_label, description) => {
    // ARRANGE
    const frontmatter = `name: sample\ndescription: '${description}'`;
    // ACT
    const result = checkSkill(frontmatter);
    // ASSERT
    expect(result.status).toBe(1);
    expect(result.violations).toEqual([expect.objectContaining({ field: 'description' })]);
    expect(result.ruleIds).toEqual([RULE_ID]);
  });
});

describe('edge cases', () => {
  it('accepts Use when in the middle of a description', () => {
    // ARRANGE
    const frontmatter = 'name: sample\ndescription: Does a thing for you. Use when asked, or when idle.';
    // ACT
    const result = checkSkill(frontmatter);
    // ASSERT
    expect(result.status).toBe(0);
    expect(result.violations).toEqual([]);
  });

  it('accepts a description that starts with a word beginning with I or You', () => {
    // ARRANGE
    const frontmatter = 'name: sample\ndescription: Interviews the user, Yours truly. Use when asked.';
    // ACT
    const result = checkSkill(frontmatter);
    // ASSERT
    expect(result.status).toBe(0);
    expect(result.violations).toEqual([]);
  });

  it('accepts a comparison sign that is not an XML tag', () => {
    // ARRANGE
    const frontmatter = "name: sample\ndescription: 'Keeps a < b and c > d. Use when asked.'";
    // ACT
    const result = checkSkill(frontmatter);
    // ASSERT
    expect(result.status).toBe(0);
    expect(result.violations).toEqual([]);
  });

  it('judges a folded multi-line description as one string', () => {
    // ARRANGE
    const frontmatter = 'name: sample\ndescription: >-\n  Does a thing across\n  two lines. Use when asked.';
    // ACT
    const result = checkSkill(frontmatter);
    // ASSERT
    expect(result.status).toBe(0);
    expect(result.violations).toEqual([]);
  });
});

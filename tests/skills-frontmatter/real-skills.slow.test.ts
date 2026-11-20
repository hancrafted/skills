import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkRoot, REPO_ROOT } from './helpers';

describe('success cases', () => {
  it('passes the real skills folder', () => {
    // ARRANGE
    const skillsRoot = join(REPO_ROOT, 'skills');
    // ACT
    const result = checkRoot(skillsRoot);
    // ASSERT
    expect(result.violations).toEqual([]);
    expect(result.status).toBe(0);
  });
});

describe('failure cases', () => {
  it('reports a folder that holds no skills as ungoverned, not as a pass over skills', () => {
    // ARRANGE
    const emptyRoot = join(REPO_ROOT, 'tests/skills-frontmatter');
    // ACT
    const result = checkRoot(emptyRoot);
    // ASSERT
    expect(result.violations).toEqual([]);
    expect(result.ruleIds).toEqual([]);
  });
});

describe('edge cases', () => {
  it('governs at least one skill in the real folder', () => {
    // ARRANGE
    const skillsRoot = join(REPO_ROOT, 'skills');
    // ACT
    const result = checkRoot(skillsRoot);
    // ASSERT
    expect(result.invalidFiles).toBe(0);
    expect(result.status).toBe(0);
  });
});

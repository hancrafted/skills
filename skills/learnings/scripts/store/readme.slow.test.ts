import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LEARNINGS_README } from './write.pure.ts';

const README = fileURLToPath(new URL('../../../../docs/learnings/README.md', import.meta.url));

describe('success cases', () => {
  it('has docs/learnings/README.md equal the template in write.pure.ts', () => {
    // ARRANGE
    const onDisk = readFileSync(README, 'utf8');
    // ACT
    const template = LEARNINGS_README;
    // ASSERT
    expect(onDisk).toBe(template);
  });
});

describe('failure cases', () => {
  it('does not let the template drift into a blank file', () => {
    // ARRANGE
    const template = LEARNINGS_README;
    // ACT
    const heading = template.split('\n')[0];
    // ASSERT
    expect(heading).toBe('# Learnings');
  });
});

describe('edge cases', () => {
  it('ends the template with a single newline', () => {
    // ARRANGE
    const template = LEARNINGS_README;
    // ACT
    const ending = template.slice(-2);
    // ASSERT
    expect(ending).not.toBe('\n\n');
  });
});

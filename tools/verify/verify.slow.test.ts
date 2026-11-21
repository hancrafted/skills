import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COMMIT_PLAN, VERIFY_PLAN } from './verify.pure.ts';

const scripts = () => (JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> }).scripts;
const npmScriptsRun = (commands: readonly string[]) =>
  commands.flatMap((command) => /^npm run (?:-s )?([\w:-]+)/.exec(command)?.[1] ?? []);
const commandsOf = (plan: typeof VERIFY_PLAN) => plan.phases.flat().map((step) => step.command);

describe('success cases', () => {
  it('runs the archgate script that package.json defines, and that script fails on advisory findings', () => {
    // ARRANGE
    const archgate = VERIFY_PLAN.phases
      .flat()
      .filter((step) => step.name === 'archgate')
      .map((step) => step.command);

    // ACT
    const script = scripts()['archgate:full'];

    // ASSERT
    expect(archgate).toEqual(['npm run -s archgate:full']);
    expect(script).toContain('--strict');
  });
});

describe('failure cases', () => {
  it('has no step that runs an npm script package.json does not define', () => {
    // ARRANGE
    const defined = Object.keys(scripts());

    // ACT
    const missing = npmScriptsRun(commandsOf(VERIFY_PLAN)).filter((name) => !defined.includes(name));

    // ASSERT
    expect(missing).toEqual([]);
  });
});

describe('edge cases', () => {
  it('covers the commit plan too', () => {
    // ARRANGE
    const defined = Object.keys(scripts());

    // ACT
    const missing = npmScriptsRun(commandsOf(COMMIT_PLAN)).filter((name) => !defined.includes(name));

    // ASSERT
    expect(missing).toEqual([]);
  });
});

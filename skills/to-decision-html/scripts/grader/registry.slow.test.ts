import { describe, expect, it } from 'vitest';
import { checkOfFixture } from './fixtures.pure.ts';
import { fixtureNames, fixturePage } from './fixtures.ts';
import { checkFiles, loadChecks } from './registry.ts';

describe('success cases', () => {
  it('registers every check module, each under its file name', async () => {
    // ARRANGE
    const expected = checkFiles().map((file) => file.replace(/\.ts$/, ''));

    // ACT
    const ids = (await loadChecks()).map((check) => check.id);

    // ASSERT
    expect(ids).toEqual(expected);
  });
});

describe('failure cases', () => {
  it('has no broken fixture naming an unregistered check', async () => {
    // ARRANGE
    const ids = (await loadChecks()).map((check) => check.id);

    // ACT
    const unknown = fixtureNames()
      .map(checkOfFixture)
      .filter((id): id is string => id !== null && !ids.includes(id));

    // ASSERT
    expect(unknown).toEqual([]);
  });
});

describe('edge cases', () => {
  it('gives every check at least one broken fixture, so none passes vacuously', async () => {
    // ARRANGE
    const proven = new Set(fixtureNames().map(checkOfFixture));

    // ACT
    const unproven = (await loadChecks()).map((check) => check.id).filter((id) => !proven.has(id));

    // ASSERT
    expect(unproven).toEqual([]);
  });

  it('applies every defect cleanly to its base page', () => {
    // ARRANGE
    const names = fixtureNames();

    // ACT
    const pages = names.map((name) => fixturePage(name).length > 0);

    // ASSERT
    expect(pages).not.toContain(false);
  });
});

import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('slow lane git fence', () => {
  it('leaves no GIT_* variable in the test environment', () => {
    // ARRANGE
    const leaked = Object.keys(process.env).filter((key) => key.startsWith('GIT_'));
    // ACT
    const found = leaked;
    // ASSERT
    expect(found).toEqual([]);
  });

  it('does not let an inherited GIT_DIR redirect a temp git init into another repo', () => {
    // ARRANGE
    const other = mkdtempSync(join(tmpdir(), 'fence-other-'));
    const temp = mkdtempSync(join(tmpdir(), 'fence-temp-'));
    try {
      // ACT
      const run = spawnSync('git', ['init', '--quiet', temp], { encoding: 'utf8', env: process.env });
      // ASSERT
      expect(run.status).toBe(0);
      const inTemp = spawnSync('git', ['-C', temp, 'rev-parse', '--git-dir'], { encoding: 'utf8', env: process.env });
      expect(inTemp.stdout.trim()).toBe('.git');
    } finally {
      rmSync(other, { recursive: true, force: true });
      rmSync(temp, { recursive: true, force: true });
    }
  });
});

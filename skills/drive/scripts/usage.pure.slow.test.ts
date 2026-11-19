import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DRIVE_USAGE } from './usage.pure.ts';

const CLI = path.join(import.meta.dirname, 'drive.ts');

describe('failure cases', () => {
  describe('drive with a group it does not route', () => {
    it('exits non-zero and prints the usage naming every group', () => {
      // ARRANGE
      const expected = `✖ unknown group '--help'; usage: ${DRIVE_USAGE}\n`;
      // ACT
      const result = spawnSync(process.execPath, [CLI, '--help'], { encoding: 'utf8', cwd: import.meta.dirname });
      // ASSERT
      expect(result.status).not.toBe(0);
      expect(result.stderr).toBe(expected);
    });
  });
});

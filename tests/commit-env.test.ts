import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createDir, createRepo, runGate, runScript, SETUP_HUSKY } from './helpers/commit-gate';

describe('commit fixtures in a Git hook environment', () => {
  describe('success cases', () => {
    it('does not use a foreign repository merge to exempt a fixture commit', () => {
      const foreign = createRepo();
      const fixture = createRepo();
      try {
        writeFileSync(join(foreign, '.git', 'MERGE_HEAD'), 'deadbeef\n');
        const result = runGate('not a compliant commit', {
          cwd: fixture,
          env: { GIT_DIR: join(foreign, '.git'), GIT_WORK_TREE: foreign },
        });
        expect(result.code).toBe(1);
      } finally {
        for (const dir of [foreign, fixture]) rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  describe('failure cases', () => {
    it('rejects hook setup outside Git even when Git supplies repository variables', () => {
      const foreign = createRepo();
      const outside = createDir();
      try {
        const result = runScript(SETUP_HUSKY, [], {
          cwd: outside,
          env: { GIT_DIR: join(foreign, '.git'), GIT_WORK_TREE: foreign },
        });
        expect(result.code).toBe(1);
        expect(result.output).toContain('git repository');
      } finally {
        for (const dir of [foreign, outside]) rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  describe('edge cases', () => {
    it('preserves the explicit commit-gate merge override', () => {
      const dir = createDir();
      try {
        const mergeHead = join(dir, 'MERGE_HEAD');
        writeFileSync(mergeHead, 'deadbeef\n');
        expect(runGate('not a compliant commit', { env: { COMMIT_MSG_GATE_MERGE_HEAD: mergeHead } }).code).toBe(0);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  });
});

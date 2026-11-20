import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
export const SKILLS_CONFIG = join(REPO_ROOT, 'skills/markdown-harness.config.yaml');
const MH = join(REPO_ROOT, 'node_modules/.bin/mh');

export interface Violation {
  field: string;
  violation: string;
}

export interface CheckResult {
  status: number | null;
  ruleIds: string[];
  violations: Violation[];
  invalidFiles: number;
  governedFiles: number;
}

interface CheckReport {
  result: {
    summary: { invalidFiles: number; governedFiles: number };
    files: { modules: { ruleId: string; violations: Violation[] }[] }[];
  };
}

export function checkRoot(root: string): CheckResult {
  const run = spawnSync(MH, ['check', '--root', root, '--config', SKILLS_CONFIG], {
    encoding: 'utf8',
    timeout: 20_000,
  });
  const report = JSON.parse(run.stdout) as CheckReport;
  const modules = report.result.files.flatMap((file) => file.modules);
  return {
    status: run.status,
    ruleIds: modules.map((module) => module.ruleId),
    violations: modules.flatMap((module) => module.violations),
    invalidFiles: report.result.summary.invalidFiles,
    governedFiles: report.result.summary.governedFiles,
  };
}

export function checkSkill(frontmatter: string): CheckResult {
  const root = mkdtempSync(join(tmpdir(), 'skills-frontmatter-'));
  try {
    mkdirSync(join(root, 'sample'));
    writeFileSync(join(root, 'sample', 'SKILL.md'), `---\n${frontmatter}\n---\n\n# Sample\n`);
    return checkRoot(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

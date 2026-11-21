import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SKILLS_CONFIG = join(REPO_ROOT, 'skills/markdown-harness.config.yaml');
const MH = join(REPO_ROOT, 'node_modules/.bin/mh');
const RULE_ID = 'skill-body-frame';
const FRONTMATTER = '---\nname: sample\ndescription: Does a thing. Use when the user asks for the thing.\n---\n\n';

export interface FrameViolation {
  code: string;
  heading: string;
  text: string;
}

export interface FrameResult {
  status: number | null;
  governed: boolean;
  violations: FrameViolation[];
}

interface ModuleReport {
  ruleId: string;
  ruleIntent: string;
  violations: { violation: string; content?: string }[];
}

interface CheckReport {
  result: { summary: { governedFiles: number }; files: { modules: ModuleReport[] }[] };
}

export function checkRoot(root: string): FrameResult {
  const run = spawnSync(MH, ['body-structure', 'check', '--root', root, '--config', SKILLS_CONFIG], {
    encoding: 'utf8',
    timeout: 20_000,
  });
  const report = JSON.parse(run.stdout) as CheckReport;
  const modules = report.result.files.flatMap((file) => file.modules).filter((module) => module.ruleId === RULE_ID);
  return {
    status: run.status,
    governed: report.result.summary.governedFiles > 0,
    violations: modules.flatMap((module) =>
      module.violations.map((violation) => ({
        code: violation.violation,
        heading: violation.content ?? '',
        text: `${module.ruleIntent} ${JSON.stringify(violation)}`,
      })),
    ),
  };
}

export function checkBody(body: string): FrameResult {
  const root = mkdtempSync(join(tmpdir(), 'skills-frame-'));
  try {
    mkdirSync(join(root, 'sample'));
    writeFileSync(join(root, 'sample', 'SKILL.md'), `${FRONTMATTER}${body}`);
    return checkRoot(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

export const FRAME = `# Sample

What the skill does, in prose.

## Overview

One sentence.

## When to Use

- A situation.
- NOT for: another one.

## Gather

### 1. Read the input

Do it.

_Done when:_ the input is read.

#### A sub-part

Detail.

## Common Rationalizations

| Excuse | Rebuttal |
| ------ | -------- |
| "It is fine." | It was not. |

## Red Flags

- A sign of drift.

## Verification

- [ ] The command exits 0.

### 2. Learn

After a correction, run /learnings.
`;

export const CONTEXT_AND_GATES = `## Context

The home, and the protocol block.

## Human gates

- Before deleting a branch: data loss.

`;

export function insertBefore(body: string, heading: string, insert: string): string {
  return body.replace(`## ${heading}`, `${insert}## ${heading}`);
}

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { canonicalHookBody, REPO_ROOT } from './helpers/commit-gate';

const ASSET_DOC = join(REPO_ROOT, 'skills/commit/assets/setup-husky.md');
const WIRED_HOOK = join(REPO_ROOT, '.husky/commit-msg');

function firstShellBlockAfter(markdown: string, heading: string): string {
  const headingAt = markdown.indexOf(heading);
  if (headingAt === -1) throw new Error(`heading not found: ${heading}`);
  const match = /```sh\n([\s\S]*?)```/.exec(markdown.slice(headingAt));
  if (!match) throw new Error(`no \`\`\`sh block after: ${heading}`);
  return match[1];
}

/**
 * lib/hook.sh claims to be the single definition of the hook body, because two
 * install flows write it and a repository whose hook disagrees judges commits
 * differently. A claim in a comment is not a guarantee — these are.
 */
describe('the canonical hook body', () => {
  const canonical = canonicalHookBody().trimEnd();

  it('is produced by lib/hook.sh and delegates to the installed gate path', () => {
    expect(canonical).not.toBe('');
    expect(canonical).toContain('.agents/skills/commit/scripts/commit-msg');
    expect(canonical).toContain('skills/commit/scripts/commit-msg');
  });

  it('matches the body reproduced verbatim in assets/setup-husky.md', () => {
    const documented = firstShellBlockAfter(readFileSync(ASSET_DOC, 'utf8'), '## The canonical hook body');
    expect(documented.trimEnd()).toBe(canonical);
  });

  it('matches the hook this repository has wired up for itself', () => {
    expect(readFileSync(WIRED_HOOK, 'utf8').trimEnd()).toBe(canonical);
  });
});

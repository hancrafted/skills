import { spawnSync } from 'node:child_process';
import { cpSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createDir, createRepo, GATE, message, runGate, runScript, SOURCE_TRAILER } from './helpers/commit-gate';

/** Default git config — `core.commentChar` unset, so it is `#`. */
const repo = createRepo();
const gate = (msg: string, env?: Record<string, string>) => runGate(msg, { cwd: repo, env });

const TYPES = ['feat', 'fix', 'docs', 'refactor', 'chore', 'style', 'test', 'perf', 'build', 'ci', 'revert'];
const CATEGORIES = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security'];

describe('header', () => {
  it.each(TYPES)('accepts type %s', (type) => {
    expect(gate(message(`${type}(scope): do a thing`)).code).toBe(0);
  });

  it('rejects an unknown type', () => {
    const result = gate(message('banana(scope): do a thing'));
    expect(result.code).toBe(1);
    expect(result.output).toContain('✖ Header');
  });

  it('shows what was actually written', () => {
    expect(gate(message('banana(scope): do a thing')).output).toContain('banana(scope): do a thing');
  });

  it('accepts an absent scope', () => {
    expect(gate(message('feat: do a thing')).code).toBe(0);
  });

  it('accepts a freeform scope', () => {
    expect(gate(message('feat(deep/nested path 2): do a thing')).code).toBe(0);
  });

  it.each(['feat!: do a thing', 'feat(scope)!: do a thing'])('accepts the bang in %s', (header) => {
    expect(gate(message(header)).code).toBe(0);
  });

  it('rejects an empty subject', () => {
    expect(gate(message('feat(scope): ')).code).toBe(1);
  });

  it('rejects a non-empty second line', () => {
    const result = gate(`feat(scope): do a thing\nnot blank\n\n### Added\n1. Thing.\n\n${SOURCE_TRAILER}\n`);
    expect(result.code).toBe(1);
    expect(result.output).toContain('✖ Header');
  });
});

describe('body shape', () => {
  it.each(CATEGORIES)('accepts the %s category', (category) => {
    expect(gate(message('feat: do a thing', `### ${category}\n1. Thing.`)).code).toBe(0);
  });

  it('rejects a heading outside the six categories', () => {
    const result = gate(message('feat: do a thing', '### Unreleased\n1. Thing.'));
    expect(result.code).toBe(1);
    expect(result.output).toContain('✖ Body');
  });

  it('rejects a category heading carrying extra words', () => {
    expect(gate(message('feat: do a thing', '### Added some notes\n1. Thing.')).code).toBe(1);
  });

  it('rejects an H2 category heading', () => {
    expect(gate(message('feat: do a thing', '## Added\n1. Thing.')).code).toBe(1);
  });

  it('rejects a body with no category heading at all', () => {
    expect(gate(message('feat: do a thing', 'Just prose, no heading.')).code).toBe(1);
  });

  it('rejects a category heading with no numbered item', () => {
    const result = gate(message('feat: do a thing', '### Added\n- a bullet, not a numbered item'));
    expect(result.code).toBe(1);
    expect(result.output).toContain('✖ Body');
  });

  it('rejects when a later heading has no numbered item', () => {
    expect(gate(message('feat: do a thing', '### Added\n1. Thing.\n\n### Fixed\nProse only.')).code).toBe(1);
  });

  it('accepts mis-ordered numbering — shape, never sequence', () => {
    expect(gate(message('feat: do a thing', '### Added\n1. One.\n3. Three.\n2. Two.')).code).toBe(0);
  });

  it('accepts prose before, between, and after sections', () => {
    const body = [
      'Why this change happened.',
      '',
      '### Added',
      '1. Thing.',
      '',
      'A note between sections.',
      '',
      '### Fixed',
      '1. Other thing.',
      '',
      'A closing note.',
    ].join('\n');
    expect(gate(message('feat: do a thing', body)).code).toBe(0);
  });
});

describe('Source trailer', () => {
  it('rejects an absent trailer', () => {
    const result = gate(`feat: do a thing\n\n### Added\n1. Thing.\n`);
    expect(result.code).toBe(1);
    expect(result.output).toContain('✖ Source');
  });

  it('accepts a parseable trailer', () => {
    expect(gate(message('feat: do a thing')).code).toBe(0);
  });

  // The regression test that justifies git's parser over a text search: this
  // message *contains* `Source:` but `git log` would return nothing for it.
  it('rejects a trailer followed by a prose paragraph', () => {
    const result = gate(`${message('feat: do a thing')}\nOne more thought.\n`);
    expect(result.code).toBe(1);
    expect(result.output).toContain('✖ Source');
  });

  it('rejects a trailer not preceded by a blank line', () => {
    expect(gate(`feat: do a thing\n\n### Added\n1. Thing.\n${SOURCE_TRAILER}\n`).code).toBe(1);
  });

  it.each(['Source:', 'Source: ', 'Source: |', 'Source:  |  '])('rejects the empty value in %o', (trailer) => {
    const result = gate(message('feat: do a thing', '### Added\n1. Thing.', trailer));
    expect(result.code).toBe(1);
    expect(result.output).toContain('✖ Source');
  });

  // "A bare `#123` resolves to nothing in a fork, a mirror, or a corpus." The
  // *form* of a reference is delegated to the repo's tracker docs, but this one
  // case is checkable without knowing anything about the tracker.
  it.each(['Source: #123', 'Source: #123 | wire up the gate', 'Source:  #7  '])(
    'rejects the bare issue number in %o',
    (trailer) => {
      const result = gate(message('feat: do a thing', '### Added\n1. Thing.', trailer));
      expect(result.code).toBe(1);
      expect(result.output).toContain('bare issue number');
    },
  );

  it('accepts a reference that resolves without ambient context', () => {
    const trailer = 'Source: https://github.com/hancrafted/skills/issues/123';
    expect(gate(message('feat: do a thing', '### Added\n1. Thing.', trailer)).code).toBe(0);
  });

  it('accepts a repository-relative reference, since the form is delegated', () => {
    const trailer = 'Source: docs/specs/0001-commit-gate.md | wire up the gate';
    expect(gate(message('feat: do a thing', '### Added\n1. Thing.', trailer)).code).toBe(0);
  });

  it('accepts a reference with no prompt summary', () => {
    expect(gate(message('feat: do a thing', '### Added\n1. Thing.', 'Source: https://example.com/1')).code).toBe(0);
  });

  it('accepts a prompt summary with no reference', () => {
    expect(gate(message('feat: do a thing', '### Added\n1. Thing.', 'Source: | wire up the gate')).code).toBe(0);
  });

  it('accepts repeated trailers', () => {
    const trailers = `${SOURCE_TRAILER}\nSource: https://example.com/2 | a second cause`;
    expect(gate(message('feat: do a thing', '### Added\n1. Thing.', trailers)).code).toBe(0);
  });

  it('accepts Co-Authored-By after Source', () => {
    const trailers = `${SOURCE_TRAILER}\nCo-Authored-By: Someone <someone@example.com>`;
    expect(gate(message('feat: do a thing', '### Added\n1. Thing.', trailers)).code).toBe(0);
  });
});

describe('exemptions', () => {
  it('bypasses the gate during an in-progress merge', () => {
    const merging = createRepo();
    writeFileSync(join(merging, '.git', 'MERGE_HEAD'), 'deadbeef\n');
    expect(runGate("Merge branch 'topic' into main\n", { cwd: merging }).code).toBe(0);
  });

  it('judges a merge-shaped message when no merge is in progress', () => {
    const result = gate("Merge branch 'topic' into main\n");
    expect(result.code).toBe(1);
    expect(result.output).toContain('✖ Header');
  });

  it('judges a legitimate commit that merely describes merge logic', () => {
    expect(gate(message('feat: merge two resolvers')).code).toBe(0);
    expect(gate(`feat: merge two resolvers\n`).code).toBe(1);
  });

  it.each(['fixup! feat: do a thing', 'squash! feat: do a thing'])('bypasses the gate for %s', (header) => {
    expect(gate(`${header}\n`).code).toBe(0);
  });

  it('honours the merge probe override when it points at an existing file', () => {
    const merging = createRepo();
    const probe = join(merging, 'pretend-merge-head');
    writeFileSync(probe, 'deadbeef\n');
    expect(gate('Merge branch nonsense\n', { COMMIT_MSG_GATE_MERGE_HEAD: probe }).code).toBe(0);
  });

  it('judges the message when the merge probe override points at nothing', () => {
    expect(gate('Merge branch nonsense\n', { COMMIT_MSG_GATE_MERGE_HEAD: '/nonexistent/MERGE_HEAD' }).code).toBe(1);
  });
});

/**
 * What `git commit` (editor path, `--verbose`) actually hands the hook: the
 * message, then the comment template, then a scissors line and the full diff.
 */
const EDITOR_NOISE = (commentChar: string): string =>
  [
    `${commentChar} Please enter the commit message for your changes.`,
    `${commentChar}`,
    `${commentChar} On branch main`,
    `${commentChar} ------------------------ >8 ------------------------`,
    `${commentChar} Do not modify or remove the line above.`,
    'diff --git a/f.txt b/f.txt',
    '@@ -1 +1,2 @@',
    ' hi',
    '+more',
    '',
  ].join('\n');

describe('the real hook input', () => {
  it('accepts a compliant message buried in the editor template and diff', () => {
    expect(gate(`${message('feat: do a thing')}\n${EDITOR_NOISE('#')}`).code).toBe(0);
  });

  it('still rejects a non-compliant message buried in the editor template and diff', () => {
    expect(gate(`feat: do a thing\n\n${EDITOR_NOISE('#')}`).code).toBe(1);
  });

  it('warns that default core.commentChar will strip the H3 headings after the hook passes', () => {
    const result = gate(`${message('feat: do a thing')}\n${EDITOR_NOISE('#')}`);
    expect(result.code).toBe(0);
    expect(result.output).toContain('core.commentChar');
  });

  it('stays quiet when core.commentChar keeps the H3 headings intact', () => {
    const configured = createRepo({ 'core.commentChar': ';' });
    const result = runGate(`${message('feat: do a thing')}\n${EDITOR_NOISE(';')}`, { cwd: configured });
    expect(result.code).toBe(0);
    expect(result.output).not.toContain('core.commentChar');
  });

  it('does not warn on the -m path, where no comment template is present', () => {
    expect(gate(message('feat: do a thing')).output).not.toContain('core.commentChar');
  });

  it('does not drown its explanation in the comment template it was handed', () => {
    const result = gate(`feat: do a thing\n\n### Unreleased\n1. Thing.\n\n${EDITOR_NOISE('#')}`);
    expect(result.code).toBe(1);
    expect(result.output).not.toContain('Please enter the commit message');
    expect(result.output).toContain('### Unreleased');
  });

  it('judges a CRLF message on its content', () => {
    expect(gate(message('feat: do a thing').replace(/\n/g, '\r\n')).code).toBe(0);
  });
});

describe('invocation', () => {
  it('fails with an explanation when given no argument', () => {
    const result = runScript(GATE, [], { cwd: repo });
    expect(result.code).toBe(1);
    expect(result.output).toContain('✖');
  });

  it('fails with an explanation when the message file is missing', () => {
    const result = runScript(GATE, ['/nonexistent/COMMIT_EDITMSG'], { cwd: repo });
    expect(result.code).toBe(1);
    expect(result.output).toContain('✖');
  });

  // The gate is the whole scripts/ directory. An install that took only the entry
  // file must say so rather than emit a bare "not found" from a failed source.
  it('explains itself when lib/ did not come along', () => {
    const orphan = createDir();
    cpSync(GATE, join(orphan, 'commit-msg'));
    writeFileSync(join(orphan, 'msg'), message('feat: do a thing'));
    const result = runScript(join(orphan, 'commit-msg'), [join(orphan, 'msg')], { cwd: repo });
    expect(result.code).toBe(1);
    expect(result.output).toContain('incomplete');
  });

  it('is directly executable, not only sourceable', () => {
    const result = spawnSync(GATE, ['/nonexistent/COMMIT_EDITMSG'], { cwd: repo, encoding: 'utf8' });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
  });
});

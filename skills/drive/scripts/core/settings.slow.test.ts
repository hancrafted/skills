import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { settingMentions, unknownSettings } from './settings.pure.ts';

const SKILL = path.resolve(import.meta.dirname, '../..');
const KNOWN_MENTIONS = ['grill.format', 'worktree.install', 'phases.<phase>.model'];

function markdownIn(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : markdownIn(full);
    return entry.name.endsWith('.md') ? [full] : [];
  });
}

const readAll = () => markdownIn(SKILL).map((file) => ({ file, text: readFileSync(file, 'utf8') }));

describe('success cases', () => {
  it('knows every setting name drive markdown mentions, and finds the names it should', () => {
    // ARRANGE
    const texts = readAll();

    // ACT
    const mentioned = new Set(texts.flatMap(({ text }) => settingMentions(text)));
    const unknown = texts.flatMap(({ file, text }) =>
      unknownSettings(text).map((name) => `${path.relative(SKILL, file)}: ${name}`),
    );

    // ASSERT
    expect(KNOWN_MENTIONS.filter((name) => !mentioned.has(name))).toEqual([]);
    expect(unknown).toEqual([]);
  });
});

describe('failure cases', () => {
  it('reports a name planted in the text of a real skill file', () => {
    // ARRANGE
    const [first] = readAll();
    const planted = `${first?.text ?? ''}\n\`worktree.nope\`\n`;

    // ACT
    const unknown = unknownSettings(planted);

    // ASSERT
    expect(unknown).toEqual(['worktree.nope']);
  });
});

describe('edge cases', () => {
  it('scans the nested references as well as SKILL.md', () => {
    // ARRANGE
    const scanned = markdownIn(SKILL).map((file) => path.relative(SKILL, file));

    // ACT
    const kinds = ['SKILL.md', path.join('references', 'setup.md')].filter((name) => scanned.includes(name));

    // ASSERT
    expect(kinds).toEqual(['SKILL.md', path.join('references', 'setup.md')]);
  });
});

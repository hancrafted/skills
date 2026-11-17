import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import { UNIT_SUFFIX_DENYLIST } from './unit-suffixes.ts';

const UNIT_MESSAGE = 'abbreviates a unit';

const AREAS = ['tests/probe.ts', 'tools/probe/probe.ts', 'skills/probe/scripts/probe.ts'];

const FULL_WORDS = [
  'Milliseconds',
  'Seconds',
  'Minutes',
  'Hours',
  'Pixels',
  'Percent',
  'Degrees',
  'Bytes',
  'Frames',
  'Words',
  'Lines',
  'Ratio',
  'Count',
  'Rem',
  'Em',
  'Vh',
  'Vw',
];

const casingsOf = (abbreviation: string) => [
  `fadeDuration${abbreviation}`,
  `fadeDuration${abbreviation.toUpperCase()}`,
  `FADE_DURATION_${abbreviation.toUpperCase()}`,
  `fade_duration_${abbreviation.toLowerCase()}`,
];

const DECLARATION_FORMS = [
  (name: string) => `export const ${name} = 1;\n`,
  (name: string) => `export function probe(${name}: number) { return ${name}; }\n`,
  (name: string) => `export const probe = ({ ${name} }: { [k: string]: number }) => ${name};\n`,
  (name: string) => `export const probe = { ${name}: 1 };\n`,
  (name: string) => `export interface Probe { ${name}: number }\n`,
  (name: string) => `export function ${name}() { return 1; }\n`,
];

const eslint = new ESLint({ cwd: import.meta.dirname + '/../..' });

async function unitMessagesOf(source: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(source, { filePath });
  return result.messages
    .filter((m) => m.ruleId === 'no-restricted-syntax' && m.message.includes(UNIT_MESSAGE))
    .map((m) => m.message);
}

describe('success cases', () => {
  it('passes every full unit word in every casing', async () => {
    // ARRANGE
    const names = FULL_WORDS.flatMap((word) => [
      `fadeDuration${word}`,
      `FADE_DURATION_${word.toUpperCase()}`,
      `fade_duration_${word.toLowerCase()}`,
    ]);
    const source = names.map((name) => `export const ${name} = 1;\n`).join('');
    const expected: string[] = [];
    // ACT
    const messages = await unitMessagesOf(source, 'tools/probe/full-words.ts');
    // ASSERT
    expect(messages).toEqual(expected);
  });

  it('passes words that merely end in the letters of an abbreviation', async () => {
    // ARRANGE
    const names = ['items', 'ALARMS', 'xMidYMin', 'admin', 'ADMIN', 'spec', 'codec', 'pattern', 'rhythmHz2'];
    const source = names.map((name) => `export const ${name} = 1;\n`).join('');
    const expected: string[] = [];
    // ACT
    const messages = await unitMessagesOf(source, 'tools/probe/near-misses.ts');
    // ASSERT
    expect(messages).toEqual(expected);
  });

  it('passes a property read from a third-party API and its renamed destructuring', async () => {
    // ARRANGE
    const source = [
      "import { library } from 'third-party';",
      'export const fadeDurationMilliseconds = library.durationMs;',
      'export const { offsetPx: offsetPixels } = library;',
      'library.timing.delayMs = 3;',
      '',
    ].join('\n');
    const expected: string[] = [];
    // ACT
    const messages = await unitMessagesOf(source, 'tools/probe/third-party.ts');
    // ASSERT
    expect(messages).toEqual(expected);
  });
});

describe('failure cases', () => {
  it('names the full word for every denylisted abbreviation in every casing', async () => {
    // ARRANGE
    const cases = Object.entries(UNIT_SUFFIX_DENYLIST).flatMap(([abbreviation, fullWord]) =>
      casingsOf(abbreviation).map((name) => ({ fullWord, name })),
    );
    const expected = cases.map(({ fullWord }) => [expect.stringContaining(fullWord)]);
    // ACT
    const messages = await Promise.all(
      cases.map(({ name }) => unitMessagesOf(`export const ${name} = 1;\n`, 'tools/probe/casing.ts')),
    );
    // ASSERT
    expect(messages).toEqual(expected);
  });

  it('refuses an abbreviated suffix in every declaration form', async () => {
    // ARRANGE
    const expected = DECLARATION_FORMS.map(() => [expect.stringContaining('Milliseconds')]);
    // ACT
    const messages = await Promise.all(
      DECLARATION_FORMS.map((declare) => unitMessagesOf(declare('fadeDurationMs'), 'tools/probe/form.ts')),
    );
    // ASSERT
    expect(messages).toEqual(expected);
  });

  it('refuses an abbreviated suffix in every governed area', async () => {
    // ARRANGE
    const expected = AREAS.map(() => [expect.stringContaining('Pixels')]);
    // ACT
    const messages = await Promise.all(AREAS.map((area) => unitMessagesOf('export const gapPx = 1;\n', area)));
    // ASSERT
    expect(messages).toEqual(expected);
  });
});

describe('edge cases', () => {
  it('leaves a file outside the governed areas alone', async () => {
    // ARRANGE
    const expected: string[] = [];
    // ACT
    const messages = await unitMessagesOf('export const gapPx = 1;\n', 'docs/probe.ts');
    // ASSERT
    expect(messages).toEqual(expected);
  });

  it('names exactly the eight abbreviations the ADR lists', () => {
    // ARRANGE
    const expected = ['Ms', 'Sec', 'Min', 'Px', 'Pct', 'Deg', 'Hz', 'Fps'];
    // ACT
    const denylisted = Object.keys(UNIT_SUFFIX_DENYLIST);
    // ASSERT
    expect(denylisted).toEqual(expected);
  });
});

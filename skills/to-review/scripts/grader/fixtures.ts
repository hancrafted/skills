// Reads the fixture set beside the grader: valid pages in fixtures/, one-defect records in fixtures/broken/.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Asked } from './check.ts';
import { applyDefect, type Defect } from './fixtures.pure.ts';

export const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures');
const BROKEN = path.join(FIXTURES, 'broken');

/** What every fixture's caller asked for: each valid page builds every item at the diagram rung. */
export const FIXTURE_ASKED: Asked = { fidelity: 'diagram' };

/** Every fixture name: `valid-<mode>` pages, then `<check-id>--<defect>` records. */
export function fixtureNames(): string[] {
  const valid = readdirSync(FIXTURES).filter((file) => /^valid-.+\.html$/.test(file));
  const broken = readdirSync(BROKEN).filter((file) => file.endsWith('.json'));
  return [...valid.map((file) => file.replace(/\.html$/, '')), ...broken.map((file) => file.replace(/\.json$/, ''))];
}

/** A broken fixture's defect record. */
export function readDefect(name: string): Defect {
  return JSON.parse(readFileSync(path.join(BROKEN, `${name}.json`), 'utf8')) as Defect;
}

/** The fixture's HTML: a valid page as stored, a broken one as its base with the defect applied. */
export function fixturePage(name: string): string {
  if (name.startsWith('valid-')) return readFileSync(path.join(FIXTURES, `${name}.html`), 'utf8');
  const defect = readDefect(name);
  return applyDefect(readFileSync(path.join(FIXTURES, defect.base), 'utf8'), defect);
}

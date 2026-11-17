import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Asked } from './check.ts';
import { applyDefect, type Defect } from './fixtures.pure.ts';

export const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures');
const BROKEN = path.join(FIXTURES, 'broken');

export const FIXTURE_ASKED: Asked = { fidelity: 'diagram' };

export function fixtureNames(): string[] {
  const valid = readdirSync(FIXTURES).filter((file) => /^valid-.+\.html$/.test(file));
  const broken = readdirSync(BROKEN).filter((file) => file.endsWith('.json'));
  return [...valid.map((file) => file.replace(/\.html$/, '')), ...broken.map((file) => file.replace(/\.json$/, ''))];
}

export function readDefect(name: string): Defect {
  return JSON.parse(readFileSync(path.join(BROKEN, `${name}.json`), 'utf8')) as Defect;
}

export function fixturePage(name: string): string {
  if (name.startsWith('valid-')) return readFileSync(path.join(FIXTURES, `${name}.html`), 'utf8');
  const defect = readDefect(name);
  return applyDefect(readFileSync(path.join(FIXTURES, defect.base), 'utf8'), defect);
}

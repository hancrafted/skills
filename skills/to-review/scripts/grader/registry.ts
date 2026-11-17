import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Check } from './check.ts';

const CHECKS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../checks');

export function checkFiles(): string[] {
  return readdirSync(CHECKS)
    .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))
    .sort();
}

export async function loadChecks(): Promise<Check[]> {
  const checks: Check[] = [];
  for (const file of checkFiles()) {
    const { check } = (await import(pathToFileURL(path.join(CHECKS, file)).href)) as { check?: Check };
    const id = file.replace(/\.ts$/, '');
    if (check?.id !== id) throw new Error(`checks/${file} must export \`check\` with id "${id}"`);
    checks.push(check);
  }
  return checks;
}

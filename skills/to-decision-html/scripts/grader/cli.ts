// The grade commands' command line: exactly one path, which exists. Anything else prints the usage and exits 2.
import { existsSync } from 'node:fs';

export function onePath(usage: string): string {
  const [target, ...extra] = process.argv.slice(2);
  if (target === undefined || extra.length > 0 || !existsSync(target)) {
    console.error(`usage: ${usage}`);
    process.exit(2);
  }
  return target;
}

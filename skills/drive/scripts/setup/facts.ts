import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { CATALOG, harnessCapFrom, run } from '../core/index.ts';
import {
  decisionDocGlobs,
  detectPackageManager,
  type EnforcerFacts,
  installCommands,
  type ProjectFacts,
} from './setup.pure.ts';

const read = (file: string): string | null => {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return null;
  }
};

const isFolder = (dir: string): boolean => {
  try {
    return statSync(dir).isDirectory();
  } catch {
    return false;
  }
};

function scriptsOfPackageJson(root: string): Record<string, string> {
  try {
    const manifest = JSON.parse(read(path.join(root, 'package.json')) ?? '{}') as { scripts?: Record<string, string> };
    return manifest.scripts ?? {};
  } catch {
    return {};
  }
}

export function enforcerFacts(root: string): EnforcerFacts {
  const scripts = scriptsOfPackageJson(root);
  const hooks = ['.husky', '.githooks'].flatMap((dir) => {
    try {
      return readdirSync(path.join(root, dir), { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => `${dir}/${entry.name}`);
    } catch {
      return [];
    }
  });
  return {
    scripts,
    packageManager: detectPackageManager(readdirSync(root)),
    hooks,
    adrChecker: existsSync(path.join(root, '.archgate', 'adrs')),
  };
}

function hasGlossary(dir: string, depth = 0): boolean {
  if (depth > 4) return false;
  return readdirSync(dir, { withFileTypes: true }).some((entry) => {
    if (entry.isDirectory())
      return (
        !entry.name.startsWith('.') &&
        entry.name !== 'node_modules' &&
        hasGlossary(path.join(dir, entry.name), depth + 1)
      );
    return entry.name.startsWith('GLOSSARY') && entry.name.endsWith('.md');
  });
}

function baseBranch(root: string): string {
  const head = run('git', ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], { cwd: root });
  return head.status === 0 ? head.stdout.trim().replace(/^origin\//, '') : 'main';
}

export function projectFacts(root: string, entry: string): ProjectFacts {
  const folders = CATALOG.decisionFolders.filter((folder) => isFolder(path.join(root, folder)));
  return {
    baseBranch: baseBranch(root),
    harnessCap: harnessCapFrom(process.env),
    install: installCommands(readdirSync(root)),
    driveEntry: entry,
    decisionDocs: decisionDocGlobs(folders, hasGlossary(root)),
  };
}

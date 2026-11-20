import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { bumpRepo, cacheDirOf, checkoutsAt, existsAtPin, linkIntoWorktree, syncRepo } from './git-cache.ts';
import { indexPathsOf, isUnder, parseIndex, replaceCommits } from './references.pure.ts';

const INDEX_PATH = 'docs/agents/reference-repos.md';
const SHORT_COMMIT_LENGTH = 7;

const flags = process.argv.slice(2);
const checkouts = checkoutsAt(process.cwd());
const indexFile = path.join(checkouts.current, INDEX_PATH);
const indexText = readFileSync(indexFile, 'utf8');
const pins = parseIndex(indexText);

linkIntoWorktree(checkouts);
for (const pin of pins) {
  syncRepo(checkouts.main, pin);
  console.log(`${pin.name}@${pin.commit.slice(0, SHORT_COMMIT_LENGTH)} ready`);
}

let currentText = indexText;
if (flags.includes('--bump')) {
  const bumped: Record<string, string> = {};
  for (const pin of pins) {
    const result = bumpRepo(checkouts.main, pin);
    if (result.commit === pin.commit) {
      console.log(`${pin.name}: unchanged at ${pin.commit.slice(0, SHORT_COMMIT_LENGTH)}`);
      continue;
    }
    bumped[pin.name] = result.commit;
    console.log(
      `${pin.name}: ${pin.commit.slice(0, SHORT_COMMIT_LENGTH)} -> ${result.commit.slice(0, SHORT_COMMIT_LENGTH)}`,
    );
    console.log(result.stat);
    console.log(`added: ${result.added.join(', ') || 'none'}`);
    console.log(`removed: ${result.removed.join(', ') || 'none'}`);
  }
  currentText = replaceCommits(indexText, bumped);
  writeFileSync(indexFile, currentText);
}

if (flags.includes('--check') || flags.includes('--bump')) {
  const currentPins = new Map(parseIndex(currentText).map((pin) => [pin.name, pin]));
  const missing = indexPathsOf(currentText)
    .filter(({ name, path: relativePath }) => {
      const pin = currentPins.get(name);
      if (pin?.subfolder && !isUnder(relativePath, pin.subfolder)) return true;
      return !pin || !existsAtPin(cacheDirOf(checkouts.main, name), pin.commit, relativePath);
    })
    .map(({ name, path: relativePath }) => `${name}/${relativePath}`);
  if (missing.length > 0) {
    console.error(`index paths missing at their pin:\n${missing.map((entry) => `  ${entry}`).join('\n')}`);
    process.exit(1);
  }
  console.log('index paths all exist at their pins');
}

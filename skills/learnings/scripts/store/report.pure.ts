import type { Command } from './args.pure.ts';
import type { Store } from './learnings.pure.ts';
import type { Gh } from './process.ts';

export interface LoadedStore extends Store {
  errors: string[];
}

export interface Report {
  output: string;
  exit: 0 | 1;
}

export interface Ports {
  gh: Gh;
  today: string;
}

export interface Context {
  root: string;
  store: LoadedStore;
  command: Command;
  ports: Ports;
}

export const failed = (problems: readonly string[]): Report => ({
  output: problems.map((problem) => `✖ ${problem}`).join('\n'),
  exit: 1,
});

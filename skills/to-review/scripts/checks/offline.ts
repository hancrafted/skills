import { load } from 'cheerio';
import type { Check } from '../grader/check.ts';

interface Observation {
  readonly partial: boolean;
  readonly requests: readonly string[];
}

const JSDELIVR_MERMAID = /^https:\/\/cdn\.jsdelivr\.net\/npm\/mermaid@/;
const PINNED_MERMAID = /^https:\/\/cdn\.jsdelivr\.net\/npm\/mermaid@\d+\.\d+\.\d+\//;

function problemOf(url: string, partial: boolean): string | null {
  if (!JSDELIVR_MERMAID.test(url)) return `requested ${url}; a decision page loads nothing from outside itself`;
  if (!partial) return `requested ${url}; Mermaid from jsDelivr needs <html data-offline="partial">`;
  if (!PINNED_MERMAID.test(url)) return `requested ${url}; pin Mermaid to an exact version such as mermaid@11.4.1`;
  return null;
}

export const check: Check<Observation> = {
  id: 'offline',
  summary:
    'With networking blocked the page requests nothing outside itself, except pinned jsDelivr Mermaid on a page marked partial.',
  observe: (loaded) => ({
    partial: load(loaded.html)('html').attr('data-offline') === 'partial',
    requests: loaded.requests,
  }),
  judge: ({ partial, requests }) =>
    requests.map((url) => problemOf(url, partial)).filter((problem): problem is string => problem !== null),
};

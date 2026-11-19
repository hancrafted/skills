import type { FailureMode } from './learnings.pure.ts';

export interface SimilarTitle {
  slug: string;
  title: string;
  score: number;
}

const SIMILAR_TITLES_SHOWN = 3;
const STOP_WORDS = new Set(
  'a an and are as at be by did do does for from has in is it its not of on or that the this to was were when with'.split(
    ' ',
  ),
);

const wordsOf = (text: string): Set<string> =>
  new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word !== '' && !STOP_WORDS.has(word)),
  );

const SCORE_PRECISION = 100;

function wordOverlapRatio(left: Set<string>, right: Set<string>): number {
  const shared = [...left].filter((word) => right.has(word)).length;
  const union = left.size + right.size - shared;
  return union === 0 ? 0 : Math.round((shared / union) * SCORE_PRECISION) / SCORE_PRECISION;
}

export function similarTitles(text: string, modes: readonly FailureMode[]): SimilarTitle[] {
  const wanted = wordsOf(text);
  return modes
    .map(({ slug, title }) => ({ slug, title, score: wordOverlapRatio(wanted, wordsOf(title)) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.slug.localeCompare(right.slug))
    .slice(0, SIMILAR_TITLES_SHOWN);
}

export const renderSimilar = (matches: readonly SimilarTitle[]): string =>
  matches.map(({ slug, title, score }) => `${score.toFixed(2)}  ${slug}  ${title}`).join('\n');

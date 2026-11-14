// The page opens with a banner header: the <h1> and a sentence saying what the page is for. A <header> inside
// sectioning content belongs to that section, so it is no banner.
import { load, type CheerioAPI } from 'cheerio';
import type { Check } from '../grader/check.ts';

const NOT_BANNER = 'article, aside, main, nav, section';
/** The fewest words that read as a sentence of purpose rather than a label. */
const PURPOSE_WORDS = 4;

function banner($: CheerioAPI) {
  const role = $('[role="banner"]').first();
  if (role.length > 0) return role;
  return $('header')
    .filter((_, header) => $(header).closest(NOT_BANNER).length === 0)
    .first();
}

export const check: Check<string> = {
  id: 'header',
  summary: 'A banner header at the top holds the <h1> and a sentence saying what the page is for.',
  observe: (loaded) => loaded.html,
  judge(html) {
    const $ = load(html);
    const header = banner($);
    if (header.length === 0)
      return ['the page has no banner <header>; put the <h1> and a sentence of purpose in a <header> at the top'];
    if (header.find('h1').length === 0) return ['the header holds no <h1>; title the page there'];
    const purpose = header.clone();
    purpose.find('h1, h2, h3, h4, h5, h6, script, style').remove();
    const words = purpose.text().split(/\s+/).filter(Boolean).length;
    return words >= PURPOSE_WORDS
      ? []
      : ['the header states no purpose; add a sentence beside the <h1> saying what the page is for'];
  },
};

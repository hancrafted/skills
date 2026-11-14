// Every field and button has an accessible name, so a screen reader announces what each one is for. Fields take
// it from a <label>, aria-label, aria-labelledby or title; buttons from their text as well.
import { load, type CheerioAPI } from 'cheerio';
import type { Check } from '../grader/check.ts';

const FIELDS = 'input, select, textarea';
const BUTTONS = 'button, input[type="button"], input[type="submit"], input[type="reset"]';

const elements = ($: CheerioAPI, selector: string) => $(selector).toArray();
type Element = ReturnType<typeof elements>[number];

const textOf = ($: CheerioAPI, element: Element): string => $(element).text().trim();

function hiddenFromEveryone($: CheerioAPI, element: Element): boolean {
  return $(element).attr('type') === 'hidden' || $(element).closest('[hidden], [aria-hidden="true"]').length > 0;
}

function hasAriaName($: CheerioAPI, element: Element): boolean {
  const labelledBy = ($(element).attr('aria-labelledby') ?? '').split(/\s+/).filter(Boolean);
  const referenced = labelledBy.map((id) => $(`[id="${id}"]`)).some((ref) => ref.length > 0 && ref.text().trim());
  return Boolean($(element).attr('aria-label')?.trim() || $(element).attr('title')?.trim() || referenced);
}

function hasLabel($: CheerioAPI, element: Element): boolean {
  const id = $(element).attr('id');
  const forLabel = id ? $(`label[for="${id}"]`).toArray() : [];
  return [...forLabel, ...$(element).closest('label').toArray()].some((label) => textOf($, label) !== '');
}

function isButton($: CheerioAPI, element: Element): boolean {
  return $(element).is(BUTTONS);
}

function named($: CheerioAPI, element: Element): boolean {
  if (hasAriaName($, element)) return true;
  if (isButton($, element)) return textOf($, element) !== '' || Boolean($(element).attr('value')?.trim());
  return hasLabel($, element);
}

const ordinal = (n: number): string => {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${suffix}`;
};

/** A reader can find the element from this: its id, else its name, else its position among its tag. */
function describe($: CheerioAPI, element: Element): string {
  const tag = String($(element).prop('tagName')).toLowerCase();
  const id = $(element).attr('id');
  if (id) return `${tag}#${id}`;
  const name = $(element).attr('name');
  if (name) return `${tag}[name="${name}"]`;
  return `${tag} (${ordinal(elements($, tag).indexOf(element) + 1)})`;
}

function problemOf($: CheerioAPI, element: Element): string {
  const fix = isButton($, element)
    ? 'give it visible text or aria-label'
    : 'tie a <label for> to it or give it aria-label';
  return `${describe($, element)} has no accessible name; ${fix}`;
}

export const check: Check<string> = {
  id: 'labelled-fields',
  summary: 'Every field and button has an accessible name: a label, visible text, aria-label or aria-labelledby.',
  observe: (loaded) => loaded.html,
  judge(html) {
    const $ = load(html);
    return elements($, `${FIELDS}, button`)
      .filter((element) => !hiddenFromEveryone($, element) && !named($, element))
      .map((element) => problemOf($, element));
  },
};

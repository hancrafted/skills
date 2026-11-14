// The page contract's data- attributes, read from the rendered DOM: identity, revision and mode on <html>, fidelity
// and depth on each item, a recommendation flag on each Option, a name on each Mermaid source.
import { load, type CheerioAPI } from 'cheerio';
import { DEPTHS, FIDELITY_RUNGS, MODES, type Check } from '../grader/check.ts';

/** A cheerio selection of DOM elements. */
type Selection = ReturnType<CheerioAPI>;

/** One attribute of one element, with the words a problem uses to point at it. */
interface Field {
  readonly subject: string;
  readonly name: string;
  readonly value: string | undefined;
}

const field = (subject: string, element: Selection, name: string): Field => ({
  subject,
  name,
  value: element.attr(name),
});

const shown = (value: string | undefined): string => (value === undefined ? 'missing' : `"${value}"`);

function oneOf({ subject, name, value }: Field, allowed: readonly string[]): string[] {
  if (value !== undefined && allowed.includes(value)) return [];
  return [`${subject} ${name} is ${shown(value)}; expected one of ${allowed.join(', ')}`];
}

function matching({ subject, name, value }: Field, [pattern, expected]: [RegExp, string]): string[] {
  return value !== undefined && pattern.test(value)
    ? []
    : [`${subject} ${name} is ${shown(value)}; expected ${expected}`];
}

function duplicates(ids: string[], what: string): string[] {
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts].filter(([, count]) => count > 1).map(([id, count]) => `${what} "${id}" is used ${count} times`);
}

function rootProblems($: CheerioAPI): string[] {
  const root = $('html');
  const offline = field('<html>', root, 'data-offline');
  return [
    ...matching(field('<html>', root, 'data-page-id'), [
      /^[a-z0-9][a-z0-9-]*$/,
      'a lowercase slug such as cache-layer',
    ]),
    ...matching(field('<html>', root, 'data-revision'), [/^[1-9]\d*$/, 'a positive integer such as 1']),
    ...oneOf(field('<html>', root, 'data-mode'), MODES),
    ...(offline.value === undefined ? [] : oneOf(offline, ['partial'])),
  ];
}

function optionProblems(item: Selection): string[] {
  const id = item.attr('data-item');
  const options = item.find('[data-option]');
  const ids = options.toArray().map((option) => option.attribs['data-option']);
  return [
    ...duplicates(ids, 'option id').map((problem) => `${problem} in item "${id}"`),
    ...ids.flatMap((optionId, index) =>
      oneOf(field(`option "${optionId}" in item "${id}":`, options.eq(index), 'data-recommended'), ['true', 'false']),
    ),
  ];
}

function itemProblems($: CheerioAPI): string[] {
  const items = $('[data-item]').toArray();
  if (items.length === 0) return ['the page has no [data-item]'];
  return [
    ...duplicates(
      items.map((item) => item.attribs['data-item']),
      'item id',
    ),
    ...items.flatMap((element) => {
      const item = $(element);
      const subject = `item "${item.attr('data-item')}":`;
      return [
        ...oneOf(field(subject, item, 'data-fidelity'), FIDELITY_RUNGS),
        ...oneOf(field(subject, item, 'data-depth'), DEPTHS),
        ...optionProblems(item),
      ];
    }),
  ];
}

function looseProblems($: CheerioAPI): string[] {
  const outside = $('[data-option]')
    .toArray()
    .filter((option) => $(option).closest('[data-item]').length === 0)
    .map((option) => `option "${option.attribs['data-option']}" sits outside every [data-item]`);
  const diagrams = $('script[type="text/x-mermaid"]')
    .toArray()
    .map((diagram) => diagram.attribs['data-diagram']);
  return [
    ...outside,
    ...diagrams.filter((name) => !name).map(() => 'a <script type="text/x-mermaid"> has no data-diagram'),
    ...duplicates(diagrams.filter(Boolean), 'diagram id'),
  ];
}

export const check: Check<string> = {
  id: 'page-attributes',
  summary: 'The page carries the data- attribute contract on <html>, every item, Option and Mermaid source.',
  observe: (loaded) => loaded.html,
  judge(html) {
    const $ = load(html);
    return [...rootProblems($), ...itemProblems($), ...looseProblems($)];
  },
};

// Broken fixtures are recorded as one defect against a valid page, never as a copied page: when the valid page
// grows to pass a new check, every broken fixture grows with it and keeps exactly one defect.

/** `fixtures/broken/<check-id>--<defect>.json`. */
export interface Defect {
  /** The valid page it breaks, a file in fixtures/. */
  readonly base: string;
  /** One sentence naming the defect. */
  readonly defect: string;
  /** Text replacements applied in order; each `find` occurs exactly once in the page at that point. */
  readonly replace: readonly { readonly find: string; readonly with: string }[];
}

const occurrences = (text: string, part: string): number => text.split(part).length - 1;

/** The base page with the defect applied; throws when a `find` does not occur exactly once. */
export function applyDefect(base: string, defect: Defect): string {
  let page = base;
  for (const { find, with: replacement } of defect.replace) {
    const count = occurrences(page, find);
    if (count !== 1) throw new Error(`"${find}" occurs ${count} times in ${defect.base}; it must occur once`);
    page = page.replace(find, () => replacement);
  }
  return page;
}

/** The check a fixture proves: `<check-id>--<defect>` names it; a `valid-<mode>` page proves none. */
export function checkOfFixture(name: string): string | null {
  if (name.startsWith('valid-')) return null;
  return name.split('--')[0];
}

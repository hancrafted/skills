// How a browser check names an element in a problem, so the page's author can find it: the facts are read in the
// page, the wording is made here.

/** What a check reads about an element in the page to name it. */
export interface ElementFacts {
  readonly tag: string;
  /** The element's id, or '' when it has none. */
  readonly id: string;
  /** The `data-item` of the item it sits in, or null outside any item. */
  readonly item: string | null;
  readonly text: string;
}

const SNIPPET = 32;

function snippet(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > SNIPPET ? `${flat.slice(0, SNIPPET).trimEnd()}…` : flat;
}

/** `textarea#c-store in item "store"`, or `p "Its first words…"` when the element has no id. */
export function describeElement({ tag, id, item, text }: ElementFacts): string {
  const name = id ? `${tag}#${id}` : `${tag} "${snippet(text)}"`;
  return item === null ? name : `${name} in item "${item}"`;
}

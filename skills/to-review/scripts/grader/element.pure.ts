export interface ElementFacts {
  readonly tag: string;
  readonly id: string;
  readonly item: string | null;
  readonly text: string;
}

const SNIPPET = 32;

function snippet(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > SNIPPET ? `${flat.slice(0, SNIPPET).trimEnd()}…` : flat;
}

export function describeElement({ tag, id, item, text }: ElementFacts): string {
  const name = id ? `${tag}#${id}` : `${tag} "${snippet(text)}"`;
  return item === null ? name : `${name} in item "${item}"`;
}

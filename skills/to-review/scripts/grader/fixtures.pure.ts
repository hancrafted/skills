export interface Defect {
  readonly base: string;
  readonly defect: string;
  readonly replace: readonly { readonly find: string; readonly with: string }[];
}

const occurrences = (text: string, part: string): number => text.split(part).length - 1;

export function applyDefect(base: string, defect: Defect): string {
  let page = base;
  for (const { find, with: replacement } of defect.replace) {
    const count = occurrences(page, find);
    if (count !== 1) throw new Error(`"${find}" occurs ${count} times in ${defect.base}; it must occur once`);
    page = page.replace(find, () => replacement);
  }
  return page;
}

export function checkOfFixture(name: string): string | null {
  if (name.startsWith('valid-')) return null;
  return name.split('--')[0];
}

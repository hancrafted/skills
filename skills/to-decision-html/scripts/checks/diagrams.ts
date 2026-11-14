// Every Mermaid diagram keeps its source in the page, word for word, so it can be copied into documentation, and
// its rendering sits beside it: an inline SVG on a fully offline page, or readable source on a page marked partial
// whose pinned Mermaid could not load.
import { load } from 'cheerio';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Check } from '../grader/check.ts';

interface Diagram {
  /** `data-diagram`. */
  readonly name: string;
  /** The source as written in the page file. */
  readonly written: string;
  /** The source in the DOM after scripts ran; null when a script removed it. */
  readonly live: string | null;
  /** The source's parent holds at least one inline SVG per Mermaid source in it. */
  readonly rendered: boolean;
  /** The source's parent shows the source as visible text. */
  readonly shown: boolean;
}

interface Observation {
  readonly partial: boolean;
  readonly diagrams: readonly Diagram[];
  /** The `aria-roledescription` of each Mermaid-rendered SVG with no source in its parent. */
  readonly unsourcedSvgs: readonly string[];
}

const SOURCE = 'script[type="text/x-mermaid"]';
const ENTITY = /&(?:[a-z][a-z0-9]*|#\d+|#x[0-9a-f]+);/i;
const UNTOUCHED = 'leave the <script type="text/x-mermaid"> untouched and render into another element';

/** Each Mermaid source's name and text, as `html` holds it. */
function sources(html: string): Map<string, string> {
  const $ = load(html);
  return new Map(
    $(SOURCE)
      .toArray()
      .map((script) => [script.attribs['data-diagram'] ?? '', $(script).text()]),
  );
}

/** Browser side: per source, whether its parent renders or shows it; and Mermaid SVGs whose parent has no source. */
function inPage(selector: string) {
  const normal = (text: string) => text.replace(/\s+/g, ' ').trim();
  const topLevelSvgs = (parent: Element) =>
    [...parent.querySelectorAll('svg')].filter((svg) => !svg.parentElement?.closest('svg'));
  const scripts = [...document.querySelectorAll<HTMLScriptElement>(selector)];
  const diagrams = scripts.map((script) => {
    const parent = script.parentElement ?? document.body;
    const siblings = parent.querySelectorAll(`:scope > ${selector}`).length;
    return {
      name: script.dataset.diagram ?? '',
      rendered: topLevelSvgs(parent).length >= siblings,
      shown: normal(parent.innerText).includes(normal(script.text)),
    };
  });
  const unsourcedSvgs = [...document.querySelectorAll('svg[aria-roledescription]')]
    .filter((svg) => !svg.parentElement?.closest('svg') && !svg.parentElement?.querySelector(`:scope > ${selector}`))
    .map((svg) => svg.getAttribute('aria-roledescription') ?? '');
  return { diagrams, unsourcedSvgs };
}

/** The source can be copied out of the page file as Mermaid reads it, and no script touched it. */
function sourceProblems(subject: string, { written, live }: Diagram): string[] {
  const entity = ENTITY.exec(written)?.[0];
  const escaped = entity
    ? [
        `${subject}: its source contains HTML entities such as ${entity}; a <script> keeps them literally, so write the Mermaid source unescaped`,
      ]
    : [];
  if (live === null) return [...escaped, `${subject}: its source was removed after load; ${UNTOUCHED}`];
  return live === written ? escaped : [...escaped, `${subject}: its source changed after load; ${UNTOUCHED}`];
}

/** Fully offline pages carry an SVG; partial pages show the source while Mermaid cannot load. */
function renderingProblems(subject: string, { rendered, shown }: Diagram, partial: boolean): string[] {
  if (rendered) return [];
  if (!partial)
    return [
      `${subject} has no inline SVG beside its source; pre-render it, or mark the page data-offline="partial" and load pinned Mermaid`,
    ];
  return shown
    ? []
    : [`${subject} shows neither an SVG nor its source offline; show the source as text until Mermaid renders it`];
}

function problemsOf(diagram: Diagram, partial: boolean): string[] {
  const subject = `diagram "${diagram.name}"`;
  if (diagram.written.trim() === '') return [`${subject} has an empty source`];
  return [...sourceProblems(subject, diagram), ...renderingProblems(subject, diagram, partial)];
}

export const check: Check<Observation> = {
  id: 'diagrams',
  summary:
    'Every Mermaid source stays in the page unchanged, with an inline SVG beside it, or readable source on a page marked partial.',
  async observe(loaded) {
    const written = sources(readFileSync(fileURLToPath(loaded.page.url()), 'utf8'));
    const live = sources(loaded.html);
    const { diagrams, unsourcedSvgs } = await loaded.page.evaluate(inPage, SOURCE);
    const byName = new Map(diagrams.map((diagram) => [diagram.name, diagram]));
    return {
      partial: load(loaded.html)('html').attr('data-offline') === 'partial',
      diagrams: [...written].map(([name, source]) => ({
        name,
        written: source,
        live: live.get(name) ?? null,
        rendered: byName.get(name)?.rendered ?? false,
        shown: byName.get(name)?.shown ?? false,
      })),
      unsourcedSvgs,
    };
  },
  judge: ({ partial, diagrams, unsourcedSvgs }) => [
    ...diagrams.flatMap((diagram) => problemsOf(diagram, partial)),
    ...unsourcedSvgs.map(
      (role) => `an SVG rendered by Mermaid (${role}) has no <script type="text/x-mermaid"> source beside it`,
    ),
  ],
};

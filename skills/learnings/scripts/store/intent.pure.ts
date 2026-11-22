export interface IntentSection {
  position: number;
  bullets: string[];
}

const INTENT_HEADING = 'Intent';
const INTENT_LABELS = ['**Turns:**', '**Moved:**', '**Outcome:**', '**Drift:**', '**Bets:**'] as const;

const hasLabel = (bullet: string): boolean => INTENT_LABELS.some((label) => bullet.startsWith(label));

export function intentProblems(recordPath: string, intents: readonly IntentSection[]): string[] {
  const where = `${recordPath}: ## ${INTENT_HEADING}`;
  const problems: string[] = [];
  if (intents.length > 1) problems.push(`${where} appears twice; keep one Intent section per record`);
  if (intents.some((section) => section.position > 0))
    problems.push(`${where} comes after a failure mode; place it first, right after the title`);
  if (intents.some((section) => !section.bullets.every(hasLabel)))
    problems.push(`${where} has a bullet that opens with none of ${INTENT_LABELS.join(', ')}`);
  return problems;
}

interface Section {
  text: string;
  lines: string[];
}

const bulletsOf = (lines: readonly string[]): string[] =>
  lines.filter((line) => line.startsWith('- ')).map((line) => line.slice(2).trim());

export function splitIntent(sections: readonly Section[]): {
  citations: { slug: string; bullets: string[] }[];
  intents: IntentSection[];
} {
  const isIntent = (section: Section): boolean => section.text === INTENT_HEADING;
  return {
    citations: sections
      .filter((s) => !isIntent(s))
      .map(({ text, lines }) => ({ slug: text, bullets: bulletsOf(lines) })),
    intents: sections.flatMap((section, index) =>
      isIntent(section)
        ? [{ position: sections.slice(0, index).filter((s) => !isIntent(s)).length, bullets: bulletsOf(section.lines) }]
        : [],
    ),
  };
}

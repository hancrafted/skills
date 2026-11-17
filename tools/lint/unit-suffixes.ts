export const NAMING_FILES = ['{tests,tools}/**/*.{ts,mts,js,mjs}', 'skills/*/scripts/**/*.{ts,mts,js,mjs}'];

export const UNIT_SUFFIX_DENYLIST = {
  Ms: 'Milliseconds',
  Sec: 'Seconds',
  Min: 'Minutes',
  Px: 'Pixels',
  Pct: 'Percent',
  Deg: 'Degrees',
  Hz: 'Hertz',
  Fps: 'FramesPerSecond',
} as const;

const DECLARED_IDENTIFIERS = [
  'VariableDeclarator > Identifier.id',
  ':function > Identifier.id',
  ':function > Identifier.params',
  'AssignmentPattern > Identifier.left',
  'ObjectPattern > Property > Identifier.value',
  'ArrayPattern > Identifier',
  'RestElement > Identifier.argument',
  'ObjectExpression > Property[shorthand=false] > Identifier.key',
  'PropertyDefinition > Identifier.key',
  'MethodDefinition > Identifier.key',
  'ClassDeclaration > Identifier.id',
  'TSPropertySignature > Identifier.key',
  'TSMethodSignature > Identifier.key',
  'TSInterfaceDeclaration > Identifier.id',
  'TSTypeAliasDeclaration > Identifier.id',
];

const suffixPattern = (abbreviation: string) => {
  const upper = abbreviation.toUpperCase();
  const lower = abbreviation.toLowerCase();
  return `/(?:[a-z0-9](?:${abbreviation}|${upper})|_(?:${lower}|${upper}|${abbreviation}))$/`;
};

export const UNIT_SUFFIXES = Object.entries(UNIT_SUFFIX_DENYLIST).map(([abbreviation, fullWord]) => ({
  selector: DECLARED_IDENTIFIERS.map((position) => `${position}[name=${suffixPattern(abbreviation)}]`).join(', '),
  message: `"${abbreviation}" abbreviates a unit: spell the unit in full as ${fullWord}, or name what the value is if it is not a unit (GEN-007).`,
}));

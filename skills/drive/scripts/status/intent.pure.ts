export type Mode = 'intent-first' | 'grill-first';

export type IntentState = 'confirmed' | 'unconfirmed' | 'missing';

export const STATUS_USAGE = [
  'usage: drive status <topic>',
  'It reads .scratch/<topic>/decisions.md for two markers:',
  '  Mode: intent-first|grill-first   a line of its own; absent means "mode missing"',
  '  ### Intent statement (confirmed <date>)   a heading; "(unconfirmed)" or no date means unconfirmed; no heading means missing',
].join('\n');

export function modeOf(text: string | null): Mode | null {
  const found = /^Mode:[ \t]*(intent-first|grill-first)[ \t]*$/m.exec(text ?? '');
  return found === null ? null : (found[1] as Mode);
}

export function intentStateOf(text: string | null): IntentState {
  const heading = /^#{1,6}[ \t]+Intent statement\b(.*)$/m.exec(text ?? '');
  if (heading === null) return 'missing';
  return /\(confirmed\b/.test(heading[1] ?? '') ? 'confirmed' : 'unconfirmed';
}

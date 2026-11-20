import { guardLineNote } from './setup.pure.ts';

export const SETTINGS_FILE = '.claude/settings.json';
const SUBAGENT_EVENTS = [
  ['SubagentStart', 'start'],
  ['SubagentStop', 'stop'],
] as const;

export const adapterCommand = (driveEntry: string, mode: 'start' | 'stop'): string =>
  `node "\${CLAUDE_PROJECT_DIR}/${driveEntry.split('/').slice(0, -1).concat('harness', 'claude', 'adapter.ts').join('/')}" ${mode}`;

export const adapterHookNote = (driveEntry: string): string =>
  guardLineNote(
    `the drive skill sits outside this repo, so ${SETTINGS_FILE} was left alone: add an async command hook to SubagentStart and SubagentStop`,
    `${adapterCommand(driveEntry, 'start')} / ${adapterCommand(driveEntry, 'stop')}`,
  );

interface HookGroup {
  hooks?: { command?: string }[];
}

export function addAdapterHooks(settings: string | null, driveEntry: string): { text: string } | { note: string } {
  let parsed: { hooks?: Record<string, HookGroup[]> };
  try {
    parsed = JSON.parse(settings ?? '{}');
  } catch {
    return { note: adapterHookNote(driveEntry) };
  }
  const hooks = (parsed.hooks ??= {});
  for (const [event, mode] of SUBAGENT_EVENTS) {
    const command = adapterCommand(driveEntry, mode);
    const groups = (hooks[event] ??= []);
    const wired = groups.some((group) => group.hooks?.some((hook) => hook.command === command));
    if (!wired) groups.push({ hooks: [{ type: 'command', command, async: true } as { command: string }] });
  }
  return { text: `${JSON.stringify(parsed, null, 2)}\n` };
}

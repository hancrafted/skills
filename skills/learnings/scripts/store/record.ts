import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { FAILURE_MODES_FOLDER, LEARNINGS_HOME, RECORDS_FOLDER, storeOf } from './learnings.pure.ts';
import { type Context, type Report } from './report.pure.ts';
import { addBullet, recordBullets, renderFailureMode, renderLearningsReadme, renderRecord } from './write.pure.ts';

const refused = (output: string): Report => ({ output: `✖ ${output}`, exit: 1 });

function write(file: string, text: string): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text);
}

function createFailureMode({ root, store, command }: Context, date: string): Report | null {
  const { failure = '', title, enforcer } = command.flags;
  if (store.modes.some((mode) => mode.slug === failure)) return null;
  if (title === undefined || enforcer === undefined)
    return refused(
      `no failure mode "${failure}": run learnings similar --skill ${store.skill}, or pass --title and --enforcer to create it`,
    );
  const file = path.join(root, storeOf(store.skill), FAILURE_MODES_FOLDER, `${failure}.md`);
  write(file, renderFailureMode({ title, enforcer, date }));
  return null;
}

function appendToRecord({ root, store, command }: Context, date: string): string {
  const { topic = '', failure = '' } = command.flags;
  const file = path.join(root, storeOf(store.skill), RECORDS_FOLDER, `${date}-${topic}.md`);
  let text = existsSync(file) ? readFileSync(file, 'utf8') : renderRecord({ topic, date });
  for (const bullet of recordBullets(command.flags)) text = addBullet(text, failure, bullet);
  write(file, text);
  return path.relative(root, file);
}

export function recordRun(context: Context): Report {
  const { flags } = context.command;
  const hasText = recordBullets(flags).length > 0;
  if (flags.topic === undefined || flags.failure === undefined || !hasText)
    return refused('record needs --topic, --failure and one of --evidence, --correction, --regressed');
  const date = flags.date ?? context.ports.today;
  const problem = createFailureMode(context, date);
  if (problem !== null) return problem;
  const file = appendToRecord(context, date);
  const readme = path.join(context.root, LEARNINGS_HOME, 'README.md');
  if (!existsSync(readme)) write(readme, renderLearningsReadme(date));
  return { output: `✔ recorded ${file}`, exit: 0 };
}

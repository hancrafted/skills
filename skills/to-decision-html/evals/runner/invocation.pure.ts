// The text a headless eval run receives in place of a person. It is the same for every arm except one line that
// names the skill copy, and it carries only operational facts (where to work, the page id, where feedback goes), so
// the frozen prompt stays the task.

interface Run {
  readonly caseId: string;
  /** File names copied beside prompt.md; calibration.md is among them. */
  readonly inputs: readonly string[];
  /** The run's workspace, absolute. */
  readonly dir: string;
  readonly withSkill: boolean;
}

export function invocation({ caseId, inputs, dir, withSkill }: Run): string {
  const attachments = inputs.filter((file) => file !== 'calibration.md');
  return [
    'This is a headless evaluation run: nobody can answer questions, and the run ends when you stop.',
    ...(withSkill
      ? ['Follow the skill in `skill/SKILL.md` for this task; its relative links resolve inside `skill/`.']
      : []),
    `The task is in \`prompt.md\`. Its attachments are in this folder: ${attachments.join(', ')}.`,
    '`calibration.md` holds the answers to anything you would ask before starting; use them instead of asking.',
    `Work only inside this folder, ${dir}: read and write files there and nowhere else.`,
    `Deliver one .html page in this folder. Its page id is \`${caseId}\`; feedback goes to ${dir}/feedback/.`,
    'Leave the page unopened, since no browser is watching; end by printing its path.',
  ].join('\n');
}

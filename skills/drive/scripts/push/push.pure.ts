const ABBREVIATED = 7;
const NOTHING_THERE = '0'.repeat(ABBREVIATED);

export function parseLsRemote(stdout: string): string | null {
  const [sha] = stdout.trim().split(/\s+/);
  return sha === undefined || sha === '' ? null : sha;
}

export function exitProblem(
  pushArgs: readonly string[],
  { status, signal }: { status: number | null; signal: string | null },
): string | null {
  if (status === 0) return null;
  const command = `git ${pushArgs.join(' ')}`;
  if (status !== null) return `${command} failed (${status})`;
  return `${command} failed (${signal === null ? 'no exit status' : `killed by ${signal}`})`;
}

export function remoteDiffersFrom(
  { branch, remote }: { branch: string; remote: string },
  head: string,
  onRemote: string | null,
): string | null {
  if (onRemote === null) return `${remote} has no ${branch} after the push, though git exited 0`;
  if (onRemote !== head) return `${remote}/${branch} is ${onRemote} but HEAD is ${head}; the push did not land`;
  return null;
}

export function pushedLine(branch: string, before: string | null, after: string): string {
  const abbreviate = (sha: string) => sha.slice(0, ABBREVIATED);
  return `✔ pushed ${branch} ${before === null ? NOTHING_THERE : abbreviate(before)}..${abbreviate(after)}`;
}

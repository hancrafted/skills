import { capture, run } from './git.ts';
import { fail } from './project.ts';
import { blockingProcs, describeProc, killable, lineage, parseLsof, type Proc } from './worktree-process.pure.ts';
import { signalProcess } from './worktree-signal.ts';

function processesIn(target: string): Proc[] {
  const { stdout: lsofStdoutWhateverItsExitCode } = run('lsof', ['-d', 'cwd', '-Fpcun']);
  const found = parseLsof(lsofStdoutWhateverItsExitCode, target);
  return blockingProcs(found, { uid: process.getuid?.() ?? -1, isAlive });
}

function protectedPids(): Set<number> {
  const parentOf = new Map<number, number>();
  for (const line of capture('ps', ['-axo', 'pid=,ppid=']).split('\n')) {
    if (line.trim() === '') continue;
    const [pid, ppid] = line.trim().split(/\s+/).map(Number);
    parentOf.set(pid, ppid);
  }
  return lineage(process.pid, parentOf);
}

const isAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

function killProcesses(procs: Proc[]): void {
  for (const proc of procs) signalProcess(proc.pid, 'SIGTERM');
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline && procs.some((p) => isAlive(p.pid))) run('sleep', ['0.1']);
  for (const proc of procs.filter((p) => isAlive(p.pid))) signalProcess(proc.pid, 'SIGKILL');
  for (const proc of procs) console.log(`✔ stopped ${describeProc(proc)}`);
}

export function insideWorktree(target: string): boolean {
  return (process.cwd() + '/').startsWith(target + '/');
}

export function refuseWhileBusyLastBeforeRemoval(target: string, kill: boolean): void {
  let busy = processesIn(target);
  if (kill && busy.length > 0) {
    killProcesses(killable(busy, protectedPids()));
    busy = processesIn(target);
  }
  if (busy.length > 0)
    fail(
      `still in use, stop these first (a dev server?) or rerun with --kill:\n  ${busy.map(describeProc).join('\n  ')}`,
    );
}

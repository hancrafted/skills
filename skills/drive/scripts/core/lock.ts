export interface Timing {
  pollMilliseconds: number;
  timeoutMilliseconds: number;
}

export type WithLock = <T>(
  name: string,
  options: Timing & { cwd?: string; onWait?: () => void },
  fn: () => T | Promise<T>,
) => Promise<T>;

export const noLock: WithLock = (_name, _options, fn) => Promise.resolve().then(fn);

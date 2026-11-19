export interface MergedPr {
  number: number;
  headRefOid: string;
}

export function parseMergedPrs(stdout: string): MergedPr[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (pr): pr is MergedPr =>
      typeof pr === 'object' && pr !== null && typeof pr.number === 'number' && typeof pr.headRefOid === 'string',
  );
}

export const mergedPrOfTip = (prs: readonly MergedPr[], tip: string): MergedPr | undefined =>
  prs.find((pr) => pr.headRefOid === tip);

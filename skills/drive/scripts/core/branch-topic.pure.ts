export const DECISIONS_PREFIX = 'decisions/';

export const TASK_SEPARATOR = '--';

export interface BranchTopic {
  type: string;
  topic: string;
  task: string | null;
}

export function topicOfBranch(branch: string | null): BranchTopic | null {
  const found = /^([^/-][^/]*)\/([^/-][^/]*?)(?:--([^/]*))?$/.exec(branch ?? '');
  if (found === null || found[3] === '') return null;
  return { type: found[1] as string, topic: found[2] as string, task: found[3] ?? null };
}

export const topicSlugOf = (branch: string | null): string | null => topicOfBranch(branch)?.topic ?? null;

export const isIntegrationBranch = (branch: string | null): boolean => {
  const parsed = topicOfBranch(branch);
  return parsed !== null && parsed.task === null && `${parsed.type}/` !== DECISIONS_PREFIX;
};

export const baseOfBranch = (branch: string | null): string | null => {
  const parsed = topicOfBranch(branch);
  return parsed === null || parsed.task === null ? null : `${parsed.type}/${parsed.topic}`;
};

export const taskBranchGlob = (integrationBranch: string, issue: number): string =>
  `${integrationBranch}${TASK_SEPARATOR}${issue}-*`;

export const mergeSubject = (branch: string, base: string): string =>
  `Merge branch '${branch}'${['main', 'master'].includes(base) ? '' : ` into ${base}`}`;

export const taskMergeSubjectPrefix = (integrationBranch: string, issue?: number): string =>
  `Merge branch '${integrationBranch}${TASK_SEPARATOR}${issue === undefined ? '' : `${issue}-`}`;

export function ticketOfMergeSubject(subject: string, integrationBranch: string): number | null {
  const prefix = taskMergeSubjectPrefix(integrationBranch);
  const found = subject.startsWith(prefix) ? /^(\d+)-/.exec(subject.slice(prefix.length)) : null;
  return found === null ? null : Number(found[1]);
}

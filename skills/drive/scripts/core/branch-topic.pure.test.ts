import { describe, expect, it } from 'vitest';
import {
  baseOfBranch,
  isIntegrationBranch,
  mergeSubject,
  taskBranchGlob,
  taskMergeSubjectPrefix,
  ticketOfMergeSubject,
  topicOfBranch,
  topicSlugOf,
} from './branch-topic.pure.ts';

describe('success cases', () => {
  describe('topicOfBranch', () => {
    it('reads the slug of an Integration branch and leaves the task empty', () => {
      // ARRANGE
      const branch = 'chore/drive-fortify-sweep';
      const expected = { type: 'chore', topic: 'drive-fortify-sweep', task: null };
      // ACT
      const parsed = topicOfBranch(branch);
      // ASSERT
      expect(parsed).toEqual(expected);
    });

    it('reads the parent slug and the task of a Task branch', () => {
      // ARRANGE
      const branch = 'chore/drive-fortify-sweep--791-ac-gate';
      const expected = { type: 'chore', topic: 'drive-fortify-sweep', task: '791-ac-gate' };
      // ACT
      const parsed = topicOfBranch(branch);
      // ASSERT
      expect(parsed).toEqual(expected);
    });
  });
  describe('the callers of topicOfBranch', () => {
    it.each([
      { branch: 'chore/sweep', topic: 'sweep', integration: true, base: null },
      { branch: 'chore/sweep--1-a', topic: 'sweep', integration: false, base: 'chore/sweep' },
      { branch: 'decisions/sweep', topic: 'sweep', integration: false, base: null },
      { branch: 'feat/a/b', topic: null, integration: false, base: null },
      { branch: 'sweep--1-a', topic: null, integration: false, base: null },
      { branch: 'main', topic: null, integration: false, base: null },
    ])('agree on $branch', ({ branch, topic, integration, base }) => {
      // ARRANGE
      const expected = { topic, integration, base };
      // ACT
      const read = {
        topic: topicSlugOf(branch),
        integration: isIntegrationBranch(branch),
        base: baseOfBranch(branch),
      };
      // ASSERT
      expect(read).toEqual(expected);
    });
  });
  describe('the merge subject of a Task branch', () => {
    it('is built once and read back: the issue number, the prefix and the glob share the separator', () => {
      // ARRANGE
      const integration = 'chore/demo';
      const task = 'chore/demo--7-store';
      const ticket = 7;
      const expected = {
        subject: "Merge branch 'chore/demo--7-store' into chore/demo",
        prefix: "Merge branch 'chore/demo--",
        ticket: 7,
        glob: 'chore/demo--7-*',
      };
      // ACT
      const subject = mergeSubject(task, integration);
      const read = {
        subject,
        prefix: taskMergeSubjectPrefix(integration),
        ticket: ticketOfMergeSubject(subject, integration),
        glob: taskBranchGlob(integration, ticket),
      };
      // ASSERT
      expect(read).toEqual(expected);
      expect(subject).toContain(taskMergeSubjectPrefix(integration, ticket));
    });
  });
});

describe('failure cases', () => {
  describe('topicOfBranch', () => {
    it('belongs to no Workflow when the name has no type, a nested path, an empty slug or an empty task', () => {
      // ARRANGE
      const branches = ['sweep--1-a', 'feat/a/b', 'feat/--1-a', 'feat/x--', 'feat/', 'main', '', null];
      // ACT
      const parsed = branches.map(topicOfBranch);
      // ASSERT
      expect(parsed).toEqual(branches.map(() => null));
    });
  });
});

describe('edge cases', () => {
  describe('the merge subject of a Task branch', () => {
    it('leaves out " into <base>" for main and ignores other Workflows and review branches', () => {
      // ARRANGE
      const expectedOnMain = "Merge branch 'feat/x'";
      const subjects = [
        "Merge branch 'chore/other--8-x' into chore/other",
        "Merge branch 'chore/demo--review-fix' into chore/demo",
      ];
      // ACT
      const onMain = mergeSubject('feat/x', 'main');
      const read = subjects.map((subject) => ticketOfMergeSubject(subject, 'chore/demo'));
      // ASSERT
      expect(onMain).toBe(expectedOnMain);
      expect(read).toEqual([null, null]);
    });
  });
});

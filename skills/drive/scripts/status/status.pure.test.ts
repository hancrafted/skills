import { describe, expect, it } from 'vitest';
import {
  derivePhase,
  type Facts,
  fortifyOfRecord,
  grillFormatStateOf,
  lastCommand,
  mergedTicketsOf,
  pickIntegrationBranch,
  profilesStateOf,
  recordFileOf,
  renderStatus,
  reviewStateOf,
  specOfDecisionBody,
  ticketsOfBodies,
} from './status.pure.ts';
const base: Facts = {
  topic: 'demo',
  epic: null,
  ghFailed: false,
  fortify: null,
  integrationBranch: 'chore/demo',
  pushed: true,
  decisionPr: null,
  integrationPr: null,
  tickets: [],
  mergedTickets: [],
  lastLog: null,
  inputs: {
    grillFormat: 'filled',
    grillFormatPath: 'docs/agents/grilling-format.md',
    review: 'filled',
    profiles: 'filled',
  },
};
const pr = (number: number, state: 'OPEN' | 'MERGED' | 'CLOSED', isDraft = false) => ({ number, state, isDraft });
const allMerged = { ...base, decisionPr: pr(5, 'MERGED'), tickets: [1], mergedTickets: [1] };

describe('success cases', () => {
  describe('renderStatus', () => {
    it.each([
      ['filled', 'filled', 'filled'],
      ['missing', 'empty', 'missing'],
    ] as const)('prints grill format, review.md and profiles.md as %s, %s and %s', (grill, review, profiles) => {
      // ARRANGE
      const facts: Facts = {
        ...base,
        inputs: { grillFormat: grill, grillFormatPath: 'docs/g.md', review, profiles },
      };
      const expected = [`Grill format: ${grill} (docs/g.md)`, `review.md: ${review}`, `profiles.md: ${profiles}`];
      // ACT
      const text = renderStatus(facts);
      // ASSERT
      for (const line of expected) expect(text).toContain(line);
    });
  });

  describe('grillFormatStateOf', () => {
    it.each([
      [null, false, 'missing'],
      ['docs/g.md', false, 'missing'],
      ['docs/g.md', true, 'filled'],
    ] as const)('maps path %s, exists %s to %s', (configured, exists, expected) => {
      // ARRANGE
      // ACT
      const state = grillFormatStateOf(configured, exists);
      // ASSERT
      expect(state).toBe(expected);
    });
  });

  describe('reviewStateOf', () => {
    it.each([
      [null, 'missing'],
      ['# Drive review\n\n## Mode\n\n## Audience\n', 'empty'],
      ['# Drive review\n\n## Mode\n\nStandalone HTML.\n\n## Audience\n', 'filled'],
    ] as const)('reads %j as %s', (text, expected) => {
      // ARRANGE
      // ACT
      const state = reviewStateOf(text);
      // ASSERT
      expect(state).toBe(expected);
    });
  });

  describe('profilesStateOf', () => {
    it.each([
      [null, 'missing'],
      ['# P\n\n## Architect\n\n- rule\n', 'empty'],
      ['# P\n\n## Live or scheduled\n\n## Implementer\n- rule\n', 'empty'],
      ['# P\n\n## Live or scheduled\n\n- CI on PRs\n', 'filled'],
    ] as const)('reads %j as %s', (text, expected) => {
      // ARRANGE
      // ACT
      const state = profilesStateOf(text);
      // ASSERT
      expect(state).toBe(expected);
    });
  });

  describe('derivePhase', () => {
    it.each([
      ['no Integration branch', { integrationBranch: null }, 'Define'],
      ['an unpushed Integration branch', { pushed: false }, 'Define'],
      ['a pushed branch, no Decision PR, no tickets', {}, 'Define'],
      ['an open Decision PR', { decisionPr: pr(5, 'OPEN') }, 'Reason'],
      [
        'a merged Decision PR, tickets unmerged',
        { decisionPr: pr(5, 'MERGED'), tickets: [1, 2], mergedTickets: [1] },
        'Implement',
      ],
      ['tickets but no Decision PR (chat approval)', { tickets: [1] }, 'Implement'],
      ['every ticket merged, no Integration PR', allMerged, 'Verify'],
      ['a merged Integration PR', { integrationPr: pr(9, 'MERGED') }, 'Evolve'],
      ['a merged Integration PR and fortify pending', { integrationPr: pr(9, 'MERGED'), fortify: 'pending' }, 'Evolve'],
      ['a merged Integration PR and fortify engaged', { integrationPr: pr(9, 'MERGED'), fortify: 'engaged' }, 'Done'],
      ['a merged Integration PR and fortify skipped', { integrationPr: pr(9, 'MERGED'), fortify: 'skipped' }, 'Done'],
      ['a Decision PR closed unmerged', { decisionPr: pr(5, 'CLOSED') }, 'Stopped'],
      ['an Integration PR closed unmerged', { integrationPr: pr(9, 'CLOSED') }, 'Stopped'],
      ['a failed gh call', { ghFailed: true }, 'Stopped'],
    ] as const)('names the phase for %s', (_name, patch, phase) => {
      // ARRANGE
      const facts: Facts = { ...base, ...patch };
      // ACT
      const standing = derivePhase(facts);
      // ASSERT
      expect(standing.phase).toBe(phase);
    });

    it('points the first Verify stop at `drive push --spec <epic>`, then at the record and `pr ready`, then at the Operator', () => {
      // ARRANGE
      const verified = { ...allMerged, epic: 789 };
      const expectedNone = 'drive push --spec 789';
      const expectedDraft = ['commit the record', 'drive pr ready 9'];
      const expectedReady = 'merges #9';
      // ACT
      const none = derivePhase(verified).next;
      const draft = derivePhase({ ...verified, integrationPr: pr(9, 'OPEN', true) }).next;
      const ready = derivePhase({ ...verified, integrationPr: pr(9, 'OPEN') }).next;
      const unknownEpic = derivePhase(allMerged).next;
      // ASSERT
      expect(none).toContain(expectedNone);
      expect(draft).toEqual(expect.stringContaining(expectedDraft[0] as string));
      expect(draft).toEqual(expect.stringContaining(expectedDraft[1] as string));
      expect(ready).toContain(expectedReady);
      expect(unknownEpic).toContain('--spec <epic>');
    });

    it('asks the one Fortify question after the merge until the record leaves pending, then says what is left', () => {
      // ARRANGE
      const merged = { ...base, integrationPr: pr(9, 'MERGED') };
      const expectedQuestion = 'Fortify now or skip?';
      // ACT
      const unrecorded = derivePhase(merged).next;
      const pending = derivePhase({ ...merged, fortify: 'pending' }).next;
      const engaged = derivePhase({ ...merged, fortify: 'engaged' }).next;
      const skipped = derivePhase({ ...merged, fortify: 'skipped' }).next;
      // ASSERT
      expect(unrecorded).toContain(expectedQuestion);
      expect(pending).toContain(expectedQuestion);
      expect(engaged).not.toContain(expectedQuestion);
      expect(skipped).not.toContain(expectedQuestion);
    });

    it('lists the unmerged tickets as the Implement stop', () => {
      // ARRANGE
      const facts = { ...base, decisionPr: pr(5, 'MERGED'), tickets: [1, 2, 3], mergedTickets: [2] };
      const expected = '#1, #3';
      // ACT
      const { next } = derivePhase(facts);
      // ASSERT
      expect(next).toContain(expected);
    });
  });
  describe('renderStatus', () => {
    it('prints phase, branch, both PRs, ticket count, last command and next stop', () => {
      // ARRANGE
      const facts: Facts = {
        ...base,
        decisionPr: pr(5, 'MERGED'),
        integrationPr: pr(9, 'OPEN', true),
        tickets: [1, 2],
        mergedTickets: [1],
        lastLog: { t: '2026-01-01T00:00:00Z', cmd: 'push' },
      };
      const expected = [
        'Workflow demo: Implement',
        'Integration branch: chore/demo (pushed)',
        'Decision PR: #5 merged',
        'Integration PR: #9 draft',
        'Tickets: 1/2 merged',
        'Last command: `push`',
        'Next stop: merge #2',
      ];
      // ACT
      const text = renderStatus(facts);
      // ASSERT
      for (const line of expected) expect(text).toContain(line);
    });
  });
  describe('fact readers', () => {
    it('picks the Integration branch, never the decisions or a Task branch', () => {
      // ARRANGE
      const branches = ['decisions/demo', 'origin/chore/demo--1-x', 'origin/chore/demo'];
      const onlyDecisions = ['decisions/demo'];
      const expected = 'chore/demo';
      // ACT
      const picked = pickIntegrationBranch(branches, 'demo', 'origin');
      const none = pickIntegrationBranch(onlyDecisions, 'demo', 'origin');
      // ASSERT
      expect(picked).toBe(expected);
      expect(none).toBeNull();
    });

    it('reads merged tickets from the merge commits of Task branches', () => {
      // ARRANGE
      const subjects = [
        "Merge branch 'chore/demo--7-store' into chore/demo",
        "Merge branch 'chore/demo--7-store' into chore/demo",
        "Merge branch 'chore/other--8-x' into chore/other",
        "Merge branch 'chore/demo--review-fix' into chore/demo",
      ];
      const expected = [7];
      // ACT
      const merged = mergedTicketsOf(subjects, 'chore/demo');
      // ASSERT
      expect(merged).toEqual(expected);
    });

    it('reads tickets from the Closes lines, else the Decision PR Tickets section, as #n or issue URLs', () => {
      // ARRANGE
      const decision = '## Spec\n\n#1\n\n## Tickets\n\n- #4 a (Skills: tdd)\n- #5 b\n\n## Live\n\n- #99 no';
      const urls = '## Tickets\n\n- https://github.com/o/r/issues/6 c\n';
      const expected = { close: [2, 3], decision: [4, 5], urls: [6] };
      // ACT
      const fromClose = ticketsOfBodies('Spec: #1\n\nCloses #2\nCloses #3', decision);
      const fromDecision = ticketsOfBodies(null, decision);
      const fromUrls = ticketsOfBodies(null, urls);
      // ASSERT
      expect({ close: fromClose, decision: fromDecision, urls: fromUrls }).toEqual(expected);
    });

    it('reads the epic from the Decision PR Spec section as a number or an issue URL', () => {
      // ARRANGE
      const asUrl = '## Spec\n\nhttps://github.com/o/r/issues/100\n\n## Tickets\n\n- #1';
      const asNumber = '## Spec\n\n#12\n';
      const expected = [100, 12, null];
      // ACT
      const read = [asUrl, asNumber, 'no spec section'].map(specOfDecisionBody);
      // ASSERT
      expect(read).toEqual(expected);
    });

    it('reads the fortify state of a record and finds the record of exactly this topic', () => {
      // ARRANGE
      const record = '---\nworkflow: demo\nfortify: pending\n---\n\n# demo';
      const files = ['d/records/2026-11-19-other-demo.md', 'd/records/2026-11-19-demo.md'];
      const expected = { state: 'pending', file: 'd/records/2026-11-19-demo.md', missing: null };
      // ACT
      const state = fortifyOfRecord(record);
      const file = recordFileOf(files, 'demo');
      const missing = recordFileOf(files, 'emo');
      // ASSERT
      expect({ state, file, missing }).toEqual(expected);
    });
  });
});

describe('failure cases', () => {
  describe('renderStatus', () => {
    it('says unknown, not none, when gh failed', () => {
      // ARRANGE
      const facts: Facts = { ...base, ghFailed: true };
      const expected = ['Decision PR: unknown (gh failed)', 'Integration PR: unknown (gh failed)'];
      // ACT
      const text = renderStatus(facts);
      // ASSERT
      for (const line of expected) expect(text).toContain(line);
    });
  });
});

describe('edge cases', () => {
  describe('renderStatus', () => {
    it('says grill.format is unset when no path is configured', () => {
      // ARRANGE
      const facts: Facts = { ...base, inputs: { ...base.inputs, grillFormat: 'missing', grillFormatPath: null } };
      // ACT
      const text = renderStatus(facts);
      // ASSERT
      expect(text).toContain('Grill format: missing (grill.format unset)');
    });
  });
  describe('derivePhase', () => {
    it('says the Tickets section lists none when a merged Decision PR yields no ticket', () => {
      // ARRANGE
      const facts = { ...base, decisionPr: pr(5, 'MERGED') };
      const expected = '`- #<n>`';
      // ACT
      const { next } = derivePhase(facts);
      // ASSERT
      expect(next).toContain(expected);
    });
  });
  describe('renderStatus', () => {
    it('works with no log, no PRs and no branch', () => {
      // ARRANGE
      const facts: Facts = { ...base, integrationBranch: null, pushed: false };
      const expected = ['Integration branch: none', 'Decision PR: none', 'Last command: no log'];
      // ACT
      const text = renderStatus(facts);
      // ASSERT
      for (const line of expected) expect(text).toContain(line);
    });
  });
  describe('fact readers', () => {
    it('takes the last log line that is a command', () => {
      // ARRANGE
      const entries = [{ t: 'a', cmd: 'push' }, { t: 'b', cmd: 'status' }, { t: 'c' }];
      const expected = { t: 'b', cmd: 'status' };
      // ACT
      const last = lastCommand(entries);
      const none = lastCommand([]);
      // ASSERT
      expect(last).toEqual(expected);
      expect(none).toBeNull();
    });
  });
});

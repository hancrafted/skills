import { describe, expect, it } from 'vitest';
import {
  addBullet,
  addMonth,
  markTicket,
  offSkills,
  recordBullets,
  renderFailureMode,
  renderRecord,
} from './write.pure.ts';

const SLUG = 'push-exits-zero';
const TITLE = 'drive push exits 0 when the remote rejected the commit';

describe('success cases', () => {
  describe('addMonth', () => {
    it('moves a date one calendar month on', () => {
      // ARRANGE
      const expected = '2026-12-20';
      // ACT
      const date = addMonth('2026-11-20');
      // ASSERT
      expect(date).toBe(expected);
    });
  });

  describe('renderFailureMode', () => {
    it('writes a proposed failure mode that expires a month after its date', () => {
      // ARRANGE
      const expected = [
        '---',
        'type: failure-mode',
        'stale_after: 2026-12-20',
        `title: ${TITLE}`,
        "enforcer: 'test-runner: test'",
        'status: proposed',
        '---',
        '',
        `# ${TITLE}`,
        '',
        '## Symptom',
        '',
        'TODO: what an Operator or reviewer observes.',
        '',
      ].join('\n');
      // ACT
      const text = renderFailureMode({ title: TITLE, enforcer: 'test-runner: test', date: '2026-11-20' });
      // ASSERT
      expect(text).toBe(expected);
    });
  });

  describe('renderRecord', () => {
    it('writes a pending record for a run, with type and no stale_after', () => {
      // ARRANGE
      const expected = [
        '---',
        'type: record',
        'workflow: sweep',
        'date: 2026-11-20',
        'fortify: pending',
        '---',
        '',
        '# sweep',
        '',
      ].join('\n');
      // ACT
      const text = renderRecord({ topic: 'sweep', date: '2026-11-20' });
      // ASSERT
      expect(text).toBe(expected);
    });
  });

  describe('addBullet', () => {
    it('opens an H2 for a failure mode a record does not cite yet', () => {
      // ARRANGE
      const record = renderRecord({ topic: 'sweep', date: '2026-11-20' });
      const expected = `${record}\n## ${SLUG}\n\n- **Evidence:** it exited 0\n`;
      // ACT
      const text = addBullet(record, SLUG, '**Evidence:** it exited 0');
      // ASSERT
      expect(text).toBe(expected);
    });

    it('appends under an existing H2, before the next one', () => {
      // ARRANGE
      const record = '# t\n\n## a-mode\n\n- **Evidence:** one\n\n## b-mode\n\n- **Evidence:** two\n';
      const expected =
        '# t\n\n## a-mode\n\n- **Evidence:** one\n- **Correction:** "no"\n\n## b-mode\n\n- **Evidence:** two\n';
      // ACT
      const text = addBullet(record, 'a-mode', '**Correction:** "no"');
      // ASSERT
      expect(text).toBe(expected);
    });
  });

  describe('markTicket', () => {
    it('sets status, ticket and a new stale_after in the front matter and keeps the body', () => {
      // ARRANGE
      const text = renderFailureMode({ title: TITLE, enforcer: 'test-runner: test', date: '2026-11-20' });
      const url = 'https://github.com/o/r/issues/9';
      const expected = text
        .replace('status: proposed', `status: ticket\nticket: ${url}`)
        .replace('stale_after: 2026-12-20', 'stale_after: 2027-01-05');
      // ACT
      const marked = markTicket(text, url, '2026-12-05');
      // ASSERT
      expect(marked).toBe(expected);
    });
  });

  describe('offSkills', () => {
    it('lists the skills under the Off heading', () => {
      // ARRANGE
      const readme = '# Learnings\n\n## Off\n\n- `cleanup`\n- commit\n\n## Other\n\n- prototype\n';
      const expected = ['cleanup', 'commit'];
      // ACT
      const off = offSkills(readme);
      // ASSERT
      expect(off).toEqual(expected);
    });
  });

  describe('recordBullets', () => {
    it('labels each given text, evidence first', () => {
      // ARRANGE
      const flags = { regressed: 'fix did not hold', evidence: 'it broke', correction: '"stop"' };
      const expected = ['**Evidence:** it broke', '**Correction:** "stop"', '**Regressed:** fix did not hold'];
      // ACT
      const bullets = recordBullets(flags);
      // ASSERT
      expect(bullets).toEqual(expected);
    });
  });
});

describe('failure cases', () => {
  describe('markTicket', () => {
    it('returns text without front matter unchanged', () => {
      // ARRANGE
      const text = '# no front matter\n';
      // ACT
      const marked = markTicket(text, 'https://github.com/o/r/issues/9', '2026-12-05');
      // ASSERT
      expect(marked).toBe(text);
    });
  });

  describe('recordBullets', () => {
    it('gives nothing when no text is given', () => {
      // ARRANGE
      const expected: string[] = [];
      // ACT
      const bullets = recordBullets({});
      // ASSERT
      expect(bullets).toEqual(expected);
    });
  });
});

describe('edge cases', () => {
  describe('addMonth', () => {
    it('clamps the day to the end of a shorter month and rolls the year', () => {
      // ARRANGE
      const expected = ['2027-02-28', '2027-01-15'];
      // ACT
      const dates = [addMonth('2027-01-31'), addMonth('2026-12-15')];
      // ASSERT
      expect(dates).toEqual(expected);
    });
  });

  describe('offSkills', () => {
    it('lists none when the README has no Off heading', () => {
      // ARRANGE
      const expected: string[] = [];
      // ACT
      const off = offSkills('# Learnings\n\n- commit\n');
      // ASSERT
      expect(off).toEqual(expected);
    });
  });

  describe('addBullet', () => {
    it('ignores a heading that sits inside a code fence', () => {
      // ARRANGE
      const record = '# t\n\n```\n## a-mode\n```\n';
      const expected = `${record}\n## a-mode\n\n- **Evidence:** x\n`;
      // ACT
      const text = addBullet(record, 'a-mode', '**Evidence:** x');
      // ASSERT
      expect(text).toBe(expected);
    });
  });
});

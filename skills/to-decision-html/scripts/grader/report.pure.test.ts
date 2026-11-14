import { describe, expect, it } from 'vitest';
import { combine, proofOf, toReport, type CheckResult } from './report.pure.ts';

const CHECK = { id: 'offline', summary: 'Loads offline.' };
const result = (id: string, status: CheckResult['status']): CheckResult => ({ id, summary: '', status, problems: [] });

describe('success cases', () => {
  it('passes when no width found a problem', () => {
    // ARRANGE
    const widths = [
      { width: 1440, problems: [] },
      { width: 1024, problems: [] },
    ];
    const expected = { ...CHECK, status: 'pass', problems: [] };

    // ACT
    const combined = combine(CHECK, widths);

    // ASSERT
    expect(combined).toEqual(expected);
  });

  it('passes a page whose checks pass or skip', () => {
    // ARRANGE
    const checks = [result('a', 'pass'), result('b', 'skip')];
    const expected = { page: '/p.html', mode: 'decide', pass: true, checks };

    // ACT
    const report = toReport('/p.html', 'decide', checks);

    // ASSERT
    expect(report).toEqual(expected);
  });

  it('proves a broken fixture that fails its own check and no other', () => {
    // ARRANGE
    const report = toReport('/f.html', 'decide', [result('offline', 'fail'), result('decide-controls', 'pass')]);
    const expected = { fixture: 'offline--cdn', check: 'offline', proves: true, reason: 'fails offline only' };

    // ACT
    const proof = proofOf('offline--cdn', report);

    // ASSERT
    expect(proof).toEqual(expected);
  });

  it('proves a valid fixture that every check passes', () => {
    // ARRANGE
    const report = toReport('/f.html', 'decide', [result('offline', 'pass'), result('explain-controls', 'skip')]);
    const expected = { fixture: 'valid-decide', check: null, proves: true, reason: 'no check fails' };

    // ACT
    const proof = proofOf('valid-decide', report);

    // ASSERT
    expect(proof).toEqual(expected);
  });
});

describe('failure cases', () => {
  it('lists a problem once when every width saw it, and names the width when only one did', () => {
    // ARRANGE
    const widths = [
      { width: 1440, problems: ['no header'] },
      { width: 1024, problems: ['no header', 'text overflows'] },
    ];
    const expected = { ...CHECK, status: 'fail', problems: ['no header', 'at 1024px: text overflows'] };

    // ACT
    const combined = combine(CHECK, widths);

    // ASSERT
    expect(combined).toEqual(expected);
  });

  it('fails a page with one failing check', () => {
    // ARRANGE
    const checks = [result('a', 'pass'), result('b', 'fail')];

    // ACT
    const report = toReport('/p.html', 'decide', checks);

    // ASSERT
    expect(report.pass).toBe(false);
  });

  it('rejects a broken fixture its check let pass', () => {
    // ARRANGE
    const report = toReport('/f.html', 'decide', [result('offline', 'pass')]);
    const expected = 'offline passes it; the check cannot see the defect';

    // ACT
    const proof = proofOf('offline--cdn', report);

    // ASSERT
    expect(proof.reason).toBe(expected);
  });

  it('rejects a valid fixture that a check fails', () => {
    // ARRANGE
    const report = toReport('/f.html', 'decide', [result('offline', 'fail')]);
    const expected = 'fails offline; a valid fixture passes every check';

    // ACT
    const proof = proofOf('valid-decide', report);

    // ASSERT
    expect(proof.reason).toBe(expected);
  });
});

describe('edge cases', () => {
  it('skips when the check applied at no width', () => {
    // ARRANGE
    const widths = [
      { width: 1440, problems: null },
      { width: 1024, problems: null },
    ];
    const expected = { ...CHECK, status: 'skip', problems: [] };

    // ACT
    const combined = combine(CHECK, widths);

    // ASSERT
    expect(combined).toEqual(expected);
  });

  it('reports only id, summary, status and problems, whatever else the check carries', () => {
    // ARRANGE
    const check = { ...CHECK, modes: ['decide'] };
    const widths = [{ width: 1440, problems: ['x', 'x'] }];
    const expected = { ...CHECK, status: 'fail', problems: ['x'] };

    // ACT
    const combined = combine(check, widths);

    // ASSERT
    expect(combined).toEqual(expected);
  });

  it('passes vacuously with no checks registered', () => {
    // ARRANGE
    const checks: CheckResult[] = [];

    // ACT
    const report = toReport('/p.html', null, checks);

    // ASSERT
    expect(report.pass).toBe(true);
  });

  it('rejects a broken fixture that also fails another check, since it holds more than one defect', () => {
    // ARRANGE
    const report = toReport('/f.html', 'decide', [result('offline', 'fail'), result('page-attributes', 'fail')]);
    const expected = 'also fails page-attributes; a broken fixture holds exactly one defect';

    // ACT
    const proof = proofOf('offline--cdn', report);

    // ASSERT
    expect(proof.reason).toBe(expected);
  });

  it('rejects a broken fixture naming no registered check', () => {
    // ARRANGE
    const report = toReport('/f.html', 'decide', [result('offline', 'fail')]);
    const expected = 'names check "layout", which is not registered';

    // ACT
    const proof = proofOf('layout--no-header', report);

    // ASSERT
    expect(proof.reason).toBe(expected);
  });
});

import { describe, expect, it } from 'vitest';
import { chooseModelCli, parseReply } from './model-cli.pure.ts';

const CLAUDE_STDOUT = JSON.stringify({
  type: 'result',
  is_error: false,
  total_cost_usd: 0.0021,
  modelUsage: { 'claude-haiku-5-5': { costUSD: 0.0021 } },
  result: '{"answers":[]}',
  structured_output: { answers: [{ id: 'bar decision', answer: 'yes', evidence: 'Decision' }] },
});

const GEMINI_STDOUT = JSON.stringify({
  response: 'Here you go:\n```json\n{"answers":[{"id":"anchor","choices":["c"],"evidence":"rounded border"}]}\n```',
  stats: { models: { 'gemini-2.5-pro': { tokens: { total: 900 } } } },
});

describe('model CLI', () => {
  describe('success cases', () => {
    it('picks Gemini when it is installed, for a judge from another family than the executor', () => {
      // ARRANGE
      const expected = { cli: 'gemini', crossFamily: true, risk: null };

      // ACT
      const choice = chooseModelCli(undefined, true);

      // ASSERT
      expect(choice).toEqual(expected);
    });

    it('falls back to Claude without Gemini, and records the self-preference risk', () => {
      // ARRANGE
      const expected = {
        cli: 'claude',
        crossFamily: false,
        risk: 'The judge and reader are Claude, the family that wrote the page, so they may prefer its work (self-preference); weigh judge and probe results with that bias in mind.',
      };

      // ACT
      const choice = chooseModelCli('auto', false);

      // ASSERT
      expect(choice).toEqual(expected);
    });

    it("reads Claude's structured answers and the model that gave them", () => {
      // ARRANGE
      const expected = {
        model: 'claude-haiku-5-5',
        costUsd: 0.0021,
        value: { answers: [{ id: 'bar decision', answer: 'yes', evidence: 'Decision' }] },
      };

      // ACT
      const reply = parseReply('claude', CLAUDE_STDOUT);

      // ASSERT
      expect(reply).toEqual(expected);
    });

    it("reads Gemini's answers from the JSON in its response text", () => {
      // ARRANGE
      const expected = {
        model: 'gemini-2.5-pro',
        costUsd: null,
        value: { answers: [{ id: 'anchor', choices: ['c'], evidence: 'rounded border' }] },
      };

      // ACT
      const reply = parseReply('gemini', GEMINI_STDOUT);

      // ASSERT
      expect(reply).toEqual(expected);
    });
  });

  describe('failure cases', () => {
    it('refuses Gemini when asked for it and it is not installed', () => {
      // ARRANGE
      const expected = 'EVAL_JUDGE=gemini, but no gemini CLI is on PATH';

      // ACT
      const choose = () => chooseModelCli('gemini', false);

      // ASSERT
      expect(choose).toThrow(expected);
    });

    it('names a Claude reply that carries no structured answer', () => {
      // ARRANGE
      const stdout = JSON.stringify({ type: 'result', is_error: true, result: 'Credit balance is too low' });

      // ACT
      const parse = () => parseReply('claude', stdout);

      // ASSERT
      expect(parse).toThrow('claude gave no structured answer: Credit balance is too low');
    });
  });

  describe('edge cases', () => {
    it('turns the judge off on request, so a regrade spends nothing', () => {
      // ARRANGE
      const expected = null;

      // ACT
      const choice = chooseModelCli('off', true);

      // ASSERT
      expect(choice).toBe(expected);
    });
  });
});

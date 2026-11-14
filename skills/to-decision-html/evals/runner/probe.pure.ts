// The reader probe's pure parts: a reader who saw only the page answers a case's probe.json, and each answer is
// scored against the key we wrote from the frozen case input. A question passes only on the exact set of keyed
// choices; unknown counts as fail.
import type { Expectation } from './grading.pure.ts';
import { fillPrompt, quoted, type Source } from './quality.pure.ts';

/** One question of a case's probe.json. `answer` lists every correct choice; the reader must give exactly those. */
export interface ProbeQuestion {
  readonly id: string;
  readonly question: string;
  readonly choices: Readonly<Record<string, string>>;
  readonly answer: readonly string[];
  /** Where in the frozen case input the key comes from; never a generated page. */
  readonly source: Source;
}

/** The reader's answer to one question: the choices it picked, or `unknown`, and a quote from the page. */
export interface ReaderAnswer {
  readonly id: string;
  readonly choices: readonly string[];
  readonly evidence: string;
}

/** The choice a reader gives when the page does not tell it; offered on every question, and always a fail. */
export const UNKNOWN = 'unknown';

const listed = (choices: readonly string[]) => [...choices].sort().join(', ');

export function probeExpectations(
  questions: readonly ProbeQuestion[],
  answers: readonly ReaderAnswer[],
  pageText: string,
): Expectation[] {
  return questions.map(({ id, question, answer }) => {
    const text = `probe ${id}: ${question}`;
    const key = listed(answer);
    const given = answers.find((reply) => reply.id === id);
    if (given === undefined) return { text, passed: false, evidence: `the reader gave no answer; key ${key}` };
    const picked = listed(given.choices);
    if (given.choices.includes(UNKNOWN))
      return { text, passed: false, evidence: `answered ${picked}, which counts as fail; key ${key}` };
    const quote = quoted(given.evidence, pageText);
    return {
      text,
      passed: picked === key,
      evidence: `answered ${picked}; key ${key}${quote === '' ? '' : `: ${quote}`}`,
    };
  });
}

/** The reader's prompt: each question and its lettered choices. The key and its source stay out. */
export function probePrompt(template: string, questions: readonly ProbeQuestion[], files: readonly string[]): string {
  const listedQuestions = questions
    .map(({ id, question, choices }) =>
      [
        `- \`${id}\`: ${question}`,
        ...Object.entries(choices).map(([letter, text]) => `  - \`${letter}\`: ${text}`),
      ].join('\n'),
    )
    .join('\n');
  return fillPrompt(template, files, { questions: listedQuestions });
}

/** The JSON schema the reader's reply must match: per question, choices from its letters or unknown. */
export function probeSchema(questions: readonly ProbeQuestion[]): object {
  const letters = [...new Set(questions.flatMap(({ choices }) => Object.keys(choices))), UNKNOWN];
  return {
    type: 'object',
    properties: {
      answers: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { enum: questions.map(({ id }) => id) },
            choices: { type: 'array', items: { enum: letters }, minItems: 1 },
            evidence: { type: 'string' },
          },
          required: ['id', 'choices', 'evidence'],
          additionalProperties: false,
        },
      },
    },
    required: ['answers'],
    additionalProperties: false,
  };
}

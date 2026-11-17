import { load } from 'cheerio';
import { FIDELITY_RUNGS, type Check, type FidelityRung } from '../grader/check.ts';

interface Observation {
  readonly fidelity: FidelityRung;
  readonly html: string;
}

const onLadderSoOffLadderIsLeftToPageAttributes = (value: string | undefined): value is FidelityRung =>
  FIDELITY_RUNGS.some((rung) => rung === value);

export const check: Check<Observation> = {
  id: 'fidelity-match',
  summary: "Every item's data-fidelity is the rung its calibration asked for.",
  needs: ['fidelity'],
  observe: ({ asked, html }) => ({ fidelity: asked.fidelity!, html }),
  judge({ fidelity, html }) {
    const $ = load(html);
    return $('[data-item]')
      .toArray()
      .flatMap(({ attribs }) => {
        const built = attribs['data-fidelity'];
        if (!onLadderSoOffLadderIsLeftToPageAttributes(built) || built === fidelity) return [];
        return [`item "${attribs['data-item']}" is built at ${built}; its calibration asked for ${fidelity}`];
      });
  },
};

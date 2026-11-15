// Whether the page honoured the fidelity its calibration asked for: every item's data-fidelity is that one rung.
// The page cannot say what was asked, so the grader must be told; untold, the check skips.
import { load } from 'cheerio';
import { FIDELITY_RUNGS, type Check, type FidelityRung } from '../grader/check.ts';

interface Observation {
  /** The rung the calibration asked for every item. */
  readonly fidelity: FidelityRung;
  readonly html: string;
}

const onLadder = (value: string | undefined): value is FidelityRung => FIDELITY_RUNGS.some((rung) => rung === value);

export const check: Check<Observation> = {
  id: 'fidelity-match',
  summary: "Every item's data-fidelity is the rung its calibration asked for.",
  needs: ['fidelity'],
  observe: ({ asked, html }) => ({ fidelity: asked.fidelity!, html }),
  judge({ fidelity, html }) {
    const $ = load(html);
    // A rung off the ladder, or none, is page-attributes' problem; reporting it here too would double-count it.
    return $('[data-item]')
      .toArray()
      .flatMap(({ attribs }) => {
        const built = attribs['data-fidelity'];
        if (!onLadder(built) || built === fidelity) return [];
        return [`item "${attribs['data-item']}" is built at ${built}; its calibration asked for ${fidelity}`];
      });
  },
};

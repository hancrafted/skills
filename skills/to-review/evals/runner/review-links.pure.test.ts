import { describe, expect, it } from 'vitest';
import { withPageLinks } from './review-links.pure.ts';

const VIEWER = '<html><body><div id="outputs-body"></div><script>function renderOutputs(run) {}</script></body></html>';

describe('withPageLinks', () => {
  describe('success cases', () => {
    it('adds a script before </body> that maps each run id to its pages, relative to the review', () => {
      // ARRANGE
      const pages = { 'eval-ink-with_skill-run-1': ['eval-ink/with_skill/run-1/pages/ink.html'] };

      // ACT
      const html = withPageLinks(VIEWER, pages);

      // ASSERT
      expect(html.indexOf('"eval-ink-with_skill-run-1":["eval-ink/with_skill/run-1/pages/ink.html"]')).toBeGreaterThan(
        VIEWER.indexOf('</script>'),
      );
      expect(html.endsWith('</script>\n</body></html>')).toBe(true);
      expect(html).toContain('renderOutputs = ');
    });
  });

  describe('edge cases', () => {
    it('escapes a "<" in a path, so it cannot end the injected script early', () => {
      // ARRANGE
      const pages = { 'eval-x-with_skill-run-1': ['eval-x/with_skill/run-1/pages/</script>.html'] };

      // ACT
      const html = withPageLinks(VIEWER, pages);

      // ASSERT
      expect(html.split('</script>')).toHaveLength(3);
    });

    it('leaves the viewer unchanged when no run wrote a page', () => {
      // ARRANGE
      const pages = {};

      // ACT
      const html = withPageLinks(VIEWER, pages);

      // ASSERT
      expect(html).toBe(VIEWER);
    });
  });
});

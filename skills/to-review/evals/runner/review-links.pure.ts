// Links each run in skill-creator's viewer to the pages it wrote. The viewer cannot embed a page: it puts text files
// inside a <script>, which the page's own </script> would end, so outputs/ holds only screenshots. The injected
// script wraps the viewer's renderOutputs and puts the links above the run's outputs.

/** Run id as the viewer names it (the run folder's path with `/` as `-`) → its pages, relative to review.html. */
export type PageLinks = Readonly<Record<string, readonly string[]>>;

const SCRIPT = (pages: string) => `<script>
(() => {
  const PAGES = ${pages};
  const render = renderOutputs;
  renderOutputs = (run) => {
    render(run);
    const links = PAGES[run.id] ?? [];
    if (links.length === 0) return;
    const line = document.createElement('p');
    line.style.margin = '0 0 12px';
    line.append('Open the page: ');
    links.forEach((href, index) => {
      const link = document.createElement('a');
      link.href = href;
      link.target = '_blank';
      link.textContent = href.split('/').pop();
      if (index > 0) line.append(' · ');
      line.append(link);
    });
    document.getElementById('outputs-body').prepend(line);
  };
  showRun(currentIndex);
})();
</script>
`;

/** The viewer's HTML with the page links added, or unchanged when no run wrote a page. */
export function withPageLinks(viewer: string, pages: PageLinks): string {
  if (Object.keys(pages).length === 0) return viewer;
  const end = viewer.lastIndexOf('</body>');
  const json = JSON.stringify(pages).replace(/</g, '\\u003c');
  return `${viewer.slice(0, end)}${SCRIPT(json)}${viewer.slice(end)}`;
}

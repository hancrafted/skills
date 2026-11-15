# Diagrams

Each Mermaid source lives in `<script type="text/x-mermaid" data-diagram="<name>">`, written exactly as Mermaid reads it: `A --> B`, with every character literal, because a `<script>` keeps `&gt;` as four characters. The rendering goes into a sibling element in the same parent, so the script stays as written and anyone can copy the source out of the page file.

## Pre-render with a browser tool

1. Open a blank page in the browser tool, with network.
2. Evaluate this once per diagram, passing its name and source:

   ```js
   async ([name, source]) => {
     const { default: mermaid } = await import('https://cdn.jsdelivr.net/npm/mermaid@12.3.0/dist/mermaid.esm.min.mjs');
     mermaid.initialize({ startOnLoad: false, theme: 'neutral' });
     return (await mermaid.render(`diagram-${name}`, source)).svg;
   };
   ```

3. Paste the returned SVG directly after its source script. The id `diagram-<name>` scopes the SVG's own styles, so give each diagram a unique slug as its name.
4. Its colours are fixed at render time: place it on a light surface in both themes.

The page stays fully offline, without `data-offline`.

## Fallback without a browser tool

Mark `<html data-offline="partial">`. Follow each source with an empty `<pre>`, and end the body with this script. It shows every source as text, then swaps in the SVG when the pinned Mermaid loads; offline, the text stays.

```html
<script type="module">
  const sources = [...document.querySelectorAll('script[type="text/x-mermaid"]')];
  for (const source of sources) source.nextElementSibling.textContent = source.text.trim();
  try {
    const { default: mermaid } = await import('https://cdn.jsdelivr.net/npm/mermaid@12.3.0/dist/mermaid.esm.min.mjs');
    mermaid.initialize({ startOnLoad: false, theme: 'neutral' });
    for (const source of sources) {
      const { svg } = await mermaid.render(`diagram-${source.dataset.diagram}`, source.text);
      source.nextElementSibling.outerHTML = svg;
    }
  } catch {
    // Offline or blocked: the source stays readable as text.
  }
</script>
```

Pin an exact version, as above: the grader passes only `mermaid@X.Y.Z` from jsDelivr, only on a page marked partial, and fails every other request.

# Compare two decision pages

You are comparing two decision pages built from the same material: HTML pages that help a person decide open decisions. A reader opens each one cold and has to decide from it. You see both the way their reader does, through these files in your working folder:

{{files}}

Read every file before you answer. Judge only what the screenshots and the page texts show; the pages' source code and their authors' intentions are out of reach. The order of the pages carries no meaning.

## The items

For each item, decide which page meets it better, `1` or `2`, or answer `same` when the two meet it equally well or equally badly. Hold both pages to the same bar and compare what is on the page, not how much effort it looks like.

{{checklist}}

## Critique and evidence

Write a critique first: what each page does for the item, in two or three sentences. Then give the answer the critique supports. Then give one short quote as evidence, copied word for word from one page's text, or from text legible in a screenshot. For `same`, quote either page.

## Answer

Reply with JSON alone, one entry per item, in this shape:

```json
{
  "answers": [
    {
      "id": "<item id>",
      "critique": "<two or three sentences>",
      "answer": "1 | 2 | same",
      "evidence": "<verbatim quote>"
    }
  ]
}
```

# Judge a decision page

You are grading one decision page: an HTML page that helps a person decide open decisions (mode `decide`) or understand decisions already made (mode `explain`). You see it the way its reader does, through these files in your working folder:

{{files}}

Read every file before you answer. Judge only what the screenshots and the page text show; the page's source code and its author's intentions are out of reach.

## The checklist

Answer each item `yes`, `no` or `unknown`:

- `yes`: the page clearly meets the item, for every item or Option it names.
- `no`: the page misses it, even once.
- `unknown`: the screenshots and the text cannot settle it. Unknown counts as a fail, so give it only when the evidence is truly absent.

{{checklist}}

## Evidence

Give each answer one short quote as its evidence, copied word for word from the page text, or from text legible in a screenshot. For a `no`, quote what stands where the missing part should be. For `unknown`, leave the evidence empty.

## Answer

Reply with JSON alone, one entry per checklist item, in this shape:

```json
{ "answers": [{ "id": "<item id>", "answer": "yes | no | unknown", "evidence": "<verbatim quote>" }] }
```

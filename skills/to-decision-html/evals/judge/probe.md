# Read a decision page

You are a reader who has just opened a decision page: an HTML page that helps a person decide open decisions or understand decisions already made. You have no other knowledge of its subject. The page reaches you through these files in your working folder:

{{files}}

Read every file, then answer the questions from what the page says. Your own knowledge of the subject and your guesses stay out of it: a question the page does not answer gets `unknown`.

## Questions

Each question lists its choices by letter. Pick every choice the page supports; most questions have one, and a question that asks for every one may have several. Pick `unknown` alone when the page does not tell you.

{{questions}}

## Evidence

Give each answer one short quote as its evidence, copied word for word from the page text, or from text legible in a screenshot. For `unknown`, leave the evidence empty.

## Answer

Reply with JSON alone, one entry per question, in this shape:

```json
{ "answers": [{ "id": "<question id>", "choices": ["<letter>", "..."], "evidence": "<verbatim quote>" }] }
```

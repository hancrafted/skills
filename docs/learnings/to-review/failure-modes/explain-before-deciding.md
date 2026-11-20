---
type: failure-mode
stale_after: 2026-12-17
title: Page decides before it explains
enforcer: 'review: new fortify-round eval case'
status: proposed
---

# Page decides before it explains

## Symptom

The page asks for a decision before it explains the decision with a visual or example, carries more text than a stressed reader can scan, or breaks its layout (inline code and lists wrapped one letter per line). Rules needing attention: inverted pyramid, cold-reader audience, confidence-bar question 0, closed collapsibles, one section per Option, evidence that says what it shows, `data-before` and `data-after`, the mid-word wrap check and the page skeleton.

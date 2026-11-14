# Calibration answers

My answers to anything you would ask before building. Where a question is not answered here, proceed and mark the value you chose as assumed.

- **Mode:** `decide`. I pick one Option per Slide.
- **Audience:** me, who judges each Slide's design and picks an Option per Slide. I review on a 1512px-wide laptop.
- **Items:** the Title slide and the four Slides in `decisions.md`, in its order. Keep each Slide's slug as its item id (`top` for the Title slide) and each Option's id as its Option id.
- **Depth:** `simple` on every item.
- **Fidelity:** `mock` for every item, a real-content mock of the Slide.
- **Design size:** 1920 × 1080: a mock is a Slide frame that grows to 1920 px on a wide screen.
- **Recommendation:** keep the recommended Option `decisions.md` marks on each Slide. I still make the pick.
- **Allowed Next actions:** "Redesign the open Slides" and "Approve the Spec". Preset "Redesign the open Slides".
- **Gates:** approval is my pick on every Slide plus the Next action "Approve the Spec".
- **Design guidance:** the tokens and type roles in `design.css`, inlined. Mocks use token classes and the type roles `text-body`, `text-caption`, `text-subheading`, `text-heading` and `text-hero`, never a hex colour or a raw size. The page's own styling uses the same variables (`--background`, `--card`, `--border`, `--primary`, `--foreground`, `--muted-foreground`, `--ring`) with light and dark themes.
- **Vocabulary:** use the terms in `decisions.md` as written: Brief, Slide, Section, Title slide, Option, Visual language, Episode page, Speaker notes, Voice script.
- **Motion library:** none named.

## Render presets

Each preset re-renders every mock at one width; `fit` is the full column.

| Preset    | Size                   |
| --------- | ---------------------- |
| `desktop` | 1920 px wide           |
| `laptop`  | 1440 px wide           |
| `tablet`  | 1024 px wide           |
| `mobile`  | 390 px wide            |
| `shorts`  | 1080 × 1920 (vertical) |

`shorts` is a fixed design size: the mock keeps its 1080 × 1920 layout, as YouTube Shorts shows it, and is scaled down to fit the viewport below the toolbar, so the whole 9:16 frame is visible without scrolling.

## Feedback

The page is a form that posts to a local review server with a `POST /` of `application/x-www-form-urlencoded`. This route takes precedence over your default. Fields:

| Field                  | Carries                                                                        |
| ---------------------- | ------------------------------------------------------------------------------ |
| `pick:<slug>`          | One per picked Option, valued by the Option id; `pick:top` for the Title slide |
| `note:<slug>`          | The comment on a Slide; optional                                               |
| `note:visual-language` | The note on the Visual language                                                |
| `note:page`            | The general comment on the whole page                                          |
| `next`                 | The Next action: `redesign` or `approve`                                       |

The server refuses `approve` while any Slide is set to Redesign or has more than one pick. Before you approve: accessibility (contrast, focus, motion), the German text length, what each pick costs to build, and what a Slide's Option copies from a shared one.

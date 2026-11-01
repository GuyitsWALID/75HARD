# Design Guide — “The Wall Chart”

## Direction

The interface should feel like a disciplined training log pinned to a white wall: precise, quiet, and physical. The 75-card field is the identity. No gradients, glass effects, decorative illustrations, or dashboard widgets.

## Tokens

- Paper — `#f2f2ef`: page ground
- White — `#ffffff`: cards and dialog
- Ink — `#111111`: primary type and completed cards
- Graphite — `#656565`: secondary type
- Rule — `#d8d8d3`: borders
- Alert — `#9f2b22`: destructive actions only

Dark mode inverts the same paper-and-ink system rather than introducing a new palette: paper becomes `#111111`, cards `#181818`, and ink `#f5f5f2`.

Typography uses **Arial Narrow / Arial** for compressed display numerals and **Inter / system sans-serif** for body copy. Uppercase utility labels use restrained letter spacing.

## Layout

```text
┌──────────────────────────────────────────────────────┐
│ 75 / HARD              18 / 75 complete   start date │
├──────────────────────────────────────────────────────┤
│                                                     │
│ A single sentence and a thin progress rule          │
│                                                     │
│ [01] [02] [03] [04] [05] ...                       │
│ [11] [12] [13] [14] [15] ...   75-card wall chart  │
│                                                     │
├──────────────────────────────────────────────────────┤
│ rules / export / reset                              │
└──────────────────────────────────────────────────────┘
```

Desktop uses a 10-column chart; tablet 5; mobile 3. A selected card opens a centered sheet. The card's large day number is the signature element and also the primary navigation target.

## States and motion

- Complete: ink fill, white type, visible check.
- Today: double inset rule.
- In progress: small segmented task rail.
- Future: reduced contrast, still editable.
- Hover/focus: a 2px lift and a strong outline.
- Card interactions last 160ms. The calendar rises 140px into place as it enters the viewport using Motion's scroll-linked animation; all motion is disabled when reduced motion is requested.

## Voice

Short, literal, and calm: “Open day”, “Add photo”, “Export backup”. Avoid motivational slogans and shame-based language.


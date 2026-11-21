# DESIGN.md: russh.work demos (2026-11-20)

Russ chose Tufte CSS as the visual world for every demo, and Impeccable as the design method. This file governs the demo pages only. The home page and blog keep `design.md`.

**Exception, 2026-11-20 (Russ: "each demo should match the ui of the company i am applying to"; asked which rule wins, he chose "company look wins").** A demo built for one employer takes that employer's visual language instead of this file: palette, type, spacing, radius and component style pulled from their public site and recorded in the package's `research\ui_tokens.md`. Open-licensed fonts only (the closest open font when theirs is commercial), inlined so the page makes no runtime requests. No logos, wordmarks, product screenshots or copied markup; the independence banner stays. The numbers, gates, voice rules and the 375 px and 320 px checks in this file still apply. Shared demos used for several targets stay on Tufte. Per-company so far: `mandate-desk` (Sanity), `limit-desk` (Mercury).

## Why this world

The demos are work samples a lender, a credit team or a finance operator reads to judge whether Russ thinks clearly. They should read like an analyst's report or a credit memo: a document first, with the working controls set into it. The old look (dark hero, lime pills, chip cards, giant KPI numbers, monospace everywhere, theme toggles) is the anti-reference.

## Source of the world

- Stylesheet: `assets/tufte/russh-tufte.css`, built by `assets/tufte/build_css.py` from Tufte CSS (MIT, edwardtufte/tufte-css) with ET Book inlined as base64 and `russh-extensions.css` appended. Every demo inlines the whole file so the page makes no runtime requests. Do not hand-edit the built file; edit the extensions and rebuild.
- Mode: Read for the narrative and findings; Operate for controls and tables. A demo is a document with an instrument inside it, never a dashboard with a paragraph on top.

## Type

ET Book only (roman, italic, bold), served from the inlined faces. Monospace only for code, record dumps and hashes. Headings follow Tufte: h1 regular, h2 and h3 italic. No uppercase tracked labels.

## Color

Paper `#fffff8`, ink `#111`, secondary `#4a4a44`, hairlines `#c9c9bf`. One accent, dark red `#8b1a1a`, used only for a flag, a breach or a failed check. Pass is `#2f5d34`, used only for check results. Dark mode follows the reader's system setting through the variables in the extensions; no toggle button.

## Layout

The Tufte column (55% with a right margin) for text. Sources, rule ids, formulas and caveats go in sidenotes or margin notes, not inline parentheses. Wide tables use `.table-wrap.wide` and scroll inside their own box on a phone. At 760px and below sidenotes fold in, as Tufte CSS already does.

## Components

- Title block: `h1` title, `p.subtitle` with the one-sentence description, then `p.notice` with the synthetic-data and affiliation line, then `nav.contents` with plain links to the sections. No eyebrow, no kicker, no badge.
- Headline figures: stated in a sentence (`p.figure-line`), with the number set in lining figures. Never a tile, a card or a giant number with a small label.
- Tables: booktabs rules from the extensions; numbers right-aligned in `td.num`; a caption in italics.
- Controls: rectangular bordered buttons, plain inputs and selects, radio groups in a `fieldset` with a `legend`. A selected choice is `aria-pressed="true"`, shown inverted. No pills.
- Status: words in `.pass`, `.fail` or `.flag`, never colored chips.
- Long detail (audit records, rule text, source passages): `details` with an italic `summary`.
- Footer: `footer.colophon` with "Russell Harris" and plain text "russh.work".

## Bans (Impeccable craft floor plus this site)

Eyebrows or kickers above headings. Section numbers like 01 / 02 unless the order carries meaning. Cards, chip cards, nested boxes. Hero-metric tiles. Pills. Gradients, glows, glass, hard offset shadows, any shadow. A colored bar down one side of a box. Monospace as costume. Emoji or Unicode glyphs as icons. Theme toggles. Uppercase tracked labels. Lime. Any external font, script, style or image request.

## Verify before publishing

Rendered in headless Chrome at 1280px and 375px: no console errors, no page-level sideways scroll, body text 4.5:1 or better, visible keyboard focus, every control still works, and the demo's own checks and publish gate still pass with unchanged figures.

## Rebuilding

Every demo with a build reads `assets/tufte/russh-tufte.css` at build time, so a change to the shared extensions changes those pages on their next rebuild. After editing `russh-extensions.css`, run `python assets/tufte/build_css.py`, then rebuild and rerun the render checks of every demo that inlines it before pushing. The pages published on 2026-11-20 were each verified against the stylesheet they were built with. Several pages carry a short page-level `<style>` that overrides shared rules; read it before changing a shared rule.


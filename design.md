# design.md

Portable brand spec for **russh.work**, the portfolio and blog of Russ. Forward Deployed AI Architect candidate. This document is the source of truth. Any HTML, CSS, slide deck, social card, or promo asset built for this brand must cite the tokens here. Drift is a defect.

---

## §1 Identity

A Uwe Loesch broadside for production AI. Brutalist typographic poster: monochromatic, asymmetric, screen-filling type that bleeds past the edges of the viewport. Mouse-driven variable-font distortion. Heavy momentum scroll. The page reads as a digital lithograph before it reads as a website.

Reference vocabulary, in order of weight:
1. Uwe Loesch posters, late 80s through 2000s
2. Wim Crouwel grids late period, before the new typography turn
3. Helmut Schmid editorial and packaging
4. Massimo Vignelli's Unimark NYC subway documentation
5. Vercel and Linear product surfaces, for the developer-tools tone of the metadata
6. Lenis-driven momentum scroll references (Awwwards 2024 cohort)

The brand is not retro. It is not nostalgic. It uses brutalist poster design language because the language was built to stop a viewer's eye on a single visual object and then earn their attention with what the object says. The portfolio is the same task: stop the reader, then deliver the receipts.

Three rules that override anything else in this document:
1. **Asymmetry over balance.** Centered layouts are a failure mode.
2. **Type as object.** Headlines are visual mass, not labels.
3. **Receipts, not promises.** Every numeric claim is real, sourced, and matches the production system.

---

## §2 Typography

Two families. They do not compromise toward each other. The clash is the brand.

### Display family

**Inter Tight, variable.** Free, on Google Fonts. Weight axis 100 to 900. The display family carries the poster moments: the hero, the project list titles, the section headers.

```
--font-display: 'Inter Tight', 'Inter', 'Helvetica Neue', Arial, sans-serif
```

Recommended alternates if Inter Tight is ever unavailable: Inter (also variable), Söhne (paid), Neue Haas Grotesk (paid, the spiritual reference).

### Mono family

**JetBrains Mono, variable.** Free, on Google Fonts. Used for every label, every metric, every metadata block, every body of running copy on the landing page, and all blog copy except thesis-post body (see §2.3). The mono is the technical voice of the site.

```
--font-mono: 'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace
```

Recommended alternates: Space Mono, IBM Plex Mono.

### Role assignment

- **Display** for hero poster type, project-list titles, section opener headlines, and the wordmark.
- **Mono** for navigation, metadata, metric values, body copy on the landing page, blog Ship Notes and Field Notes body, and any element behaving like instrument readout or terminal output.
- **Thesis-post body** is the one exception: long-form thesis posts use mono at 15px for readability, not display. Headings inside thesis posts switch back to display.

There is no serif on this site.

### Weights

Display ships in five working weights:
```
--weight-thin:     200
--weight-regular:  400
--weight-medium:   500
--weight-semibold: 600
--weight-bold:     800
```

The 200 is reserved for the giant hero word. 400 is body. 500 is metadata. 600 is hover-state for project titles. 800 is reserved for project-list titles and the project detail headlines. No 900. No italics on display. The mono uses 400 and 500 only.

### Type scale

The display scale is aggressive on the hero, then drops into a working scale below. The hero word is sized in `vw` because the poster moment is viewport-relative; everything below the hero is in `px`.

```
--type-poster:    clamp(160px, 28vw, 480px) / 0.78 / weight 200 / tracking -0.04em
--type-massive:   clamp(72px, 12vw, 192px)  / 0.85 / weight 800 / tracking -0.035em
--type-h1:        clamp(48px, 6vw, 96px)    / 0.95 / weight 800 / tracking -0.03em
--type-h2:        clamp(32px, 4vw, 56px)    / 1.0  / weight 600 / tracking -0.02em
--type-h3:        24px / 1.2 / weight 600 / tracking -0.01em
--type-body-lg:   18px / 1.55 / mono 400
--type-body:      15px / 1.6  / mono 400
--type-body-sm:   13px / 1.5  / mono 400
--type-mono-sm:   12px / 1.4  / mono 500 / tracking 0.08em / uppercase
--type-mono-xs:   11px / 1.35 / mono 500 / tracking 0.12em / uppercase
```

The mono lockup at 11px/0.12em tracking is the dominant texture of the metadata layer.

### Numeric handling

All numerals use `font-variant-numeric: tabular-nums`. The display poster uses default proportional spacing. The mono always uses tabular.

---

## §3 Color

Strictly monochromatic. The brand has no accent color. Hierarchy is achieved through size, weight, position, and opacity. This is the most important constraint in the document.

```
--void:       #0A0A0A   (background, deep black warmed by 4% toward bistre to avoid screen-pure blacks)
--paper:      #F4F4F4   (foreground, architectural white, slightly off-pure)
--mid:        #8A8A8A   (secondary text, 54% luminance against void)
--dim:        #404040   (tertiary text and rule lines, 25% luminance against void)
--hairline:   rgba(244, 244, 244, 0.12)
--rule:       rgba(244, 244, 244, 0.32)
```

### Application rules

- Background is always `--void`. There is no light mode in v1. There will not be a light mode in v2.
- Primary text is `--paper`. No exceptions in running copy.
- Secondary metadata (timestamps, tags, supporting labels) uses `--mid`.
- Tertiary state (inactive nav, dismissed elements, low-priority labels) uses `--dim`.
- The single hover state for project titles is **stroke-only**: text fills with transparent and gains a 1px `--paper` outline via `-webkit-text-stroke`. No color change. The shift from filled to outlined is the only hover treatment the brand uses on display type.
- The single hover state for mono links is **inversion**: background fills with `--paper`, text inverts to `--void`. A 100ms transition. No underline.
- No shadows. No glows. No gradients. The brand is flat by mandate.

### Contrast verification

- `--paper` on `--void`: 18.9:1 (AAA, well above)
- `--mid` on `--void`: 5.7:1 (AAA for large text, AA for body)
- `--dim` on `--void`: 2.3:1 (fails AA, used only for decorative or large-format labels, never body)

If `--dim` is appearing in a context that fails AA, it is being used wrong.

---

## §4 Spacing and grid

Base unit 4px. The scale runs aggressive at both ends to support poster moments.

```
--space-0:   0
--space-1:   4px
--space-2:   8px
--space-3:   12px
--space-4:   16px
--space-5:   24px
--space-6:   32px
--space-7:   48px
--space-8:   64px
--space-9:   96px
--space-10:  128px
--space-11:  192px
--space-12:  256px
```

### The intentionally broken grid

The site does not use a centered 12-column grid. It uses **viewport-edge anchors**:

- Page outer margin is `--space-5` (24px) on desktop, `--space-4` (16px) on mobile. Everything else is positioned relative to viewport edges, not to a centered content column.
- The hero anchors its dominant word to the **top-left** of the viewport. A secondary block anchors to the **bottom-right**. The negative space between them is intentional.
- The project list anchors its titles to the **left edge** of the viewport, with metadata anchored to the **right edge** of the viewport. The titles and metadata do not share a centered column; the gap between them is part of the composition.
- Section headers anchor to one edge per section, alternating across the page (left, right, left, right) to keep the reader's eye traveling.
- No element ever sits in the geometric center of the viewport. If a layout puts something dead-center, the layout is wrong.

### Vertical rhythm

Sections are tall. Each major section occupies at least 100vh on first viewing. The reader scrolls into a new section, not across density-packed cards.

- Hero: 100vh exact.
- Project list: variable height, each project row at least 20vh.
- Writing index: 80vh minimum.
- Footer: 60vh minimum.

This is the opposite of the manual aesthetic. The brand is a series of poster moments, separated by space, connected by scroll momentum.

---

## §5 Motion

The motion vocabulary is short and specific. Three named motions own the experience.

### §5.1 Mouse-driven variable-font distortion

The hero word listens to the cursor. Mouse X position maps to font weight (200 to 800 across the viewport width). Mouse Y position maps to a subtle horizontal letter-spacing shift (-0.04em to -0.06em). The mapping is lerped at 0.08 per frame so the type does not jitter.

When the cursor leaves the viewport, the type returns to its rest state (weight 200, tracking -0.04em) over `--dur-base`.

`prefers-reduced-motion` disables the distortion entirely. Type renders at rest state.

### §5.2 Heavy momentum scroll

The page uses **Lenis** for smooth scroll with momentum. Configuration:

```
duration: 1.2
easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t))
smoothWheel: true
wheelMultiplier: 0.8
touchMultiplier: 1.5
```

The result is a slightly heavier scroll than browser default. Not slow, just weighted. The page feels like it has mass.

A scroll-velocity hook reads the current scroll speed and applies a `skewY` transform to the project list of up to 1.5deg when scrolling fast, returning to 0deg when stationary. The skew is on the list, not on individual rows. Subtle enough that most users will feel it as physical momentum without noticing the effect.

### §5.3 Project hover reveal

Hovering a project title in the list does three things simultaneously, all over 240ms with `--ease-precision`:

1. The title text fills with transparent and gains a 1px `--paper` stroke (text becomes outlined).
2. A background panel fades in behind the title row at 60% opacity, carrying either an AI-generated concept image, a code snippet, or a system diagram (per-project asset).
3. The mono metadata block slides in from the right edge by 32px and fades from 0 to 1 opacity.

Leaving the hover reverses all three over 320ms with `--ease-decel`.

### Easing and durations

```
--ease-precision:  cubic-bezier(0.4, 0, 0.2, 1)
--ease-decel:      cubic-bezier(0, 0, 0.2, 1)
--ease-accel:      cubic-bezier(0.4, 0, 1, 1)
--ease-power:      cubic-bezier(0.83, 0, 0.17, 1)

--dur-quick:      100ms   (inversion on mono link hover)
--dur-base:       240ms   (hover state transitions on display type)
--dur-deliberate: 480ms   (section enter, project click lock)
--dur-slow:       960ms   (project detail expand, list slide-off)
```

### Click-to-detail transition

When a project title is clicked:
1. The clicked row locks in place at the top of the viewport (translate to y=0, fixed) over `--dur-deliberate` with `--ease-power`.
2. The remaining list rows translate off-screen to the right with a 60ms stagger between rows.
3. The detail content fades in from below over `--dur-slow` with `--ease-decel`, anchored to a narrow text column (max-width 640px) offset 25% from the left edge of the viewport.
4. A subtle 1px `--rule` vertical line draws down the right edge of the text column during the expand.

The reverse (close detail) is the same sequence in reverse, with the same timings.

---

## §6 Effects

Four signature effects. No additions without a design.md changelog entry.

### §6.1 Hero poster
Two stacked words filling the viewport. Top word anchored top-left, bleeding off the right edge by 5 to 8 percent of its width (overflow hidden on the body). Bottom word anchored bottom-right, smaller, in a counter-position. The two words taken together form a poster, not a sentence. Variable-font axes respond to mouse per §5.1.

### §6.2 Terminal block
A monospace block fixed in the bottom-right corner of the viewport, 32px from edges. Contents: a blinking 8x14px `--paper` block cursor, followed by current status text. Three lines:

```
> CURRENTLY: trialedge v1.6, ship notes pending
> STACK: cloudflare / supabase / openrouter / gemma 3 27b
> BUILD: 2026.05.19 / commit a4f9b21
```

The block cursor blinks at 600ms cadence using `steps(2, end)`. The status lines update from a JSON file (`/content/status.json`) at build time. The terminal block exits when the user scrolls past 50vh and returns when they scroll back. Transition `--dur-base` `--ease-precision`.

### §6.3 Project-list as broadside
The project list is the dominant scroll surface of the page. Each row is left-aligned to the viewport edge, set in `--type-massive`. Rows are separated by a 1px `--hairline` rule. Hover treatment per §5.3.

A small two-digit number prefixes each title, in `--type-mono-xs`, positioned to the left of the title flush to the page edge. The number stays solid `--paper` even when the title outlines on hover. The number reads as a registration mark for the row.

### §6.4 Scroll-velocity skew
The body or the project list (target TBD on first iteration) skews by up to 1.5deg on the Y axis based on scroll velocity. Returns to 0deg when velocity is below 50px/frame. Applied via a `requestAnimationFrame` loop reading Lenis scroll deltas. Disabled under `prefers-reduced-motion`.

### Effects NOT included
- No film grain. Drop.
- No registration crosshair marks in corners. Drop.
- No section numbers in margins. Drop.
- No double-rule dividers. Drop.
- No drawn-on technical diagrams on the landing page. Diagrams move to the project detail pages and the blog posts.
- No mid-century anything. The previous direction is dead.

---

## §7 Components

### §7.1 Wordmark
`RUSSH.WORK` in mono, 14px, weight 500, tracking 0.16em. The `.` between words is `--mid` color, the rest is `--paper`. No icon. No square. Just the type.

### §7.2 Navigation
Top-right of the viewport, fixed, mono xs (11px). Five items: WORK, WRITING, FIELD NOTES, ABOUT, CONTACT. Active item has `--paper` text. Inactive items are `--mid`. Hover treatment: inversion per §3 (background `--paper`, text `--void`, no border-radius, padded 4px 8px).

### §7.3 Project list row
The dominant interactive element of the page. Structure:

```
[NUM]   [TITLE]                              [METADATA]
01      ATLAS                                2026 / VERCEL / GEMMA 3 27B
                                             CUSTOMER-FACING / NC WHOLESALE
```

- Row is at least 20vh tall.
- `[NUM]` is mono xs, `--mid`, left-edge of viewport (24px margin).
- `[TITLE]` is `--type-massive` weight 800, `--paper`, left-aligned.
- `[METADATA]` is mono xs, `--mid`, right-aligned to viewport edge, hidden until hover, slides in from the right per §5.3.
- Hover triggers: title outlines, background panel fades in at 60% opacity, metadata slides in.
- Click triggers the §5 detail transition.

### §7.4 Terminal block
Per §6.2. Component lives at `components/terminal.html` or equivalent for the static-site setup.

### §7.5 Section header
Massive single-line headline anchored alternately to left or right edge. Section number sits above the headline in mono xs `--mid`. No description copy in the header itself; the description is in the first body block below.

### §7.6 Blog post page (thesis archetype)
- Narrow column, max 640px text width, anchored at 25% from left of viewport.
- Section headers in display weight 800.
- Body in mono 15px, line-height 1.6.
- Pull quotes in display weight 200, italicized, sized at `--type-h2`.
- Code blocks in mono 13px, `--dim` background, `--paper` text.
- Footnotes at bottom in mono xs, numbered, backlinked.

### §7.7 Blog post page (ship-note and field-note archetypes)
- Same column position and width as thesis archetype.
- Body in mono 13px (smaller than thesis), tighter.
- Header includes a metric strip directly under the title: three numbers in display weight 800, label below each in mono xs. The metric strip is the hook of the ship-note format.

---

## §8 Voice

These rules carry from Atlas, ODI Bot, and TrialEdge. Same rules across every surface, including this document. Audit before saving.

- **No em-dashes.** Use commas, parentheses, semicolons, colons. Search `—` and `–` before publish.
- **No exclamation points.** Anywhere. Copy, alt text, commit messages that get surfaced in ship notes, none of it.
- **No superlatives.** No "amazing", "incredible", "world-class", "revolutionary", "best in class", "robust", "seamless".
- **No urgency manipulation.** No "limited time", "before it's too late", no countdown timers.
- **No "we buy houses" energy.** The site sells judgment, not promotion.
- **Specific over general.** "AUC 0.686 on a 208-outcome held-out set" beats "high predictive accuracy".
- **Acknowledge complexity without condescension.**
- **Privacy posture.** Atlas references "a wholesale operator in Wake+Durham, NC". ODI references "real brand engagements". Mosaic CRE references the deal type and corridor, never the principals.

---

## §9 Anti-patterns

This list is not aspirational. These are banned. If a generated output contains one of these, it is sent back to draft.

### Visual
- Centered layouts of any kind
- Card grids with rounded corners
- Drop shadows of any kind
- Border-radius above 0px on any element, including buttons
- Color accents beyond the monochrome scale defined in §3
- Glassmorphism, frosted-glass, backdrop-blur on any surface
- Gradients of any kind
- Light mode
- Icons of any kind (no lucide, no heroicons, no emoji, no SVG decorations except diagrams in blog posts)
- Hero centered with three feature columns
- Hover-lift transforms on cards (transform: translateY(-4px))
- Skeleton loaders with shimmer
- Loading spinners (indeterminate horizontal bars only)
- Carousels
- Video backgrounds
- Auto-playing audio
- Marquee scrollers
- Sticky CTA bars
- Cookie banners larger than 48px tall
- Pastel anything
- The Tailwind blue palette (#3B82F6 family)
- Purple anything
- Material Design ripple effects

### Copy
- "Get started for free"
- "Built for the next generation of [X]"
- "AI-powered [anything]" (specify the model and the task)
- "Trusted by teams at [logos]"
- "Used by [N] companies"
- The word "seamless"
- The word "robust"
- The phrase "best in class"
- Emoji, anywhere, ever, including in code comments

### Behavior
- Auto-playing scroll-jacked animations that take control from the user
- Cursor-tracking elements that hijack the cursor (the variable-font distortion is allowed; cursor replacement is not)
- Forced full-screen sections that hijack the scrollwheel
- Modal popups within 10 seconds of landing
- Newsletter signup interstitials
- Live chat widgets
- Sticky promotional banners

---

## §10 File ownership

This document lives at the repo root as `design.md`. When `tokens.css` is generated from it, the CSS file's variable names must exactly match the design.md token names so an agent reading either file can navigate between them.

The first artifact rendered against this spec is `index.html` at the repo root. When a new surface is added (project detail page, blog post template, slide deck, social card), it is built against this spec and adds a section to `§7 Components` describing what was added and which existing tokens it used.

Updates to this document require a brief diff note at the bottom (`§11 Changelog`) with date, what changed, and why.

---

## §11 Changelog

- 2026-05-19a: Initial draft. Mid-century scientific direction. IBM Plex, cream paper, navy and burnt orange.
- 2026-05-19b: **Complete rewrite.** Direction pivoted to Uwe Loesch brutalist poster. Monochrome black on white locked. IBM Plex replaced by Inter Tight variable + JetBrains Mono. Six-color palette collapsed to two-color plus three opacity stops. Mid-century reference vocabulary removed entirely. Mouse-driven variable-font distortion added. Lenis momentum scroll added. Project list redesigned as full-width brutalist broadside. Hero redesigned as two-word digital lithograph. Cards eliminated. Registration marks, grain layer, double-rule dividers, and section numbering all removed. Domain locked: russh.work.

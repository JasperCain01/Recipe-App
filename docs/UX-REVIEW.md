# UX & Aesthetic Review — Trusted Recipe Finder

*An expert evaluation of the current interface. No code changes — this is the diagnosis and the direction. Requested prompt: "undertake a dedicated ux review of this app. at the moment, I think it feels a bit dark and clunky. I don't find it to be an app that feels polished and smooth. suggest how it could be made to feel warm, friendly and inviting, and intuitive to use on desktop, phone and tablet devices."*

---

## TL;DR

The app's engineering is genuinely good — the theme-token architecture, virtualised list, live debounced search, chip entry with autocomplete, and the accessibility work (focus rings, 40px tap targets, ARIA states) are all solid bones. The problem is entirely in the *skin* and the *framing*: the visual language is 2015-era Material Design admin-dashboard (teal + amber, grey surfaces, 1px borders on everything, an 11px uppercase label system), the results are presented as a seven-column spreadsheet, food photography is reduced to 40px postage stamps, and the copy speaks the developer's vocabulary ("index", "enrich", "sources") rather than the cook's. None of that is expensive to fix — and because every colour already flows through `ThemeTokens`, a large share of the transformation is a token-value swap.

---

## Part 1 — Why it feels "dark"

### 1.1 The palette is cold, institutional Material teal

Light theme: `#FAFAFA` background, white surfaces, grey borders, teal `#00796B` primary, amber `#FF8F00` secondary. Dark theme: `#121212` / `#1E1E1E` / `#2A2A2A` neutral greys. This is, almost value-for-value, the stock Material Design 2 palette — the default of a thousand internal tools. It has zero food association. Nothing in it says kitchen, warmth, or appetite:

- The greys are **pure neutrals** (equal R/G/B). Neutral grey under artificial light reads cold and clinical. Warm interfaces bias their neutrals toward red/yellow — cream instead of white, espresso instead of charcoal.
- **Teal is the least food-adjacent hue on the wheel.** Blue-greens actively suppress appetite associations (there is almost no naturally teal food); every successful food product (Deliveroo aside) lives in warm territory — tomato, terracotta, saffron, sage, cream, butter.
- The **danger-red is doing too much work** (see 1.3), so the strongest colour on the results screen is frequently negative.

### 1.2 The header is a heavy saturated band

A solid `#00796B` bar with a drop shadow, white uppercase-tracked subtitle, and boxy outlined tab buttons. It's the visually heaviest element on every screen and it's the coldest colour in the app. It also has a redundant subtitle — the `<h1>` says "🍽 Trusted Recipe Finder" and the sub directly beneath says "RECIPE FINDER" again.

### 1.3 Negative framing colours the whole results view red

- `scoreColor` paints any match **below 60% in the danger red** (`scoreLow` = `#C62828`/`#EF5350`). With the default threshold at 25%, a large fraction of every result set renders its most prominent number in error-red. A 40% match is a perfectly good outcome — "you have almost half of this already" — but it's presented as a failure.
- The desktop table ends in a **"Missing" column of red numbers**; the mobile card shows "2 missing" in red. The recipe detail banner ("You'll need:") is styled with `dangerBg`/`dangerBorder` — the visual language of a form validation error, applied to a shopping list.
- "No matches found above 25%…" renders in the **red error banner** — but zero results is a normal outcome of a strict query, not an error.

Cumulative effect: the app constantly tells the user what they *lack*, in red, which reads as both dark and unfriendly.

### 1.4 Dark theme specifics

`#121212` with `#383838` borders and `rgba(0,0,0,0.5)` shadows is maximal-contrast gloom. A warm dark theme (deep brown-greys, e.g. hue-shifted toward `#1C1815`-family values, softer borders, tinted accent glows) keeps the low-light benefit while feeling like a candlelit kitchen instead of a server room. Also note `textFaint` `#8A8A8A` on `#1E1E1E` is ≈3.6:1 — below WCAG AA (4.5:1) for the small text it's used on.

---

## Part 2 — Why it feels "clunky"

### 2.1 The results are a BI dashboard, not a recipe browser

The desktop results view is a **seven-column data table** — Recipe, Match, Meal, Cuisine, Time, Steps, Missing — with sortable headers and a filter dropdown embedded *inside each column header*. That's a pattern from analytics tools. For a recipe app it has three costs:

- **Photography is demoted to a 40px thumbnail.** Food sells itself through images; the single strongest "warm and inviting" asset the app already possesses (each recipe's real photo) is rendered smaller than the star button next to it.
- **Meal/Cuisine/Time/Steps don't earn columns.** Nobody scans down the Cuisine column comparing values; these are *filter facets* and *per-recipe metadata*, not comparative data. As columns they add four vertical grid lines of visual noise and force the fixed-width truncation dance (`52px`, `96px`, `104px`, `88px`…).
- **Filter-in-header is undiscoverable and cramped** — a `0.7rem` "Any ▾" trigger squeezed under an 11px uppercase sort label.

### 2.2 Border-everything, shadow-nothing

Every container — cards, rows, chips, inputs, buttons, dropdowns — is delimited by a 1px solid border. Rows sit 2px apart, so the results list reads as a ruled grid. Modern "soft" UI does the opposite: separation via background contrast, whitespace, and low-opacity shadows, with borders reserved for inputs and emphasis. The current app has exactly two shadows (header, dropdown panels) and roughly forty borders per screen.

### 2.3 Typography works against polish

- **Georgia (a print serif) at a 14px base for the whole UI.** Serifs at 11–14px on screens render muddy, especially light-on-dark. Georgia also has no weight range — the UI only has "regular" and "bold", so hierarchy is faked with uppercase + letter-spacing.
- **The 0.7rem (11.2px) uppercase-tracked label** is the app's workhorse style — section labels, column headers, table meta, buttons, the "match" caption, status lines. Tiny + uppercase + wide tracking is the typography of legal disclaimers and admin consoles. It's the single biggest contributor to the "administrative" feel.
- **Size anarchy:** the codebase uses ~14 distinct one-off font sizes (0.7, 0.72, 0.75, 0.78, 0.8, 0.85, 0.88, 0.9, 0.92, 1.0, 1.1, 1.25, 1.35, 1.4rem). There is no scale, so nothing lines up optically.

### 2.4 Radius and spacing inconsistency

Corner radii: 4px (tabs, filter triggers), 5px (recipe image, banner), 6px (inputs, buttons, rows), 8px (cards), 10px (meta chips), 20px (chips). Six radii with no system. Same for spacing — a mix of 0.3/0.35/0.4/0.45/0.5/0.6/0.65/0.75/0.875rem paddings. Each is fine alone; together they produce the subliminal "something's off" that reads as unpolished.

### 2.5 Emoji as an icon system

⚠ ⏳ ✓ ★ ☆ × ▾ ⓘ ↗ 📋 📤 ☀️ 🌙 🍽 carry the app's iconography. Emoji render differently on every OS, ignore the theme's colour system, sit inconsistently on the baseline, and read as homemade. (The favicon is still the stock Vite logo, which compounds this.)

### 2.6 Nothing moves

The only transitions are 0.15–0.2s colour fades on buttons. Row expansion snaps open with no animation; results appear/disappear instantly as the debounce fires; the star doesn't pop; the progress bar is a 3px hairline. "Smooth" is literally motion — an app with zero easing on layout changes will always feel abrupt regardless of how it's painted.

### 2.7 The copy speaks engineer, not cook

- **"Index" / "Re-index" / "Enrich now" / "Re-enrich" / "enriched"** — pipeline vocabulary as primary UI verbs. "Not enriched — ingredient search unavailable" is a status line no home cook can parse. (What the user means: *"finding recipes on this site"* and *"getting recipes ready to search"*.)
- **"Sources"** is librarian-speak for "my recipe sites".
- **"Show matches above 25%"** with an ⓘ whose explanation lives in a `title` attribute — which **never appears on touch devices**, i.e. the app's core scoring concept is unexplained on phones and tablets.
- The empty state on first visit is not a welcome — it's a label row, an input, and silence. There's no "What's in your fridge?" moment, no sample search, no hint of what the app will do for you.

### 2.8 Small structural oddities

- The **Favourites toggle** is a lone chip floating between the threshold slider and the results — it's a *view switch* (all recipes vs. saved recipes) presented as a filter chip in an arbitrary location.
- The **threshold slider** is a native `<input type=range>` — fiddly on touch, styled by the browser, visually foreign to the rest of the UI.
- **Un-enriched sources at 0.45 opacity with a ⚠** on the search tab look broken rather than "needs one more step".
- Success messages auto-dismiss after 5s; progress states are 0.7rem text lines — the moments where the app *does something impressive* (indexing a whole site live) are visually whispered.

---

## Part 3 — Device-by-device

### Desktop
- `main` is capped at **820px** — sensible for forms, but it forces the 7-column table to fight for space (title column gets ~350px) while leaving dead margins on any modern monitor. A results *grid* (see 4.4) or a 1000–1100px cap would breathe.
- Hover states are minimal (colour-only); rows don't respond to hover at all, which makes the click-to-expand affordance invisible — nothing signals rows are interactive until you try.

### Phone
- The card layout below 640px is the best part of the current UI — the right structure already exists.
- But: header tabs are small buttons at the **top** of the screen (opposite the thumb); the four sort chips + Filters accordion stack pushes results below the fold; `title`-attribute tooltips (threshold ⓘ, chip "REQUIRED/optional" explanation, star labels) are all **unreachable on touch**; and the ingredient input's `fontSize: 0.85rem` (13.6px) will trigger **iOS Safari auto-zoom** on focus (inputs need ≥16px), which is a classic "clunky on my phone" cause.

### Tablet
- There is exactly **one breakpoint (640px)**, so an iPad portrait (768px) gets the full seven-column desktop table crammed into its narrowest useful form — the worst of both layouts. Landscape gets the 820px column swimming in margin. Tablets need a middle tier: a 2-column card grid, comfortable touch targets, and the mobile filter pattern.

---

## Part 4 — Recommendations

Ordered by impact. Because all colour already flows through `ThemeTokens` and all component styles through `getStyles`/helpers, phases 1–2 are largely centralized changes.

### 4.1 Re-tokenise to a warm palette (highest impact, lowest risk)

Swap the token *values*, keep the architecture:

| Role | Now (light) | Direction |
|---|---|---|
| Background | `#FAFAFA` cold grey | Warm cream — e.g. `#FAF6F0` / `#FBF7F1` family |
| Surface | pure white | Soft warm white `#FFFDFA` |
| Primary accent | Teal `#00796B` | Terracotta/paprika — `#C4552D`–`#D26644` family, or a deep tomato |
| Secondary | Amber `#FF8F00` | Saffron/honey `#E8A33D`, used generously (stars, highlights) |
| Support | — | A sage/herb green for success (`#5F7A50` family) so "✓ have all" feels like herbs, not a traffic light |
| Text | `#212121` | Warm espresso `#2E2621` |
| Dark bg | `#121212` neutral | Warm near-black `#1C1815` with surfaces `#26211C` / `#2E2822` |

Add two tokens the system is missing: an `elevated` surface (for hover/expanded states) and a soft `shadowSoft` (e.g. `0 2px 8px rgba(46,38,33,0.08)`) so depth can replace borders. Re-check contrast while at it (`textFaint` fails AA in dark mode today).

### 4.2 Typography: humanist sans for UI, expressive serif for headings only

- Body/UI: a friendly rounded-humanist sans — **Nunito Sans**, or the zero-cost option, the system stack (`-apple-system, Segoe UI, Roboto…`). Base size **16px**, with a real scale (e.g. 12 / 13.5 / 15 / 16 / 18 / 22 / 28) replacing the fourteen ad-hoc sizes.
- Keep a serif **only for the app title and recipe titles** — something with warmth like **Fraunces** or **Lora** gives "cookbook" character precisely where Georgia-everywhere gives "newspaper classified".
- Retire the 0.7rem uppercase-tracked label as the default voice: section labels become 13px medium-weight sentence case; keep uppercase micro-labels for at most one level of the hierarchy (e.g. column headers), if at all.
- Since the app is a GitHub Pages SPA, self-host any webfont via `@fontsource/*` packages — no external font CDN needed.

### 4.3 Soft depth system

- One radius scale: **12px** cards/rows, **8px** inputs/buttons, **999px** pills. Nothing else.
- Replace row/card borders with: surface-on-background contrast + `shadowSoft`, borders kept for inputs and the focused/expanded state.
- Space rows **8–10px** apart instead of 2px; raise row padding so thumbnails get 56–64px.
- Hover: slight lift (shadow deepens, background shifts to `elevated`) with a 150ms ease — this alone makes rows feel clickable and the app feel "smooth".

### 4.4 Reframe the results: from spreadsheet to menu

- **Lead with the photo.** 56–64px rounded thumbnails in list rows; better, offer the desktop a **card grid** (2–3 columns of image-topped cards) as the default view with the dense list as a toggle for power users. The data pipeline already delivers images — they're the app's free warmth.
- **Collapse Meal/Cuisine/Time/Steps columns** into a single line of quiet meta chips under the title (the mobile card already does exactly this — promote that pattern to desktop). Result: two real columns (Recipe, Match) plus meta — the table stops being a table.
- **Move all four filters into one filter bar** above the results (chips/dropdowns in a row, "Clear" at the end), same component on every device. Sort becomes one compact "Sort: Best match ▾" dropdown instead of four chips + arrow headers.
- **Flip the framing to positive:** match badge as a soft pill ("**82% match**") coloured warm-green → honey → neutral (never red); "Missing 2" becomes "**You have 7 of 9**"; the recipe-card banner becomes a friendly *shopping list* card ("Just need: feta · lemon — Copy list") in saffron, not a danger box. Reserve red exclusively for real errors.
- **"No matches" is guidance, not an error:** neutral empty-state panel with one-tap actions ("Lower match threshold", "Make chicken optional") instead of the red banner.

### 4.5 Speak cook, not pipeline

- Tab names: **Find recipes · My sites · My staples** (or Cupboard — but explain it).
- "Indexing…" → "**Finding recipes on jamieoliver.com…**"; "Enriching 40/120" → "**Getting recipes ready… 40 of 120**"; "Not enriched" → "**One more step — prepare these recipes for searching**". Add/index/enrich is already auto-chained for new sources, so the Index/Re-index/Enrich buttons are recovery tools: demote them into a "⋯" overflow menu per source and let the status line be a single friendly sentence + progress bar (make it 6–8px tall and proud, not a 3px hairline — it's the app's most impressive moment).
- Threshold slider → labelled friendliness: "**How close a match?** Strict · Balanced · Flexible" (3–4 stops), or keep the slider with an always-visible one-line explanation instead of the touch-inaccessible ⓘ tooltip.
- First-run hero on the Search tab: "**What's in your kitchen?**" headline, the input front-and-centre, quick-add chips styled as inviting suggestions, and a sample-search link ("Try: chicken, lemon, rice"). The app currently *has* built-in recipes ready on first load — greet the user with that fact.

### 4.6 Header & navigation

- Lighten the header: cream/surface background with the terracotta reserved for the active-tab underline and the wordmark — or keep a coloured band but in the warm primary at reduced visual weight (no drop shadow, more breathing room).
- Kill the duplicate subtitle; replace with nothing (or a one-time tagline).
- Tabs as an **underline/segmented pattern** rather than outlined boxes.
- On phones, move navigation to a **bottom tab bar** (thumb zone) — three tabs is the perfect count for it.
- Real favicon + app icon; a small SVG wordmark/logo (even a simple pan or citrus mark) instead of 🍽.
- Replace the emoji icon set with a consistent line-icon set (Lucide is the natural fit for React, tree-shakeable) — keep the *source* emojis (🍕 🍜 🎂), which are genuinely charming as content, but stop using emoji as UI chrome.

### 4.7 Motion (the "smooth" in smooth)

- Animate row expand/collapse height (~200ms ease-out) — the single most-felt interaction in the app.
- Star toggle: small scale "pop" (~150ms).
- Results changes: fade/translate-in (staggered 20–30ms) rather than instant swap; a subtle fade on filter changes.
- Buttons/chips: consistent 150ms ease on colour, shadow, and transform (a 1px press-down).
- Respect `prefers-reduced-motion` throughout.

### 4.8 Device polish

- **Phone:** bottom nav (4.6); input font-size ≥16px to stop iOS zoom; replace all `title` tooltips with tap-friendly popovers or visible microcopy; sticky ingredient input while scrolling results; filter sheet as a bottom drawer.
- **Tablet:** add a middle breakpoint (~641–1024px) with a 2-column card grid and the mobile filter pattern; let `main` use the width.
- **Desktop:** widen to ~1000–1100px for the grid; hover states everywhere something is clickable; keyboard affordances are already good — keep them.

### 4.9 Accessibility (protect the good work, fix the gaps)

Already strong: `:focus-visible` outlines, 40px targets, `aria-pressed`/`aria-expanded`, combobox semantics. To fix while restyling: `textFaint` contrast in dark mode; don't let the new palette drop below 4.5:1 for body text; stop conveying "missing/have" by colour alone (pair with the "7 of 9" wording — which 4.4 does anyway); add `aria-live="polite"` to the result count so screen readers hear results change during live search.

---

## Part 5 — What to keep

- The **token architecture** (`ThemeTokens` → `getStyles`) — it's exactly why this restyle is cheap. Every recommendation above lands as token values + shared style helpers.
- **Chip-based ingredient entry** with comma/Enter commit, backspace-to-remove, and autocomplete — genuinely nice interaction design; it just needs the new coat of paint.
- **Live debounced search** — the app already *behaves* smoothly; it only needs to *look and move* like it.
- **Mobile result cards** — the right structure; promote the pattern rather than replacing it.
- **Virtualisation, incremental enrichment writes, cancel button, a11y states** — invisible quality that the visual layer currently undersells.

## Suggested phasing

1. **Warmth pass (a day-ish):** token values (light + dark), typography scale + font swap, radius/shadow/spacing system, positive score colours, header lightening. Transforms the feel with near-zero structural risk.
2. **Results & language pass:** meta-chips-under-title everywhere, filter bar, match pill, "have X of Y" framing, cook-friendly copy, friendly empty/no-match states, icons.
3. **Structure & motion pass:** desktop card grid + view toggle, tablet breakpoint, bottom nav on phones, expand/collapse + micro-animations, first-run hero.

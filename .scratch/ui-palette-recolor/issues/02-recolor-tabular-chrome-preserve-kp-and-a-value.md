# 02: Recolor tabular chrome while preserving Kp and A-value encoding

**What to build:** A visitor reading any tabular space weather product (3-day forecast probabilities, 27-day outlook, daily geomagnetic indices) sees table chrome fully on the new UI palette — borders, header cells, subheader cells, and alternating row stripes in indigo-tinted tones — but the data-encoded colors are untouched so Kp index storm bands and the A-index values retain their established meaning.

**Blocked by:** 01: Introduce UI palette tokens and recolor accents, surfaces, and navigation

**Status:** ready-for-agent

- [ ] Table borders, header cells, and subheader cells render via color tokens (not hardcoded `rgb(129,129,129)` / `rgb(36,36,36)` / `rgb(53,53,53)`)
- [ ] Alternating row stripes render via `color-mix(in srgb, var(--color-deep-indigo) 12%, black)` and `18%`, preserving dark readability without cold grays
- [ ] Row and cell hover outlines render via tokens and remain visible against the new surfaces
- [ ] The Kp index presentation bands (`.kp01` through `.kp9`) remain byte-identical — no token, no hue shift, no `!important` removal
- [ ] The A-index value cells (`td[a-value]`) remain byte-identical for the same reason
- [ ] All other table selectors (`td[cellType]`, `th`, `tr:nth-child`, hover states) are on tokens and no stray gray survives outside the two frozen selectors
- [ ] Tables remain semantic HTML with headings in order and are paired with their charts per the coding standards — no accessibility regression; Playwright axe per tabular page passes
- [ ] Tests via the rendered-output seam: tabular component smoke asserts chrome tokens and explicitly asserts frozen cells unchanged


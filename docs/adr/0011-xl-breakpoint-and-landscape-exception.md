# 0011: XL breakpoint at 1600px with middle-wide 3-column Dashboard plus a landscape-phone exception

The canonical breakpoints gain xl 1600px through the existing `respond-to` mixin; the Dashboard caps at 1600px with `1fr 1fr` from md and `1fr 2fr 1fr` at xl, Webcams drops its max-width, Local conditions goes 2-column at lg, and rotated phones get 2-column via a raw `(orientation: landscape) and (min-width: 670px) and (max-height: 500px)` exception.

**Status**: accepted

**Amendment 2026-09-15**: Local conditions now goes 2-column at md (810px), not lg — the single column wrapped too early on tablets and narrow desktop windows, and the weather-heavy right column (now 3-to-2 over the left) stays readable there with its internally-scrolling strip and table. Ticket 03's "at lg" line is superseded; the change stays on the canonical scale via `respond-to(md)`.

**Considered Options**:

- 3-column at lg 1100px — rejected: three live panels plus the Oval canvas crowd at that width on real hardware.
- Lowering md for everyone to catch landscape phones — rejected: it would squeeze portrait tablets and narrow desktop windows into 2-column too early.
- Full-bleed Dashboard past 1600px — rejected: line length and canvas legibility degrade; Webcams alone goes full-bleed because its card grid benefits.

**Consequences**:

- New width queries MUST use `respond-to(xl)`; the landscape exception stays raw (non-width query, per ADR-0009) and renders the normal 2-column reflow, not a special compact mode.
- Details, About, Sources, Explainers and the Aurora guide stay at 800px; the type-scale steps in ADR-0009 are untouched.

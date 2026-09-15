# 0010: Rearrangeable Dashboard stores per-bucket column membership

The Dashboard becomes user-arrangeable through an Arrange modal, and each layout bucket (1-column, 2-column, 3-column) stores its own column membership and within-column order under one versioned localStorage object, rendered verbatim with empty columns collapsing.

**Status**: accepted

**Considered Options**:

- One flat panel order reflowed by CSS at every width — rejected: it cannot express the chosen defaults (Forecast sits bottom of 2-col-A and 3-col-C while Pinned sits top of 1-col), and per-bucket intent would be lost on resize.
- Separate keys per bucket — rejected: three keys drift independently and corrupt-bucket fallback needs one place to reconcile unknown ids.
- No persistence (arrange for the session only) — rejected: chasers arrange once and expect it to stick like pins, filters and Compact.

**Consequences**:

- Resizing across a bucket boundary switches the visible order immediately; unknown or future panel ids append to a sensible bucket on load rather than vanishing.
- The Arrange modal edits all three buckets (tabs) and only commits on Apply, so the live Dashboard never mutates mid-drag.

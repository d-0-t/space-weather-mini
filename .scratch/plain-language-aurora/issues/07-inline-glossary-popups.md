# 07: Inline glossary popups instead of navigating to Explainers

**What to build:** reading flow breaks today — every glossary term is a link that navigates away to the Explainers page anchor, losing the reader's place mid-read (human report, ticket 01 Part D). Terms open their glossary entry inline in a popup instead; the Explainers page remains the full glossary but is no longer a navigation target.

**Background:** the term component (used across the six forecast product pages and the Home live banner — about twenty call sites) takes a term id and renders a link to the Explainers anchor today. The reuse target already exists: the `HelpPopover` component with its `HelpPopoverContent` shape (`label` + `rows`/`text`/`paragraphs` + `footnote`) — the same info-button popup cards on the solar-wind, magnetosphere, live-panel, oval-glow and view-distance surfaces, with the house discipline already solved inside it (summary-triggered details, Escape/outside-click/trigger/X dismissal, focus returned to trigger, viewport clamping). This ticket repoints terms at that component: `GlossaryTerm` keeps its props (term id + visible label, still a real focusable control with visible focus) but opens the entry through `HelpPopover` instead of a router `Link`. Entry content comes from the same glossary entry source the Explainers page already renders — no rewording of entries here, presentation change only. The Part B honesty bounds are unaffected (copy unchanged).

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Every term opens its entry in a popup at the tap/click point — keyboard-operable, focus-managed, Escape/backdrop-dismissed, focus returned to the term — following the app's existing modal/popover patterns; no route change, reader keeps their place
- [ ] Explainers page and all its anchors stay intact; deep links keep working; popup offers a quiet "read full glossary" path without forcing it
- [ ] Popup content matches the Explainers entry verbatim (single source, no forked copy); reduced-motion respected; narrow-layout safe
- [ ] Unit pins (popup opens with the right entry, keyboard path, dismiss restores focus) + Playwright journey with axe audit; typecheck + Vitest green

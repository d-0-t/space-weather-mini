# 10 — Explainers page and tooltips

**What to build:** a plain-language explainers page at `/explainers` covering every concept the app displays — Kp index, A index, Radio flux, Geomagnetic activity, Geospace, Solar radiation storm, Radio blackout, Aurora forecast, and the product types — written in the glossary's vocabulary. Key terms across the app link or tooltip into the explainers so novices can learn in context.

**Blocked by:** 01 — Toolchain migration, 03 — 27-day outlook end-to-end

**Status:** ready-for-agent

- [ ] `/explainers` lists one plain-language explanation per concept, vocabulary matching CONTEXT.md
- [ ] Each product page links to the relevant explainer entries
- [ ] Key terms render as accessible tooltips/linkable terms (keyboard-accessible, not hover-only)
- [ ] The explainers page passes smoke test, Playwright journey, and axe audit
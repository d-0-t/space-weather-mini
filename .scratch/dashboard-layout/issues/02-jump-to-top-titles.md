# 02: Shared Jump to top plus h1-derived document titles

**What to build:** A shared page-footer Jump to top button plus per-route document titles, so long pages have one honest way back with context restored and every tab names its page. The button hides on short pages without overflow and replaces the per-region webcams adornments; pressing it returns scroll to the top and moves focus to the page h1. Every route sets `{H1} – Space Weather` on location change including back/forward, with no dynamic suffixes.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Footer Jump to top renders only while the page overflows and stays hidden on short pages
- [ ] Activation scrolls to top and moves screen-reader and keyboard focus to the h1
- [ ] Webcams per-region Jump to top adornments are replaced by the shared footer control
- [ ] Dashboard, Webcams, Local conditions, each Details page, This site, Sources, Explainers and Aurora guide each show their h1-derived tab text
- [ ] Titles update on push, back and forward navigation; Time and Astro state never affect them
- [ ] Typecheck, unit suite and axe audit stay green

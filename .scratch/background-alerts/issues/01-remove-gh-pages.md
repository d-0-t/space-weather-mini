# 01: Remove gh-pages deploy (Netlify-only)

**What to build:** the app deploys to the Netlify URL only; the dead static mirror is gone so background alerts cannot silently work on one URL and not the other.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Pushing the repo updates the Netlify site and nothing else (no second hosting target receives builds).
- [ ] Docs that named two deploy targets now name one; no user-facing link points at the removed target.
- [ ] Typecheck, unit tests, and deployment preview all pass on the remaining target.

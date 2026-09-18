# 01: Remove gh-pages deploy (Netlify-only)

**What to build:** the app deploys to the Netlify URL only; the dead static mirror is gone so background alerts cannot silently work on one URL and not the other.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Pushing the repo updates the Netlify site and nothing else (no second hosting target receives builds).
- [x] Docs that named two deploy targets now name one; no user-facing link points at the removed target.
- [x] Typecheck, unit tests, and deployment preview all pass on the remaining target.

## Comments

### Implemented 2026-09-18 (agent, awaiting human review — NOT committed)

TDD seam (agreed with user): the `package.json` / `package-lock.json` deploy
contract, pinned by the new `deploy-target.test.ts` (root, same precedent as
`vite.config.test.ts`). RED: 3 failing tests against the old config; GREEN:
all pass after the removal.

**Changed:**

- `package.json`: removed `predeploy` / `deploy` (`gh-pages -d dist`) scripts,
  the `gh-pages` devDependency, and the dead Create-React-App `homepage`
  field (Vite ignores it; the Netlify URL lives in the README demo link).
  `npm uninstall gh-pages` pruned `package-lock.json` (0 `gh-pages` entries
  remain) and `node_modules`.
- Docs now name one target: ADR `0001`, `0004`, `0006` (`Netlify/gh-pages` →
  `Netlify`) plus the constraint lines in the three research briefs
  (`aurora-chaser-features-2026-08-25`, `webcam-sources-2026-08-29`,
  `pwa-background-alerts-2026-09-18`). README already linked only the Netlify
  URL. No code change needed: the Twitch embed already builds `parent` from
  `window.location.hostname`, so it is host-agnostic.
- `.github/workflows/ci.yml` verified: test-only, no deploy job to remove.

**Code review (Standards + Spec sub-agents) — all findings fixed:**

- Standards: no hard violations.
- Spec: research-brief renames applied; lockfile pinned by a 4th test
  (`node_modules/gh-pages` absent); ADR-0004 trimmed to a pure rename (no
  added hostname claim); test refactored from `readFileSync(__dirname)` to a
  direct JSON import. `homepage` removal kept deliberately: it named a deploy
  target from config with no build effect.

**Verification:**

- `npm run typecheck`: clean.
- `deploy-target.test.ts` + `vite.config.test.ts`: 11/11 pass.
- Full suite: 995/996 pass. The single failure (`ArrangeModal.test.tsx` →
  "notes on the Pinned webcams row") is pre-existing and unrelated: it fails
  identically on the pristine tree with this change stashed.

**Manual human steps (GitHub-side, not done — needs owner):**

1. `git push origin --delete gh-pages` (stale 2021 CRA-era branch) after
   confirming nothing links to `d-0-t.github.io/space-weather-mini`.
2. Repo Settings → Pages: confirm/disable GitHub Pages so no second target
   can receive builds.
3. Confirm the Netlify dashboard still builds `main` (no `netlify.toml` in
   repo; config lives in the dashboard).

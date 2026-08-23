# 01 — Toolchain migration

**What to build:** the app builds and runs on a modern toolchain — Vite with React 19, TypeScript strict mode, React Router in library mode, SCSS support, Vitest and Playwright wired up, and CI running the full test suite — with all existing pages still working exactly as they do today.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] The app builds and serves via Vite with React 19 and TypeScript `strict: true`
- [x] Existing routes render unchanged (Home, the six product pages, About)
- [x] SCSS files compile; dart-sass is a dev dependency
- [x] Vitest runs (empty/passing suite) and Playwright is configured with a working smoke run
- [x] CI runs typecheck, Vitest, and Playwright on every push

## Comments

- Implemented 2026-08-23. Smoke suite: 9 Playwright journeys (nav chrome + all eight routes), 1 Vitest environment test. Review surfaced two deferred pre-existing defects (recorded in tickets 04 and 12) and the orphaned broken table-builder was deleted rather than renamed.
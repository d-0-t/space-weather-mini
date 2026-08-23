# 01 — Toolchain migration

**What to build:** the app builds and runs on a modern toolchain — Vite with React 19, TypeScript strict mode, React Router in library mode, SCSS support, Vitest and Playwright wired up, and CI running the full test suite — with all existing pages still working exactly as they do today.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The app builds and serves via Vite with React 19 and TypeScript `strict: true`
- [ ] Existing routes render unchanged (Home, the six product pages, About)
- [ ] SCSS files compile; dart-sass is a dev dependency
- [ ] Vitest runs (empty/passing suite) and Playwright is configured with a working smoke run
- [ ] CI runs typecheck, Vitest, and Playwright on every push
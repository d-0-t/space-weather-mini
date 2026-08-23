# 02 — Dead code cleanup

**What to build:** the codebase contains only what the app uses. The unreachable test page, the unfinished table-builder, the Kp test table, the orphaned forecast index component, and the JSON parser that only served the deleted test page are gone. This prefactor shrinks the migration surface before the product work starts.

**Blocked by:** 01 — Toolchain migration

**Status:** ready-for-agent

- [x] The test page and its route wiring are deleted
- [x] The unfinished table-builder and Kp test table files are deleted
- [x] The orphaned forecast index component is deleted
- [x] The JSON parser is deleted if nothing imports it after the test page goes
- [x] The app builds and all remaining routes render unchanged

## Comments

- Implemented 2026-08-23. Also removed the unused `query-string` dependency and the dead commented redirect block in the app shell (user-approved scope). Two-axis review: zero findings. Suite green before and after (typecheck, build, Vitest, 9 Playwright journeys).
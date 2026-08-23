# 02 — Dead code cleanup

**What to build:** the codebase contains only what the app uses. The unreachable test page, the unfinished table-builder, the Kp test table, the orphaned forecast index component, and the JSON parser that only served the deleted test page are gone. This prefactor shrinks the migration surface before the product work starts.

**Blocked by:** 01 — Toolchain migration

**Status:** ready-for-agent

- [ ] The test page and its route wiring are deleted
- [ ] The unfinished table-builder and Kp test table files are deleted
- [ ] The orphaned forecast index component is deleted
- [ ] The JSON parser is deleted if nothing imports it after the test page goes
- [ ] The app builds and all remaining routes render unchanged
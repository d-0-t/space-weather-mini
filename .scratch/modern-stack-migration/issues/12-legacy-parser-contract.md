# 12 — Legacy parser contract

**What to build:** once every product has migrated, the legacy HTML-string parser is deleted — no parser returns HTML, no `dangerouslySetInnerHTML` remains anywhere in the app. This is the contract half of the expand–contract migration of the shared parser.

**Blocked by:** 04 — Daily geomagnetic indices end-to-end, 05 — 3-day forecast end-to-end, 06 — Forecast discussion end-to-end, 07 — Weekly report end-to-end, 08 — Geophysical alert end-to-end

**Status:** ready-for-agent

- [ ] No product fetch goes through the legacy HTML-string parser
- [ ] The legacy parser file(s) are deleted
- [ ] No `dangerouslySetInnerHTML` usage remains in the app
- [ ] Full suite (typecheck, Vitest, Playwright with axe) passes after the deletion

## Comments

- Review finding (pre-existing): the legacy parser's `getCell` emits a malformed `class="valAtDate kp01"">` attribute; the new typed parsers must not reproduce it.
# 06: Alert settings UI — three types, Kp explainer, install hint

**What to build:** the alerts settings grow from one threshold slider into three independently toggleable alert types with an understandable Kp threshold: info popup plus a personal latitude tip naming the stored place, and an install hint shown to all mobile users with no disabled buttons.

**Blocked by:** 03 (Kp alert type), 04 (Daily outlook alert), 05 (Live summary-word alert).

**Status:** ready-for-agent

- [ ] Daily, Kp, and live alerts toggle independently; the Kp threshold slider keeps working and re-syncs to the sender on every change.
- [ ] The hindrance gates' controls and stored shape land here (deferred from ticket 05 by the human's call): a cloud-gate on/off toggle beside its percentage, the no-precipitation toggle, and the darkness band choice (Night, Astronomical Twilight, Nautical Twilight, Any including daytime — Twilight always spelled out); every gate label names the stored place short name ("Cloud at Piteå"). The sender's strict validator and `collectSettings` need the same shape change.
- [ ] An info popup beside the slider explains the 0–9 Kp scale and its G1–G5 mapping in one line, using glossary vocabulary.
- [ ] A one-line tip names the stored place short name and the Kp that typically brings the oval to it (approximate geomagnetic latitude, Tips rule, never a promise), with a generic fallback when no place is stored.
- [ ] An install hint is visible to all mobile users; the Enable button always attempts and routes failures to the Install & Alerts guide (ticket 07).
- [ ] All new controls meet the coding-standards accessibility bar (native controls, visible focus, honest copy).

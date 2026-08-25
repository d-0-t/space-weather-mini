# 0003: Live polling for real-time JSON products

Text products (forecast discussion, 3-day forecast, weekly report, 27-day outlook, daily geomagnetic indices, geophysical alert) update once per day and are fetched on mount only. Horizon 1 adds real-time JSON: planetary K-index (`noaa-planetary-k-index(-forecast).json`, `planetary_k_index_1m.json`), NOAA Scales (`noaa-scales.json`), alerts (`alerts.json`), solar wind / IMF (`products/summary/solar-wind-*.json`, `json/rtsw/*` — Bt, Bz GSM, speed, density), hemispheric power, Dst (`kyoto-dst.json`), magnetometers, and later webcams. These refresh every 1–60 minutes (`Cache-Control: max-age=60`, `Last-Modified` verified 2026-08-25 on `services.swpc.noaa.gov`).

We will poll real-time JSON only, with TanStack Query `refetchInterval` per product (Bz/Bt/speed/density summary 60s, Kp/Scales/alerts/Dst 5 min, 1-min series windowed to 6h), and keep text products fetch-on-mount with no polling. Every product display keeps the `As of` issued timestamp (ADR-0001 consequence) plus a `Updated X ago` live age. Polling pauses when the page is hidden (`refetchIntervalInBackground: false`) to preserve battery on the hill.

**Status**: accepted

**Considered Options**:

- Poll everything at 5 min — simple but wastes battery and violates the "once-a-day" cost model for text.
- No polling, manual refresh — honest but chasers miss Bz south flips (20–40 min oval lead) and Kp jumps.
- Poll only real-time JSON — preserves existing model for archival text, adds freshness where SWPC cadence justifies it.

**Consequences**:

- `docs/agents/coding-standards.md:20` no-polling rule is amended to allow `refetchInterval` for real-time JSON flagged as `live: true` per product.
- Query keys carry the URL and `live` flag; the data layer stays the single swap point if a backend is added later (ADR-0001).
- Tests must cover `refetchInterval` and hidden-tab pausing; Playwright must assert `As of` freshness.

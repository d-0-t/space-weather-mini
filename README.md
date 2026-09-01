# Space Weather Mini

A client-side web app that presents NOAA SWPC space weather products — forecasts, indices, and alerts — as an accessible display. Live demo: [space-weather-mini.netlify.app](https://space-weather-mini.netlify.app/)

## Stack

Vite + React 19, TypeScript (strict), React Router v7 (library mode), TanStack Query (planned), SCSS + BEM, Vitest, Playwright. No backend — data is fetched directly from [NOAA SWPC](https://services.swpc.noaa.gov/text/).

## Development

```bash
npm install
npm run dev        # dev server
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build
```

## Testing

```bash
npm test           # Vitest unit/component tests
npm run test:e2e   # Playwright smoke journeys (starts its own preview server)
npm run typecheck  # tsc --noEmit
```

CI (GitHub Actions) runs typecheck, Vitest, and Playwright on every push.

## Conventions

Domain vocabulary lives in `CONTEXT.md`; coding standards in `docs/agents/coding-standards.md`. Architecture decisions in `docs/adr/`. Work is tracked as markdown tickets under `.scratch/` (see `docs/agents/issue-tracker.md`).

## Data sources

All products come from NOAA SWPC public text and JSON products: forecast discussion, 3-day forecast, weekly report, 27-day outlook, daily geomagnetic indices, geophysical alert, and OVATION aurora images, plus the live real-time feeds on Home (planetary K-index, NOAA scales, alerts/watches/warnings, solar wind, hemispheric power, Dst). The Webcams page embeds third-party live sky cameras (not NOAA products) — see `docs/adr/0004-third-party-webcam-aggregation.md` and the verified source set in `docs/research/webcam-sources-2026-08-29.md`. The Local conditions page (`/conditions`) derives daylight on device with suncalc (no fetch) for the stored geocoded place — see `docs/adr/0005-local-conditions-with-suncalc-and-manual-refresh.md`.
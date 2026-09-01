# Coding Standards

The conventions every change to this repo must follow. Enforced by review, not tooling.

## TypeScript

- `strict: true` in tsconfig. No `any` outside a deliberately-fenced `// eslint-disable-next-line @typescript-eslint/no-explicit-any` with a reason.
- Every module-level variable (constants, types, parser entry points) gets a short JSDoc or comment when its meaning isn't obvious from its name. Obvious names need no comment; non-obvious ones always do.
- Parsers are pure functions: `string → Product`. No DOM access, no `dangerouslySetInnerHTML` outside the final render boundary.
- Narrative prose is preserved as text with NOAA's source line breaks (blank lines separate paragraphs); pages render it with `white-space: pre-line`.
- Types come from the domain model — the vocabulary of `CONTEXT.md` is the vocabulary of the types. No synonyms in code (see `_Avoid_` lists).

## Styling

- SCSS (dart-sass, built by Vite) with **BEM** naming: `block__element--modifier`. Nesting only to express BEM structure, e.g. `list__item__img` — never deeper than one modifier/state level.
- **Shared button system** (ticket 05 + 2026-08-31 polish): `.btn--primary` / `.btn--secondary` / `.btn--icon` live in `index.scss` as a deliberate cross-block utility layer (the BEM exception — buttons on any page may adopt the modifier classes directly, as the Astro toggle, browser-alerts button, Compact view toggle and all webcams controls do). `.btn--secondary` is the dark 44px pill; `.btn--icon` is the transparent 44px icon button (Hide as `VisibilityOff` small with intentionally asymmetrical `padding:0; margin:-1.35rem -1.75rem 0 0` for a larger touch target away from the cam image; Pin selector as large gold `1.5rem` `PushPin` at 30deg, `var(--color-gold)` → `var(--color-accent-strong)` on hover, symmetric padding, `title` + `span.sr-only` over a native hidden checkbox so the entire card border can be the visual selector: `webcam-card--pin-unselected` dashed faint vs `webcam-card--pinned` thick solid accent). Toolbar icons collapse below 1000px via `button > .btn__label`; icon-only controls (close, help "?", Hide/Pin, toolbar below 1000px) are named by `title` + a `.sr-only` span, never `aria-label`.
- **Color tokens**: the UI palette lives on `:root` in `src/index.scss` as CSS custom properties (raw `--color-*` plus semantic aliases and `--gradient-card`/`--gradient-header`) per ADR 0002. Every non-data color MUST use a token — never raw `rgb(...)`/`#...` outside the frozen data selectors. The `.kp01`–`.kp9` band classes and `td[a-value]` are the frozen **data-token** mechanism for Kp-index and A-index presentation and are never variable-ized; all other table chrome (`table`, `th`, `td`, `tr:nth-child`, hover outlines, `td[cellType]`) uses the `:root` tokens (or `color-mix(in srgb, var(--color-deep-indigo) … , black)` for zebra striping).
- Semantic HTML: tables for tabular products, headings in order, one `<h1>` per page.

## Data fetching

- TanStack Query. Fetch on mount; **no manual refresh control**. Text products (forecast discussion, 3-day forecast, weekly report, 27-day outlook, daily geomagnetic indices, geophysical alert) do not poll — they update on fixed schedules (most once a day) so fresh data arrives on the next page load. Real-time JSON products flagged `live: true` (planetary K-index, NOAA Scales, alerts, solar wind/IMF Bz/Bt, hemispheric power, Dst, magnetometers) may use `refetchInterval` per product — see ADR 0003 — with `refetchIntervalInBackground: false`.
- **Webcams page exceptions (ADR-0004, ticket 03)**: the page has a header **Refresh** button that re-renders every image card's still with a `?t=` cache-buster — a deliberate exception to the no-manual-refresh rule (the stills are third-party images, not app data). Auto-refresh is opt-in (`sw:webcams:autorefresh:v1`, default off), per-card `setInterval` at `max(cadenceMinutes, 1)` with `?t=` busting, paused on hidden tab (ADR-0003 discipline). The one true-live cam (UAF Poker Flat) follows its operator's CORS-open SSE feed directly via `EventSource` instead of TanStack Query — the feed is an external push stream, not an app query.
- **Local conditions weather exception (ADR-0005, ticket 03)**: the weather card shows an always-enabled **Refresh** button and a `Updated at HH:MM, near {shortName}` fetched-at timestamp plus `Source: Open-Meteo` attribution — the page's deliberate exception to the no-manual-refresh rule (chasers want control over refresh and battery). The TanStack Query for the weather has `refetchOnWindowFocus: false` and no `refetchInterval`, so one call happens per place change plus each user tap; the timestamp is the device-local fetch time, distinct from the place-local times in the strip and daily row.
- Every product display shows when its data was issued — the issued time in UTC and local time, plus the product's author line. Live products also show a `Updated X ago` age.
- Fetch failures show a plain error message (no retry button); TanStack Query's built-in retries handle transient failures.

## Charts

- Recharts, always paired with the semantic table that carries the same data — the table is the source of truth for screen readers. The chart container gets `role="img"` named by a sr-only span inside it (`aria-labelledby`), never `aria-label`, naming every series. Established visualisations: Kp history timeline, 27-day radio flux/A index trend, 3-day Kp forecast line.
- **No color-only encoding**: each series must differ by shape as well as color (Recharts `legendType` circle/square/triangle plus `Symbols` dot markers), so the chart stays legible without color.
- Placement: full-width, stacked **above** the table (never side-by-side).
- Series colors are distinct named colors set on the `<Line>` (`greenyellow`, `plum`, `cyan` are the established palette); the `.kp01`–`.kp9` token classes are for tables only.
- Global Recharts theming for the dark background (axis/text fill, legend placement, tooltip background) lives in `index.scss`.

## Accessibility

- WCAG 2.1 AA, plus: skip link, visible focus, `prefers-reduced-motion` respected.
- **No `aria-label`**: interactive elements (buttons, links), dialogs, landmarks and `role="img"` containers are named by text — a visible label when one exists, otherwise a `.sr-only` span inside the element. Only use reference via `aria-labelledby` where content text can't name it (dialog, nav, region) and never in buttons, input types or similar. An `aria-label` attribute is only acceptable where text cannot work at all.
- Playwright runs an axe audit per page as part of the test suite.

## Testing

- **Vitest** — parser unit tests with real NOAA fixtures (fetched once, checked in); component smoke tests (renders, key landmarks present). No snapshot tests of parser output.
- **Playwright** — one render journey per page, plus the axe audit.
- A change that touches a parser or a page adds or updates its tests.

## Vocabulary

- Domain terms are used as defined in `CONTEXT.md`. When a term isn't in the glossary, either the project doesn't use it (reconsider) or the glossary has a gap (add it — that's `/domain-modeling`'s job, and the terms of `CONTEXT.md` are the terms of user-facing copy too).

# Coding Standards

The conventions every change to this repo must follow. Enforced by review, not tooling.

## TypeScript

- `strict: true` in tsconfig. No `any` outside a deliberately-fenced `// eslint-disable-next-line @typescript-eslint/no-explicit-any` with a reason.
- Every module-level variable (constants, types, parser entry points) gets a short JSDoc or comment when its meaning isn't obvious from its name. Obvious names need no comment; non-obvious ones always do.
- Parsers are pure functions: `string → Product`. No DOM access, no `dangerouslySetInnerHTML` outside the final render boundary.
- Types come from the domain model — the vocabulary of `CONTEXT.md` is the vocabulary of the types. No synonyms in code (see `_Avoid_` lists).

## Styling

- SCSS (dart-sass, built by Vite) with **BEM** naming: `block__element--modifier`. Nesting only to express BEM structure, e.g. `list__item__img` — never deeper than one modifier/state level.
- The `.kp01`–`.kp9` color classes are the sole design-token mechanism. New color semantics extend them as `.kpNN`-style classes or CSS custom properties scoped to a block — never inline hex in components.
- Semantic HTML: tables for tabular products, headings in order, one `<h1>` per page.

## Data fetching

- TanStack Query. Fetch on mount; **no manual refresh control and no polling** — NOAA products update on fixed schedules (most once a day), so fresh data arrives on the next page load.
- Every product display shows an "As of" timestamp from the fetched data.
- Fetch failures show a plain error message (no retry button); TanStack Query's built-in retries handle transient failures.

## Charts

- Recharts, always paired with the semantic table that carries the same data — the table is the source of truth for screen readers. The chart container gets `role="img"` plus an `aria-label` naming every series.
- **No color-only encoding**: each series must differ by shape as well as color (Recharts `legendType` circle/square/triangle plus `Symbols` dot markers), so the chart stays legible without color.
- Placement: full-width, stacked **above** the table (never side-by-side).
- Series colors are distinct named colors set on the `<Line>` (`greenyellow`, `plum`, `cyan` are the established palette); the `.kp01`–`.kp9` token classes are for tables only.
- Global Recharts theming for the dark background (axis/text fill, legend placement, tooltip background) lives in `index.scss`.

## Accessibility

- WCAG 2.1 AA, plus: skip link, visible focus, `prefers-reduced-motion` respected.
- Playwright runs an axe audit per page as part of the test suite.

## Testing

- **Vitest** — parser unit tests with real NOAA fixtures (fetched once, checked in); component smoke tests (renders, key landmarks present). No snapshot tests of parser output.
- **Playwright** — one render journey per page, plus the axe audit.
- A change that touches a parser or a page adds or updates its tests.

## Vocabulary

- Domain terms are used as defined in `CONTEXT.md`. When a term isn't in the glossary, either the project doesn't use it (reconsider) or the glossary has a gap (add it — that's `/domain-modeling`'s job, and the terms of `CONTEXT.md` are the terms of user-facing copy too).
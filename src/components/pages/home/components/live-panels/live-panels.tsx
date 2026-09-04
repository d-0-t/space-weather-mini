import {
  useEffect,
  useId,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import InfoIcon from "@mui/icons-material/Info";

import type { Source } from "../../../../sources";
import { SourceAttribution } from "../../../../sources";
import {
  COULDNT_LOAD_COPY,
  FreshnessLine,
  StaleDataNotice,
  type LiveDataState,
} from "../offline/offline";

import "./live-panels.scss";

/**
 * Developer-configurable chart windows, in MINUTES per feed.
 * - dst: hourly data → 1440 minutes = last 24 hours
 * - boulder: 1-min data → 180 minutes = last 3 hours
 * The hemi feed is tiny (one day of 5-min rows), so it is plotted in full
 * rather than windowed.
 * The L1 (solar wind) charts are windowed dynamically: BEFORE_NOW_MINUTES of
 * data before the Now line, plus every fresher reading that is still
 * propagating to Earth (the transit minutes). Windows are measured in wall
 * time, because the feeds burst multiple rows per minute.
 */
export const DATA_WINDOWS = {
  dst: 24 * 60,
  boulder: 3 * 60,
} as const;

/**
 * Smoothing buckets, in minutes per averaged point. Rows are averaged per
 * wall-clock bucket, which also decimates the rendered point count.
 * - solarWind: 1-minute means – merges the feed's 2-4 rows per minute into
 *   one clean point per minute (smoothing 1)
 * - boulder: 1 = raw (already smooth)
 * - hemi: 5 = its native cadence (no change)
 * - dst: 60 = its native cadence (no change)
 */
export const SMOOTHING = {
  solarWind: 1,
  boulder: 1,
  hemi: 5,
  dst: 60,
} as const;

// Minutes of data shown BEFORE the Now line on the L1 charts.
export const BEFORE_NOW_MINUTES = 120;

// DSCOVR sits at L1, ~1.5 million km upstream of Earth. The measured solar
// wind reaches Earth `1.5e6 / speed` minutes later – the "Now" line is drawn
// that far past the latest reading on the solar-wind charts.
const L1_DISTANCE_KM = 1_500_000;

export interface ChartPoint {
  /** Numeric index – the X axis is numeric so ReferenceLine positions correctly */
  x: number;
  /** HH:MM axis label */
  time: string;
  /** Full timestamp for the tooltip */
  timeTag: string;
  /** null on the synthetic "Now" anchor point */
  value: number | null;
}

/** Extracts HH:MM from "2026-08-26T22:04:07", "2026-08-26 22:04" or "2026-08-26_22:04" */
export function chartTimeLabel(timeTag: string): string {
  return timeTag.slice(11, 16);
}

/** L1 → Earth transit in minutes from the measured solar wind speed (km/s). */
export function transitMinutes(speedKmS: number | null): number {
  if (speedKmS === null || speedKmS <= 0) return 0;
  return Math.round(L1_DISTANCE_KM / speedKmS / 60);
}

/** Adds minutes to an ISO-ish time_tag; returns "YYYY-MM-DDTHH:MM". */
export function addMinutes(timeTag: string, minutes: number): string {
  const normalized = timeTag.replace("_", "T");
  const iso =
    normalized.endsWith("Z") || normalized.includes("+")
      ? normalized
      : `${normalized}Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return timeTag;
  d.setUTCMinutes(d.getUTCMinutes() + minutes);
  return d.toISOString().slice(0, 16);
}

/** "2026-08-26T22:04:07" → "26 Aug 2026 22:04" for tooltips. */
export function formatTooltipTime(timeTag: string): string {
  const normalized = timeTag.replace("_", "T");
  const iso =
    normalized.endsWith("Z") || normalized.includes("+")
      ? normalized
      : `${normalized}Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return timeTag.replace(/[T_]/g, " ");
  return d.toUTCString().slice(5, 22);
}

/** Local-time "HH:MM" of a time_tag, for the freshness line. */
export function formatLocalTime(timeTag: string): string {
  const iso = timeTag.replace("_", "T");
  const withZ = iso.endsWith("Z") || iso.includes("+") ? iso : `${iso}Z`;
  const d = new Date(withZ);
  if (Number.isNaN(d.getTime())) return chartTimeLabel(timeTag);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Milliseconds of an ISO-ish time_tag ("T", " " or "_" date separators). */
function tagMs(timeTag: string): number {
  const iso = timeTag.replace("_", "T");
  const withZ = iso.endsWith("Z") || iso.includes("+") ? iso : `${iso}Z`;
  const d = new Date(withZ);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

/**
 * Buckets the rows into wall-clock `bucketMinutes` averages, keeping the
 * `windowMinutes` before the freshest reading (pass null to plot every row).
 * Bucketing averages away the 1-min burst noise and decimates the point count
 * for a clean line. Missing readings leave an empty bucket (a gap in the line).
 */
export function smoothPoints(
  rows: { time_tag: string; value: number | null }[],
  windowMinutes: number | null,
  bucketMinutes: number,
): ChartPoint[] {
  const newest = rows.length > 0 ? tagMs(rows[rows.length - 1].time_tag) : 0;
  const cutoff =
    windowMinutes === null ? null : newest - windowMinutes * 60_000;
  const buckets = new Map<
    number,
    { sum: number; count: number; first: number }
  >();
  for (const row of rows) {
    const ms = tagMs(row.time_tag);
    if (row.value === null) continue;
    if (cutoff !== null && ms < cutoff) continue;
    const bucket = Math.floor(ms / (bucketMinutes * 60_000));
    const entry = buckets.get(bucket) ?? { sum: 0, count: 0, first: ms };
    entry.sum += row.value;
    entry.count += 1;
    if (ms < entry.first) entry.first = ms;
    buckets.set(bucket, entry);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, entry], index) => {
      const firstIso = new Date(entry.first).toISOString();
      return {
        x: index,
        time: chartTimeLabel(firstIso),
        timeTag: firstIso,
        value: entry.sum / entry.count,
      };
    });
}

/**
 * Appends a null-valued "Now" anchor. offsetX places it that many points to
 * the LEFT of the freshest reading (transit minutes on the 1-min feeds): the
 * conditions arriving at Earth right now were measured `transit` minutes ago,
 * so the line lands inside the data, not beyond it.
 */
export function withNowAnchor(
  points: ChartPoint[],
  nowLabel: string,
  offsetX = 0,
): ChartPoint[] {
  if (points.some((p) => p.time === nowLabel)) return points;
  const lastX = points.length > 0 ? points[points.length - 1].x : 0;
  return [
    ...points,
    {
      x: Math.max(lastX - offsetX, 0),
      time: nowLabel,
      timeTag: "",
      value: null,
    },
  ];
}

export function latestValue(rows: { time_tag: string; value: number | null }[]): {
  value: number | null;
  timeTag: string | null;
} {
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].value !== null) {
      return { value: rows[i].value as number, timeTag: rows[i].time_tag };
    }
  }
  return { value: null, timeTag: null };
}

/**
 * Value of the reading closest to (at or just before) the given time tag.
 * Rows are sorted ascending; compares minute-granular tags.
 */
export function valueAt(
  rows: { time_tag: string; value: number | null }[],
  timeTag: string,
): { value: number | null; timeTag: string | null } {
  const key = timeTag.slice(0, 16);
  let hit: { time_tag: string; value: number | null } | null = null;
  for (const row of rows) {
    if (row.time_tag.slice(0, 16) <= key) hit = row;
    else break;
  }
  return hit && hit.value !== null
    ? { value: hit.value, timeTag: hit.time_tag }
    : { value: null, timeTag: null };
}

/**
 * Rounds the largest absolute GW reading up to a symmetric chart ceiling
 * (18 → 20), falling back to 10 when there is no data. Used to make a
 * mirrored second series span the Y axis symmetrically (20 → 0 → 20).
 */
export function symmetricCeiling(values: number[]): number {
  const max = values.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  return max === 0 ? 10 : Math.ceil(max / 5) * 5;
}

export interface SegmentedSeries {
  color: string;
  points: ChartPoint[];
}

/**
 * Splits one series into per-color segments for threshold-colored lines.
 * Returns one series per maximal same-color RUN, each extended one point
 * into the next run so the line stays continuous at crossings. The bridge
 * point is plotted by both neighbours (a shared vertex only – segments are
 * never drawn twice), which is invisible on the strokes and deduplicated in
 * the tooltip (see dedupeTooltipEntries). Points outside the run are null,
 * which keeps recharts from joining them into one path.
 * `bandValue` picks the color (raw value, e.g. pre-mirror for inverted
 * second series) while `displayValue` is what gets plotted.
 * `dataKey` is the chart key the series is rendered from: the primary
 * series plots `value`, the mirrored second series plots `value2` – the
 * other key is nulled so a segment line can never draw outside its run.
 */
export function splitSeriesByColor(
  source: ChartPoint[],
  bandValue: (p: ChartPoint) => number | null,
  displayValue: (p: ChartPoint) => number | null,
  colorFor: (value: number) => string,
  dataKey: "value" | "value2" = "value",
): SegmentedSeries[] {
  const bandOf = source.map((p) => {
    const v = bandValue(p);
    return v === null ? null : colorFor(v);
  });
  const runs: { start: number; end: number; color: string }[] = [];
  for (let i = 0; i < bandOf.length; i++) {
    const color = bandOf[i];
    if (color === null) continue;
    const last = runs[runs.length - 1];
    if (last && last.color === color && last.end === i - 1) last.end = i;
    else runs.push({ start: i, end: i, color });
  }
  return runs.map((run) => ({
    color: run.color,
    points: source.map((p, i) => {
      const inRun = i >= run.start && i <= run.end;
      const bridge = i === run.end + 1;
      const plotted = inRun || bridge ? displayValue(p) : null;
      return dataKey === "value"
        ? { ...p, value: plotted, value2: null }
        : { ...p, value: null, value2: plotted };
    }),
  }));
}

export interface TooltipEntry {
  name: string;
  value: number | null;
  color: string;
  payload?: ChartPoint;
}

/**
 * Collapses duplicate tooltip entries at threshold crossings: the bridge
 * point between two band segments is plotted by both lines, so a series can
 * appear twice with the same value (one entry per segment color). Keep the
 * newest (rightmost) entry per name, matching the segment ahead.
 */
export function dedupeTooltipEntries(entries: TooltipEntry[]): TooltipEntry[] {
  const seen = new Set<string>();
  return [...entries]
    .reverse()
    .filter((entry) => {
      if (seen.has(entry.name)) return false;
      seen.add(entry.name);
      return true;
    })
    .reverse();
}

const TOOLTIP_STYLE: CSSProperties = {
  backgroundColor: "var(--color-black)",
  border: "1px solid var(--color-border-muted)",
  padding: "2px 6px",
  fontSize: 12,
};

const ChartTooltip: React.FC<{
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  unit: string;
  invert: boolean;
}> = ({ active, payload, label, unit, invert }) => {
  if (!active || !payload || payload.length === 0) return null;
  const entries = dedupeTooltipEntries(payload);
  const point = entries[0]?.payload;
  return (
    <div style={TOOLTIP_STYLE}>
      <p style={{ fontSize: 12, margin: 0 }}>
        {point?.timeTag ? formatTooltipTime(point.timeTag) : (label ?? "")}
      </p>
      {entries.map((entry) => {
        const raw =
          entry.value === null || entry.value === undefined
            ? null
            : Number(entry.value);
        const display = raw === null ? null : invert ? Math.abs(raw) : raw;
        return (
          <p
            key={entry.name}
            style={{ fontSize: 12, margin: 0, color: entry.color }}
          >
            {entry.name}:{" "}
            {display === null ? "–" : `${display.toFixed(2)} ${unit}`}
          </p>
        );
      })}
    </div>
  );
};

export const MiniSparkline: React.FC<{
  title: string;
  points: ChartPoint[];
  /** When set, draws the Now line (L1 charts only) */
  nowLabel?: string;
  accent: string;
  ariaLabel: string;
  unit: string;
  /** Points the Now line sits past the freshest reading (transit minutes) */
  anchorOffset?: number;
  /** Colors the line per value via the shared severity ramp */
  colorBy?: (value: number) => string;
  /** Optional second series plotted on the same axis (same timestamps as points) */
  second?: {
    points: ChartPoint[];
    accent: string;
    name: string;
    /** Plots the second series below zero (mirrored), with a symmetric ± axis and absolute tick labels */
    invert?: boolean;
    /** Colors the second line per RAW value (pre-mirror), so GW bands still apply */
    colorBy?: (value: number) => string;
  };
  /** Overrides the first series' tooltip name (defaults to `title`) */
  primaryName?: string;
}> = ({
  title,
  points,
  nowLabel,
  accent,
  ariaLabel,
  unit,
  anchorOffset = 0,
  colorBy,
  second,
  primaryName,
}) => {
  const chartLabelId = useId();
  const hasNow = Boolean(nowLabel);
  const mergedPoints = second
    ? points.map((p, i) => {
        const v = second.points[i]?.value ?? null;
        return {
          ...p,
          value2: v === null ? null : second.invert ? -v : v,
          raw2: v,
        };
      })
    : points;
  const chartPoints = hasNow
    ? withNowAnchor(mergedPoints, nowLabel!, anchorOffset)
    : mergedPoints;
  const coloredSeries =
    colorBy || second?.colorBy
      ? {
          primary: colorBy
            ? splitSeriesByColor(
                chartPoints,
                (p) => p.value,
                (p) => p.value,
                colorBy,
              )
            : null,
          second: second?.colorBy
            ? splitSeriesByColor(
                chartPoints,
                (p) =>
                  (p as ChartPoint & { raw2?: number | null }).raw2 ?? null,
                (p) =>
                  (p as ChartPoint & { value2?: number | null }).value2 ??
                  null,
                second.colorBy,
                "value2",
              )
            : null,
        }
      : null;
  const nowX = hasNow
    ? chartPoints.find((p) => p.time === nowLabel)?.x
    : undefined;
  // Symmetric ± ceiling so a mirrored second series spans 20 → 0 → 20
  const mirrorCeiling = second?.invert
    ? symmetricCeiling(
        chartPoints.flatMap((p) => {
          const values = [p.value, (p as { value2?: number | null }).value2];
          return values.filter((v): v is number => typeof v === "number");
        }),
      )
    : null;
  const yDomain = mirrorCeiling === null ? ["auto", "auto"] : [-mirrorCeiling, mirrorCeiling];
  return (
    <div
      role="img"
      aria-labelledby={chartLabelId}
      className="live-panel__chart"
    >
      <span className="sr-only" id={chartLabelId}>
        {ariaLabel}
      </span>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart
          data={chartPoints}
          margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border-muted-transparent)"
          />
          <XAxis
            type="number"
            dataKey="x"
            domain={[0, "dataMax"]}
            ticks={[0, chartPoints[chartPoints.length - 1]?.x ?? 0]}
            tickFormatter={(value: number) => {
              const point = chartPoints.find((p) => p.x === value);
              return point ? point.time : "";
            }}
            height={16}
            tick={{ fill: "var(--color-white)", fontSize: 11 }}
            tickMargin={2}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={yDomain}
            tickFormatter={
              second?.invert
                ? (value: number) => String(Math.abs(value))
                : undefined
            }
            tick={{ fill: "var(--color-white)", fontSize: 11 }}
            width="auto"
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ stroke: "var(--color-white)", strokeOpacity: 0.3 }}
            content={
              <ChartTooltip unit={unit} invert={Boolean(second?.invert)} />
            }
          />
          {hasNow && nowX !== undefined ? (
            <ReferenceLine
              x={nowX}
              stroke="var(--color-white)"
              strokeOpacity={0.9}
              strokeWidth={2}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              label={
                {
                  value: "Now",
                  position: "insideTop",
                  fill: "var(--color-white)",
                  stroke: "var(--color-black)",
                  strokeWidth: 4,
                  paintOrder: "stroke",
                  strokeLinejoin: "round",
                  fontSize: 12,
                  fontWeight: 800,
                  dy: 8,
                } as any
              }
            />
          ) : null}
          {second?.invert ? (
            <ReferenceLine
              y={0}
              stroke="var(--color-border-muted)"
              strokeOpacity={0.9}
            />
          ) : null}
          {coloredSeries?.primary
            ? coloredSeries.primary.map((segment, index) => (
                <Line
                  key={`${segment.color}-${index}`}
                  type="monotone"
                  dataKey="value"
                  data={segment.points}
                  name={primaryName ?? title}
                  stroke={segment.color}
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))
            : (
                <Line
                  type="monotone"
                  dataKey="value"
                  name={primaryName ?? title}
                  stroke={accent}
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              )}
          {coloredSeries?.second
            ? coloredSeries.second.map((segment, index) => (
                <Line
                  key={`${segment.color}-${index}`}
                  type="monotone"
                  dataKey="value2"
                  data={segment.points}
                  name={second!.name}
                  stroke={segment.color}
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))
            : second
              ? (
                  <Line
                    type="monotone"
                    dataKey="value2"
                    name={second.name}
                    stroke={second.accent}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                )
              : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

interface ChartHelpContent {
  /** sr-only summary label, e.g. "About solar wind" */
  label: string;
  /** Compact threshold rows: value → meaning */
  rows?: [string, string][];
  /** Prose fallback (magnetograms) */
  text?: string;
}

export const ChartHelp: React.FC<{
  content: ChartHelpContent;
  /** Custom summary trigger content (defaults to the "?" badge). When set, the caller must include the sr-only label. */
  summary?: ReactNode;
  /** Extra class on the <details> root (e.g. to opt out of the "?" circle chrome) */
  className?: string;
}> = ({ content, summary, className }) => {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  // Escape closes the popover and returns focus to the "?" trigger
  const handleKeyDown: React.KeyboardEventHandler<HTMLElement> = (event) => {
    if (event.key === "Escape" && detailsRef.current?.open) {
      event.preventDefault();
      detailsRef.current.open = false;
      detailsRef.current.querySelector("summary")?.focus();
    }
  };
  // A click outside the trigger or the popover closes it
  useEffect(() => {
    const el = detailsRef.current;
    if (!el) return;
    const onPointerDown = (event: PointerEvent) => {
      // Only the primary (left) button closes – right-clicking outside the
      // popover (e.g. to inspect its content) must not dismiss it
      if (event.button !== 0) return;
      if (el.open && !el.contains(event.target as Node)) {
        el.open = false;
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);
  return (
    <details
      ref={detailsRef}
      className={`live-panel__help${className ? ` ${className}` : ""}`}
      onKeyDown={handleKeyDown}
    >
      <summary
        className={summary ? undefined : "btn--icon"}
        title={summary ? undefined : content.label}
      >
        {summary ?? (
          <>
            <span aria-hidden="true">
              <InfoIcon fontSize="small" />
            </span>
            <span className="sr-only">{content.label}</span>
          </>
        )}
      </summary>
      {content.rows || content.text ? (
        <div className="live-panel__popover">
          {content.rows ? (
            <ul className="live-panel__scale">
              {content.rows.map(([value, meaning]) => (
                <li key={value}>
                  <b>{value}</b> – {meaning}
                </li>
              ))}
            </ul>
          ) : null}
          {content.text ? <p>{content.text}</p> : null}
        </div>
      ) : null}
    </details>
  );
};

export const SparklineCard: React.FC<{
  title: string;
  value: string;
  note?: string;
  asOf: string;
  updated: string;
  points: ChartPoint[];
  nowLabel?: string;
  accent: string;
  ariaLabel: string;
  unit: string;
  help: ChartHelpContent;
  /** Honesty state: stale saved data, or nothing ever loaded */
  state?: LiveDataState;
  anchorOffset?: number;
  /** Colors the line per value via the shared severity ramp */
  colorBy?: (value: number) => string;
  second?: {
    points: ChartPoint[];
    accent: string;
    name: string;
    invert?: boolean;
    /** Colors the second line per RAW value (pre-mirror), so GW bands still apply */
    colorBy?: (value: number) => string;
  };
  primaryName?: string;
  /** Replaces the default value + note headline (e.g. two-column hemi values) */
  valueBlock?: ReactNode;
  /** Data source attribution shown under the card */
  source?: Source;
}> = ({
  title,
  value,
  note,
  asOf,
  updated,
  points,
  nowLabel,
  accent,
  ariaLabel,
  unit,
  help,
  state,
  anchorOffset,
  colorBy,
  second,
  primaryName,
  valueBlock,
  source,
}) => (
  <section className="live-panel__card">
    <div className="live-panel__head">
      <h3>{title}</h3>
      <ChartHelp content={help} />
    </div>
    {state === "stale" ? <StaleDataNotice /> : null}
    {state === "never-loaded" ? (
      <p className="live-panel__warning">{COULDNT_LOAD_COPY}</p>
    ) : (
      valueBlock ?? (
        <p className="live-panel__value">
          {value}
          {note ? <span className="live-panel__note"> {note}</span> : null}
        </p>
      )
    )}
    {points.length > 1 ? (
      <MiniSparkline
        title={title}
        points={points}
        nowLabel={nowLabel}
        accent={accent}
        ariaLabel={ariaLabel}
        unit={unit}
        anchorOffset={anchorOffset}
        colorBy={colorBy}
        second={second}
        primaryName={primaryName}
      />
    ) : null}
    <FreshnessLine asOf={asOf} updated={updated} />
    {source ? (
      <SourceAttribution source={source} />
    ) : null}
  </section>
);
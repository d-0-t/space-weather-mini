import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
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

import {
  parseRtswWind,
  parseRtswMagField,
  RTSW_WIND_URL,
  RTSW_MAG_FIELD_URL,
} from "../../../../../products/solar-wind";
import {
  parseHemiPower,
  HEMI_POWER_URL,
} from "../../../../../products/hemi-power";
import {
  parseKyotoDst,
  KYOTO_DST_URL,
} from "../../../../../products/kyoto-dst";
import {
  parseBoulderKIndex,
  BOULDER_K_INDEX_URL,
} from "../../../../../products/boulder-k-index";
import { formatAge } from "../../../../../products/live-helpers";

import "./SpaceWeatherNow.scss";

const KIRUNA_MAGNETOGRAM_URL =
  "https://spaceweather.irf.se/data/irf-kir-mag.png";
const KIRUNA_MAGNETOGRAM_SOURCE_URL =
  "https://spaceweather.irf.se/forecast/mag/";

/**
 * Developer-configurable chart windows, in MINUTES per feed.
 * - dst: hourly data → 1440 minutes = last 24 hours
 * - hemi: 5-min data → 300 minutes = last 5 hours
 * - boulder: 1-min data → 180 minutes = last 3 hours
 * The L1 (solar wind) charts are windowed dynamically: BEFORE_NOW_MINUTES of
 * data before the Now line, plus every fresher reading that is still
 * propagating to Earth (the transit minutes). Windows are measured in wall
 * time, because the feeds burst multiple rows per minute.
 */
export const DATA_WINDOWS = {
  dst: 24 * 60,
  hemi: 5 * 60,
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
const BEFORE_NOW_MINUTES = 120;

// DSCOVR sits at L1, ~1.5 million km upstream of Earth. The measured solar
// wind reaches Earth `1.5e6 / speed` minutes later – the "Now" line is drawn
// that far past the latest reading on the solar-wind charts.
const L1_DISTANCE_KM = 1_500_000;

const fetchWind = async () => {
  const response = await fetch(RTSW_WIND_URL);
  if (!response.ok) throw new Error(`NOAA returned ${response.status}`);
  return parseRtswWind(await response.text());
};

const fetchMagField = async () => {
  const response = await fetch(RTSW_MAG_FIELD_URL);
  if (!response.ok) throw new Error(`NOAA returned ${response.status}`);
  return parseRtswMagField(await response.text());
};

const fetchHemiPower = async () => {
  const response = await fetch(HEMI_POWER_URL);
  if (!response.ok) throw new Error(`NOAA returned ${response.status}`);
  return parseHemiPower(await response.text());
};

const fetchDst = async () => {
  const response = await fetch(KYOTO_DST_URL);
  if (!response.ok) throw new Error(`NOAA returned ${response.status}`);
  return parseKyotoDst(await response.text());
};

const fetchBoulder = async () => {
  const response = await fetch(BOULDER_K_INDEX_URL);
  if (!response.ok) throw new Error(`NOAA returned ${response.status}`);
  return parseBoulderKIndex(await response.text());
};

interface ChartPoint {
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
function chartTimeLabel(timeTag: string): string {
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
 * `windowMinutes` before the freshest reading. Bucketing averages away the
 * 1-min burst noise and decimates the point count for a clean line.
 * Missing readings leave an empty bucket (a gap in the line).
 */
export function smoothPoints(
  rows: { time_tag: string; value: number | null }[],
  windowMinutes: number,
  bucketMinutes: number,
): ChartPoint[] {
  const newest = rows.length > 0 ? tagMs(rows[rows.length - 1].time_tag) : 0;
  const cutoff = newest - windowMinutes * 60_000;
  const buckets = new Map<
    number,
    { sum: number; count: number; first: number }
  >();
  for (const row of rows) {
    const ms = tagMs(row.time_tag);
    if (row.value === null || ms < cutoff) continue;
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

function latestValue(rows: { time_tag: string; value: number | null }[]): {
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
function valueAt(
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

const MiniSparkline: React.FC<{
  title: string;
  points: ChartPoint[];
  /** When set, draws the Now line (L1 charts only) */
  nowLabel?: string;
  accent: string;
  ariaLabel: string;
  unit: string;
  /** Points the Now line sits past the freshest reading (transit minutes) */
  anchorOffset?: number;
}> = ({
  title,
  points,
  nowLabel,
  accent,
  ariaLabel,
  unit,
  anchorOffset = 0,
}) => {
  const hasNow = Boolean(nowLabel);
  const chartPoints = hasNow
    ? withNowAnchor(points, nowLabel!, anchorOffset)
    : points;
  const nowX = hasNow
    ? chartPoints.find((p) => p.time === nowLabel)?.x
    : undefined;
  return (
    <div role="img" aria-label={ariaLabel} className="space-weather-now__chart">
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
            domain={["auto", "auto"]}
            tick={{ fill: "var(--color-white)", fontSize: 11 }}
            width={44}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ stroke: "var(--color-white)", strokeOpacity: 0.3 }}
            contentStyle={{
              backgroundColor: "var(--color-black)",
              border: "1px solid var(--color-border-muted)",
              padding: "2px 6px",
              fontSize: 12,
            }}
            labelStyle={{ fontSize: 12 }}
            itemStyle={{ fontSize: 12 }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) => [
              value === null || value === undefined
                ? "–"
                : `${Number(value).toFixed(2)} ${unit}`,
              title,
            ]}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            labelFormatter={(_label: any, payload: any) => {
              const point = payload?.[0]?.payload as ChartPoint | undefined;
              return point ? formatTooltipTime(point.timeTag) : "";
            }}
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
          <Line
            type="monotone"
            dataKey="value"
            name={title}
            stroke={accent}
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
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

const ChartHelp: React.FC<{ content: ChartHelpContent }> = ({ content }) => {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  // Escape closes the popover and returns focus to the "?" trigger
  const handleKeyDown: React.KeyboardEventHandler<HTMLElement> = (event) => {
    if (event.key === "Escape" && detailsRef.current?.open) {
      event.preventDefault();
      detailsRef.current.open = false;
      detailsRef.current.querySelector("summary")?.focus();
    }
  };
  return (
    <details
      ref={detailsRef}
      className="space-weather-now__help"
      onKeyDown={handleKeyDown}
    >
      <summary>
        <span aria-hidden="true">?</span>
        <span className="sr-only">{content.label}</span>
      </summary>
      {content.rows || content.text ? (
        <div className="space-weather-now__popover">
          {content.rows ? (
            <ul className="space-weather-now__scale">
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

const SparklineCard: React.FC<{
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
  warning?: string | null;
  anchorOffset?: number;
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
  warning,
  anchorOffset,
}) => (
  <section className="space-weather-now__card">
    <div className="space-weather-now__head">
      <h3>{title}</h3>
      <ChartHelp content={help} />
    </div>
    {warning ? <p className="space-weather-now__warning">{warning}</p> : null}
    <p className="space-weather-now__value">
      {value}
      {note ? <span className="space-weather-now__note"> {note}</span> : null}
    </p>
    {points.length > 1 ? (
      <>
        <MiniSparkline
          title={title}
          points={points}
          nowLabel={nowLabel}
          accent={accent}
          ariaLabel={ariaLabel}
          unit={unit}
          anchorOffset={anchorOffset}
        />
      </>
    ) : null}
    <p className="space-weather-now__fresh">
      Updated {updated} ({asOf !== "–" ? formatLocalTime(asOf) : "–"})
    </p>
  </section>
);

const KirunaMagnetogramCard: React.FC = () => (
  <section className="space-weather-now__card space-weather-now__card--wide">
    <div className="space-weather-now__head">
      <h3>Kiruna magnetometer</h3>
      <ChartHelp
        content={{
          label: "About the Kiruna magnetogram",
          text: "IRF's live magnetogram for Kiruna (68°N, Sweden) plots the X, Y and Z field components in nT over 24 hours. Gentle wiggles are normal. Large swings – especially 100+ nT in the X component – mean substorms are overhead, so bright aurora is likely at high latitudes.",
        }}
      />
    </div>
    <div className="space-weather-now__panel">
      <a
        href={KIRUNA_MAGNETOGRAM_SOURCE_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        <img
          src={KIRUNA_MAGNETOGRAM_URL}
          alt="Kiruna magnetogram, X Y and Z components in nT over the last 24 hours"
        />
      </a>
      <p className="space-weather-now__fresh">
        <a
          href="https://spaceweather.irf.se"
          target="_blank"
          rel="noopener noreferrer"
        >
          Source: IRF →
        </a>
      </p>
    </div>
  </section>
);

const BoulderMagnetometerCard: React.FC = () => {
  const boulderQuery = useQuery({
    queryKey: ["boulder-k-index", "live"],
    queryFn: fetchBoulder,
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: false,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const boulderRows = (boulderQuery.data ?? []).map((p) => ({
    time_tag: p.time_tag,
    value: p.k_index,
  }));
  const points = smoothPoints(
    boulderRows,
    DATA_WINDOWS.boulder,
    SMOOTHING.boulder,
  );
  const latest = latestValue(boulderRows);
  const warning =
    boulderQuery.isError && boulderQuery.data
      ? "⚠ Live data unavailable – showing cache"
      : null;

  return (
    <section className="space-weather-now__card">
      <div className="space-weather-now__head">
        <h3>NOAA magnetometer (Boulder)</h3>
        <ChartHelp
          content={{
            label: "About the NOAA magnetometer",
            rows: [
              ["0-2", "quiet"],
              ["3", "unsettled"],
              ["4", "active"],
              ["5+", "minor storm"],
            ],
            text: "NOAA Boulder's local K index (0-9), measured by a ground magnetometer in Colorado. A simple local gauge of how disturbed the magnetic field is around you.",
          }}
        />
      </div>
      {warning ? <p className="space-weather-now__warning">{warning}</p> : null}
      <p className="space-weather-now__value">
        K {latest.value !== null ? latest.value.toFixed(1) : "–"}
        <span className="space-weather-now__note"> (local ground)</span>
      </p>
      {points.length > 1 ? (
        <>
          <MiniSparkline
            title="Boulder K index"
            points={points}
            accent="orange"
            unit="K"
            ariaLabel="Boulder magnetometer K index, last 3 hours"
          />
        </>
      ) : null}
      <p className="space-weather-now__fresh">
        Updated {latest.timeTag ? formatAge(latest.timeTag) : "–"} (
        {latest.timeTag ? formatLocalTime(latest.timeTag) : "–"})
      </p>
    </section>
  );
};

/** Space Weather Now – mini charts for the current solar wind and magnetosphere. */
const SpaceWeatherNow: React.FC = () => {
  const windQuery = useQuery({
    queryKey: ["rtsw-wind", "live"],
    queryFn: fetchWind,
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: false,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const magQuery = useQuery({
    queryKey: ["rtsw-mag-field", "live"],
    queryFn: fetchMagField,
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: false,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const hemiQuery = useQuery({
    queryKey: ["hemi-power", "live"],
    queryFn: fetchHemiPower,
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: false,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const dstQuery = useQuery({
    queryKey: ["kyoto-dst", "live"],
    queryFn: fetchDst,
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: false,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const wind = windQuery.data;
  const mag = magQuery.data;

  if (windQuery.isPending && !wind) {
    return (
      <article className="space-weather-now" aria-busy="true">
        <h2>Space Weather Now</h2>
        <p>Loading solar wind…</p>
      </article>
    );
  }
  if ((windQuery.isError && !wind) || (magQuery.isError && !mag)) {
    return (
      <article className="space-weather-now">
        <h2>Space Weather Now</h2>
        <p>Couldn&apos;t load space weather. Please check back later.</p>
      </article>
    );
  }
  if (!wind || !mag) return null;

  const speedRows = wind.map((p) => ({ time_tag: p.time_tag, value: p.speed }));
  const densityRows = wind.map((p) => ({
    time_tag: p.time_tag,
    value: p.density,
  }));
  const btRows = mag.map((p) => ({ time_tag: p.time_tag, value: p.bt }));
  const bzRows = mag.map((p) => ({ time_tag: p.time_tag, value: p.bz_gsm }));

  const speed = latestValue(speedRows);
  const density = latestValue(densityRows);
  const bt = latestValue(btRows);
  const bz = latestValue(bzRows);

  // "Now" on the L1 charts = the reading that is arriving at Earth right now:
  // the freshest measurement minus the L1→Earth propagation delay. The chart
  // shows BEFORE_NOW_MINUTES of data before it plus every fresher reading.
  const transit = transitMinutes(speed.value);
  const latestSource = [...wind]
    .reverse()
    .find((p) => p.speed !== null)?.source;
  const windNowTag = addMinutes(speed.timeTag ?? "", -transit);
  const magNowTag = addMinutes(bt.timeTag ?? "", -transit);
  const windNowLabel = chartTimeLabel(windNowTag);
  const magNowLabel = chartTimeLabel(magNowTag);
  const l1Window = BEFORE_NOW_MINUTES + transit;
  const l1AnchorOffset = Math.round(transit / SMOOTHING.solarWind);

  // Headline values show the reading closest to "Now" (arriving at Earth now),
  // not the freshest measurement (still propagating to Earth). The freshness
  // line instead tracks the feed's freshest reading – when it was updated.
  const speedNow = valueAt(speedRows, windNowTag);
  const densityNow = valueAt(densityRows, windNowTag);
  const btNow = valueAt(btRows, magNowTag);
  const bzNow = valueAt(bzRows, magNowTag);

  const latestHemi = hemiQuery.data?.points[hemiQuery.data.points.length - 1];
  const latestDst = dstQuery.data?.points[dstQuery.data.points.length - 1];

  const stale = (query: { isError: boolean; data?: unknown }) =>
    query.isError && query.data
      ? "⚠ Live data unavailable – showing cache"
      : null;

  return (
    <article className="space-weather-now">
      <h2>Space Weather Now</h2>
      {transit > 0 ? (
        <p className="space-weather-now__explain">
          We are {transit} minutes behind{" "}
          {latestSource ? `${latestSource}'s` : "the L1 spacecraft's"} data,
          based on solar wind speed.
        </p>
      ) : null}
      <div className="space-weather-now__grid">
        <SparklineCard
          title="Solar wind"
          value={speedNow.value !== null ? speedNow.value.toFixed(0) : "–"}
          note="km/s"
          unit="km/s"
          help={{
            label: "About solar wind",
            rows: [
              ["< 400 km/s", "normal"],
              ["400 km/s", "elevated"],
              ["500 km/s", "moderate"],
              ["700 km/s", "high"],
              ["900 km/s", "very high"],
            ],
          }}
          asOf={speed.timeTag ?? "–"}
          updated={speed.timeTag ? formatAge(speed.timeTag) : "–"}
          points={smoothPoints(speedRows, l1Window, SMOOTHING.solarWind)}
          nowLabel={windNowLabel}
          anchorOffset={l1AnchorOffset}
          accent="greenyellow"
          ariaLabel="Solar wind speed, km/s, 2 hours before Now plus upcoming"
          warning={stale(windQuery)}
        />
        <SparklineCard
          title="Particle density"
          value={densityNow.value !== null ? densityNow.value.toFixed(1) : "–"}
          note="p/cm³"
          unit="p/cm³"
          help={{
            label: "About particle density",
            rows: [
              ["1-10 p/cm³", "low"],
              ["10-20 p/cm³", "moderate"],
              ["40+ p/cm³", "high"],
              ["60+ p/cm³", "very high"],
            ],
          }}
          asOf={density.timeTag ?? "–"}
          updated={density.timeTag ? formatAge(density.timeTag) : "–"}
          points={smoothPoints(densityRows, l1Window, SMOOTHING.solarWind)}
          nowLabel={windNowLabel}
          anchorOffset={l1AnchorOffset}
          accent="cyan"
          ariaLabel="Proton density, p per cubic cm, 2 hours before Now plus upcoming"
          warning={stale(windQuery)}
        />
        <SparklineCard
          title="Bt"
          unit="nT"
          help={{
            label: "About Bt",
            rows: [
              ["< 5 nT", "quiet"],
              ["5-15 nT", "elevated"],
              ["15-30 nT", "strong"],
              ["30+ nT", "very strong"],
            ],
          }}
          value={btNow.value !== null ? btNow.value.toFixed(1) : "–"}
          note="nT"
          asOf={bt.timeTag ?? "–"}
          updated={bt.timeTag ? formatAge(bt.timeTag) : "–"}
          points={smoothPoints(btRows, l1Window, SMOOTHING.solarWind)}
          nowLabel={magNowLabel}
          anchorOffset={l1AnchorOffset}
          accent="plum"
          ariaLabel="Total magnetic field strength Bt, nT, 2 hours before Now plus upcoming"
          warning={stale(magQuery)}
        />
        <SparklineCard
          title="Bz"
          unit="nT"
          help={{
            label: "About Bz",
            rows: [
              ["+ (northward)", "quiet"],
              ["- (southward)", "potential"],
              ["0 to −5 nT", "mild"],
              ["−5 to −10 nT", "active (Kp3-4)"],
              ["−10 to −20 nT", "storm (Kp5-7)"],
              ["< −20 nT", "major storm (Kp7+)"],
            ],
          }}
          value={
            bzNow.value !== null
              ? `${bzNow.value >= 0 ? "+" : ""}${bzNow.value.toFixed(1)}`
              : "–"
          }
          note={
            bzNow.value !== null
              ? `nT (${bzNow.value < 0 ? "South" : "North"})`
              : "nT"
          }
          asOf={bz.timeTag ?? "–"}
          updated={bz.timeTag ? formatAge(bz.timeTag) : "–"}
          points={smoothPoints(bzRows, l1Window, SMOOTHING.solarWind)}
          nowLabel={magNowLabel}
          anchorOffset={l1AnchorOffset}
          accent="orange"
          ariaLabel="Bz GSM magnetic field, nT, 2 hours before Now plus upcoming, south or north"
          warning={stale(magQuery)}
        />
        <SparklineCard
          title="Hemispheric power"
          value={latestHemi ? String(Math.round(latestHemi.northPowerGW)) : "–"}
          note="GW"
          unit="GW"
          help={{
            label: "About hemispheric power",
            rows: [
              ["< 10 GW", "quiet"],
              ["15-30 GW", "active"],
              ["30-50 GW", "strong"],
              ["50+ GW", "very strong"],
            ],
          }}
          asOf={latestHemi ? latestHemi.observationTime : "–"}
          updated={
            latestHemi
              ? formatAge(latestHemi.observationTime.replace("_", "T"))
              : "–"
          }
          points={smoothPoints(
            (hemiQuery.data?.points ?? []).map((p) => ({
              time_tag: p.observationTime,
              value: p.northPowerGW,
            })),
            DATA_WINDOWS.hemi,
            SMOOTHING.hemi,
          )}
          accent="plum"
          ariaLabel="Hemispheric power, last 5 hours, gigawatts"
          warning={stale(hemiQuery)}
        />
        <SparklineCard
          title="Dst (Kyoto)"
          unit="nT"
          help={{
            label: "About Dst",
            rows: [
              ["0 to −30 nT", "quiet to unsettled"],
              ["−50 to −100 nT", "moderate storm"],
              ["−100 to −200 nT", "strong storm"],
              ["< −200 nT", "severe storm"],
            ],
          }}
          value={latestDst ? String(latestDst.dst) : "–"}
          note="nT"
          asOf={latestDst ? latestDst.time_tag : "–"}
          updated={latestDst ? formatAge(latestDst.time_tag) : "–"}
          points={smoothPoints(
            (dstQuery.data?.points ?? []).map((p) => ({
              time_tag: p.time_tag,
              value: p.dst,
            })),
            DATA_WINDOWS.dst,
            SMOOTHING.dst,
          )}
          accent="cyan"
          ariaLabel="Disturbance storm index, last 24 hours, nT"
          warning={stale(dstQuery)}
        />
        <KirunaMagnetogramCard />
        <BoulderMagnetometerCard />
      </div>
    </article>
  );
};

export default SpaceWeatherNow;

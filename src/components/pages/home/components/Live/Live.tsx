import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  parseThreeDayForecast,
  THREE_DAY_FORECAST_URL,
} from "../../../../../products/3-day-forecast";
import {
  parsePlanetaryKIndex,
  NOAA_PLANETARY_K_INDEX_URL,
} from "../../../../../products/noaa-planetary-k-index";
import {
  parsePlanetaryKIndexForecast,
  NOAA_PLANETARY_K_INDEX_FORECAST_URL,
} from "../../../../../products/noaa-planetary-k-index";
import { formatAge } from "../../../../../products/live-helpers";

import "./Live.scss";

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Formats "Aug 25" → "Tuesday\n25/08" (weekday and short date on two lines) */
export function formatDayLabel(dayLabel: string): string {
  const [monStr, dayStr] = dayLabel.split(" ");
  const monthIndex = MONTHS_SHORT.indexOf(monStr);
  if (monthIndex === -1) return dayLabel;
  const now = new Date();
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), monthIndex, Number(dayStr)),
  );
  if (isNaN(d.getTime())) return dayLabel;
  const weekday = d.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${weekday}\n${dd}/${mm}`;
}

/** Formats ISO "2026-08-18T00:00:00" → "Aug 18\n00:00" for chart XAxis (two lines) */
export function formatChartLabel(timeTag: string): string {
  const iso =
    timeTag.endsWith("Z") || timeTag.includes("+") ? timeTag : `${timeTag}Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    const sliced = timeTag.slice(5, 16); // "08-18T00:00"
    const [datePart, timePart] = sliced.split("T");
    if (!datePart || !timePart) return sliced.replace("T", "\n");
    const [mm, dd] = datePart.split("-");
    const monthIdx = Number(mm) - 1;
    const mon = MONTHS_SHORT[monthIdx] ?? mm;
    return `${mon} ${dd}\n${timePart}`;
  }
  const mon = MONTHS_SHORT[d.getUTCMonth()];
  const day = String(d.getUTCDate());
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mins = String(d.getUTCMinutes()).padStart(2, "0");
  return `${mon} ${day}\n${hh}:${mins}`;
}

/** Two-line tick for chart: "Aug 18\n00:00" → two tspans */
const KpChartTick = (props: {
  x?: number;
  y?: number;
  payload?: { value: string };
}) => {
  const { x, y, payload } = props;
  if (payload == null || x == null || y == null) return null;
  const value = payload.value ?? "";
  const [line1, line2] = value.split("\n");
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="middle"
        fill="var(--color-white)"
        fontSize={11}
      >
        <tspan x={0} dy="0">
          {line1}
        </tspan>
        {line2 ? (
          <tspan x={0} dy="1.2em">
            {line2}
          </tspan>
        ) : null}
      </text>
    </g>
  );
};

export function formatKp(kp: number): string {
  return `Kp${kp}`;
}

export function formatTimeSlot(slot: string): string {
  return slot.replace("-", ":00 - ").replace("UT", ":00 UTC");
}

const KP_SEGMENT_CLASSES = [
  "kp01",
  "kp12",
  "kp23",
  "kp34",
  "kp45",
  "kp56",
  "kp67",
  "kp78",
  "kp89",
  "kp9",
] as const;

export const KpBar: React.FC<{ kp: number }> = ({ kp }) => {
  const filled = Math.min(9, kp);
  return (
    <div className="kp-bar" role="img">
      <span className="sr-only">
        Kp ${kp} on scale 0 to 9, ${filled} of 9 segments colored
      </span>
      <span aria-hidden="true" className="kp-bar__start" />
      {KP_SEGMENT_CLASSES.map((cls, i) => {
        const nextIsNotFilled = i + 1 > filled;
        const isFilled = i <= filled;
        const stopNow = (nextIsNotFilled && isFilled) || (isFilled && i >= 9);
        return (
          <span key={cls} style={{ display: "contents" }}>
            <span
              className={`kp-bar__segment ${isFilled ? cls : "kp-bar__segment--empty"}`}
            >
              {i}
            </span>
            {stopNow ? <span className="kp-bar__stop" /> : null}
          </span>
        );
      })}
    </div>
  );
};

const fetchThreeDay = async () => {
  const response = await fetch(THREE_DAY_FORECAST_URL);
  if (!response.ok) throw new Error(`NOAA returned ${response.status}`);
  return parseThreeDayForecast(await response.text());
};

const fetchKpObserved = async () => {
  const response = await fetch(NOAA_PLANETARY_K_INDEX_URL);
  if (!response.ok) throw new Error(`NOAA returned ${response.status}`);
  return parsePlanetaryKIndex(await response.text());
};

const fetchKpForecast = async () => {
  const response = await fetch(NOAA_PLANETARY_K_INDEX_FORECAST_URL);
  if (!response.ok) throw new Error(`NOAA returned ${response.status}`);
  return parsePlanetaryKIndexForecast(await response.text());
};

/** Live – current observed Kp + min/max per day + merged observed/forecast chart */
const Live: React.FC = () => {
  const { data } = useQuery({
    queryKey: ["3-day-forecast"],
    queryFn: fetchThreeDay,
  });
  const observedQuery = useQuery({
    queryKey: ["planetary-k-index", "live"],
    queryFn: fetchKpObserved,
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: false,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const forecastQuery = useQuery({
    queryKey: ["planetary-k-index-forecast", "live"],
    queryFn: fetchKpForecast,
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: false,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // The live panel renders from the planetary JSON endpoints alone; the
  // 3-day text product is only an optional fallback for the min/max table.
  if (observedQuery.isPending && !observedQuery.data) {
    return (
      <article aria-busy="true">
        <h2>Live</h2>
        <p>Loading Kp forecast…</p>
      </article>
    );
  }
  if (observedQuery.isError && !observedQuery.data) {
    return (
      <article>
        <h2>Live</h2>
        <p>Couldn&apos;t load Kp forecast. Please check back later.</p>
      </article>
    );
  }
  if (!observedQuery.data) return null;

  const observed = observedQuery.data;
  const forecast = forecastQuery.data;
  const latestObserved = observed[observed.length - 1];
  const currentKp = latestObserved.Kp;
  const currentKpRounded = Math.floor(currentKp);
  // Current 3h window label derived from the latest observed time_tag, so a
  // 3-day text failure never blanks the panel.
  const observedTime = new Date(`${latestObserved.time_tag}Z`);
  const slotStart = Number.isNaN(observedTime.getTime())
    ? NaN
    : Math.floor(observedTime.getUTCHours() / 3) * 3;
  const currentSlot = Number.isNaN(slotStart)
    ? ""
    : `${String(slotStart).padStart(2, "0")}-${String(slotStart + 3).padStart(2, "0")}UT`;
  // Mini table groups planetary JSON observed+forecast by UTC calendar day for
  // today/tomorrow/dayAfter (UTC) so "today" is never missing; the 3-day text
  // breakdown fills any day the JSON has no bucket for yet.
  const rows = (() => {
    const now = new Date();
    const todayUTC = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const tableDays = [0, 1, 2].map((off) => {
      const d = new Date(todayUTC);
      d.setUTCDate(d.getUTCDate() + off);
      return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
    });
    return tableDays.map((dayLabel) => {
      const [monStr, dayStr] = dayLabel.split(" ");
      const monthIdx = MONTHS_SHORT.indexOf(monStr);
      const dayDate = new Date(
        Date.UTC(todayUTC.getUTCFullYear(), monthIdx, Number(dayStr)),
      );
      const values: number[] = [];
      for (const p of observed) {
        const t = new Date(`${p.time_tag}Z`);
        if (
          t.getUTCFullYear() === dayDate.getUTCFullYear() &&
          t.getUTCMonth() === dayDate.getUTCMonth() &&
          t.getUTCDate() === dayDate.getUTCDate()
        )
          values.push(p.Kp);
      }
      for (const p of forecast ?? []) {
        if (p.observed === "observed") continue; // include estimated + predicted for today gap (Aug26 estimated)
        const t = new Date(`${p.time_tag}Z`);
        if (
          t.getUTCFullYear() === dayDate.getUTCFullYear() &&
          t.getUTCMonth() === dayDate.getUTCMonth() &&
          t.getUTCDate() === dayDate.getUTCDate()
        )
          values.push(p.kp);
      }
      // Fallback to 3-day text breakdown when planetary has no bucket yet
      if (values.length === 0 && data) {
        const idx = data.days.indexOf(dayLabel);
        if (idx !== -1) {
          const breakdownVals = data.geomagneticActivity.kpBreakdown.map(
            (r) => r.days[idx],
          );
          values.push(...breakdownVals);
        }
      }
      const min = values.length ? Math.min(...values) : 0;
      const max = values.length ? Math.max(...values) : 0;
      const gLabel = max >= 5 ? `G${Math.min(5, Math.floor(max) - 4)}` : null;
      return { day: dayLabel, min, max, gLabel };
    });
  })();

  // Only last 24h (8 × 3h slots) of observed – full history was 7+ days and unreadable
  const RECENT_OBSERVED_COUNT = 8;
  const FORECAST_COUNT = 24; // 3 days × 8 slots
  const recentObserved = observed.slice(-RECENT_OBSERVED_COUNT);
  const observedChartData = recentObserved.map((p) => ({
    time: p.time_tag,
    label: formatChartLabel(p.time_tag),
    observed: p.Kp,
    forecast: null as number | null,
  }));
  const forecastChartData = (forecast ?? [])
    .filter((p) => p.observed !== "observed") // estimated + predicted, so Aug26 estimated gap is filled
    .slice(0, FORECAST_COUNT)
    .map((p) => ({
      time: p.time_tag,
      label: formatChartLabel(p.time_tag),
      observed: null as number | null,
      forecast: p.kp,
    }));
  const mergedData = [...observedChartData, ...forecastChartData].sort((a, b) =>
    a.time.localeCompare(b.time),
  );
  const nowLabel = formatChartLabel(latestObserved.time_tag);
  const age = formatAge(latestObserved.time_tag);
  const firstLabel = mergedData[0]?.label;
  const lastLabel = mergedData[mergedData.length - 1]?.label;

  return (
    <article className="live">
      <h2>Live</h2>
      <div className="live__current">
        <span className="live__current__time">
          {formatTimeSlot(currentSlot)}
        </span>
        <span
          className={`live__current__kp kp${currentKpRounded >= 9 ? "9" : currentKpRounded + "" + (currentKpRounded + 1)}`}
        >
          {formatKp(currentKp)}
        </span>
      </div>
      <KpBar kp={currentKpRounded} />
      {observedQuery.isError && observed ? (
        <p aria-live="polite">
          ⚠ Live data unavailable — showing {age}-old cache
        </p>
      ) : null}
      <div
        role="img"
        aria-label={`Kp observed (green circles) and forecast (plum triangles) merged, vertical Now at ${nowLabel.replace("\n", " ")}`}
        className="live__chart"
      >
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={mergedData} margin={{ bottom: 20 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border-muted-transparent)"
            />
            {firstLabel && nowLabel ? (
              <ReferenceArea
                x1={firstLabel}
                x2={nowLabel}
                fill="var(--color-dark-green)"
                fillOpacity={0.18}
                ifOverflow="extendDomain"
                strokeOpacity={0}
              />
            ) : null}
            {nowLabel && lastLabel ? (
              <ReferenceArea
                x1={nowLabel}
                x2={lastLabel}
                fill="var(--color-black)"
                fillOpacity={0.35}
                ifOverflow="extendDomain"
                strokeOpacity={0}
              />
            ) : null}
            <XAxis
              dataKey="label"
              interval="preserveStartEnd"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              tick={KpChartTick as any}
              height={36}
              tickMargin={4}
            />
            <YAxis
              domain={[0, 9]}
              tick={{ fill: "var(--color-white)", fontSize: 11 }}
              width={24}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-black)",
                border: "1px solid var(--color-border-muted)",
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              labelFormatter={(label: any) =>
                typeof label === "string"
                  ? label.replace("\n", " ")
                  : String(label)
              }
            />
            <ReferenceLine
              x={nowLabel}
              stroke="var(--color-white)"
              strokeWidth={2.5}
              ifOverflow="extendDomain"
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
                  fontSize: 13,
                  fontWeight: 800,
                  dy: 10,
                } as any
              }
            />
            <Line
              type="monotone"
              dataKey="observed"
              name="Kp observed"
              stroke="greenyellow"
              strokeWidth={2}
              dot={false}
              activeDot={false}
              legendType="circle"
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="forecast"
              name="Kp forecast"
              stroke="plum"
              strokeWidth={2}
              dot={false}
              activeDot={false}
              legendType="triangle"
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Kp observed and forecast merged</caption>
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Observed Kp</th>
            <th scope="col">Forecast Kp</th>
          </tr>
        </thead>
        <tbody>
          {mergedData.map((d) => (
            <tr key={d.time}>
              <td>{d.label.replace("\n", " ")}</td>
              <td>{d.observed ?? "—"}</td>
              <td>{d.forecast ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table>
        <caption>Kp-index forecast (UTC)</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Min</th>
            <th scope="col">Max</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const label = formatDayLabel(r.day);
            const parts = label.split("\n");
            return (
              <tr key={r.day}>
                <th scope="row" className="live__day">
                  {parts[0]}
                  {parts[1] ? (
                    <>
                      <br />
                      {parts[1]}
                    </>
                  ) : null}
                </th>
                <td
                  className={`kp${r.min >= 9 ? "9" : Math.ceil(r.min) + "" + (Math.ceil(r.min) + 1)}`}
                >
                  {formatKp(r.min)}
                </td>
                <td
                  className={`kp${r.max >= 9 ? "9" : Math.ceil(r.max) + "" + (Math.ceil(r.max) + 1)}`}
                >
                  {formatKp(r.max)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p>
        <Link to="/forecasts/3days">Full 3-day forecast →</Link>
      </p>
      <p>
        <Link to="/forecasts/daily">Daily observations →</Link>
      </p>
    </article>
  );
};

export default Live;

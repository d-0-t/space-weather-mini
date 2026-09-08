import { useId } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Symbols,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import FullSizeModal from "../../../../FullSizeModal";
import { SOURCES } from "../../../../sources";
import { SourceAttribution } from "../../../../sources";
import {
  MoonLine,
  MoonYAxis,
  enrichWithMoon,
  moonTooltipFormatter,
} from "../../../../moon/moon-chart";
import CollapsiblePanel from "../../../../CollapsiblePanel/CollapsiblePanel";
import { useDisplayTimezone } from "../../../../DisplayTimezone/DisplayTimezoneContext";
import {
  addDays,
  dayKeyOf,
  formatDayLabel,
  formatShortDay,
  formatSlotTick,
  type DayKey,
  utcSuffix,
} from "../../../../../products/display-time";
import {
  fetchKpForecast,
  fetchKpObserved,
  fetchThreeDay,
  formatKp,
  kpClass,
} from "../kp-panel/kp-panel";
import {
  COULDNT_LOAD_COPY,
  StaleDataNotice,
  useIsOffline,
} from "../offline/offline";

import "./Forecast.scss";

const ENLIL_VIDEO_URL = "https://spaceweather.irf.se/data/swpc_enlil.mp4";
const ENLIL_SOURCE_URL = "https://spaceweather.irf.se/forecast/enlil/";

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

/**
 * Forecast – observed + forecast Kp chart, the 3-day min/max table, the
 * IRF ENLIL predicted solar wind video and links to the full forecast pages.
 */
const Forecast: React.FC = () => {
  const forecastChartLabelId = useId();
  const offline = useIsOffline();
  const { displayTimezone } = useDisplayTimezone();
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

  // The forecast panel renders from the planetary JSON endpoints alone; the
  // 3-day text product is only an optional fallback for the min/max table.
  if (observedQuery.isPending && !observedQuery.data) {
    return (
      <article className="forecast" aria-busy="true">
        <CollapsiblePanel
          heading={<h2>Forecast</h2>}
          bodyId="forecast-panel-body"
        >
          <p>Loading Kp forecast…</p>
        </CollapsiblePanel>
      </article>
    );
  }
  if (observedQuery.isError && !observedQuery.data) {
    return (
      <article className="forecast">
        <CollapsiblePanel
          heading={<h2>Forecast</h2>}
          bodyId="forecast-panel-body"
        >
          <p>{COULDNT_LOAD_COPY}</p>
        </CollapsiblePanel>
      </article>
    );
  }
  if (!observedQuery.data) return null;

  const observed = observedQuery.data;
  const forecast = forecastQuery.data;

  const showingSaved = (observedQuery.isError || offline) && Boolean(observed);

  // Mini table groups planetary JSON observed+forecast by Display-timezone
  // calendar day for today/tomorrow/day-after so "today" is the display
  // timezone's day and never missing; the 3-day text breakdown fills any
  // day the JSON has no bucket for yet.
  const rows = (() => {
    const today = dayKeyOf(new Date(), displayTimezone);
    const tableDays = [0, 1, 2].map((off) => addDays(today, off));
    const sameDay = (a: DayKey, b: DayKey) =>
      a.year === b.year && a.month === b.month && a.day === b.day;
    const dayOf = (timeTag: string) =>
      dayKeyOf(new Date(`${timeTag}Z`), displayTimezone);
    return tableDays.map((dayKey) => {
      const values: number[] = [];
      for (const p of observed) {
        if (sameDay(dayOf(p.time_tag), dayKey)) values.push(p.Kp);
      }
      for (const p of forecast ?? []) {
        if (p.observed === "observed") continue; // include estimated + predicted for today gap (Aug26 estimated)
        if (sameDay(dayOf(p.time_tag), dayKey)) values.push(p.kp);
      }
      // Fallback to 3-day text breakdown when planetary has no bucket yet
      if (values.length === 0 && data) {
        const idx = data.days.indexOf(formatShortDay(dayKey));
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
      return { dayKey, day: formatShortDay(dayKey), min, max, gLabel };
    });
  })();

  // Only last 24h (8 × 3h slots) of observed – full history was 7+ days and unreadable
  const RECENT_OBSERVED_COUNT = 8;
  const FORECAST_COUNT = 24; // 3 days × 8 slots
  const recentObserved = observed.slice(-RECENT_OBSERVED_COUNT);
  const observedChartData = recentObserved.map((p) => ({
    time: p.time_tag,
    label: formatSlotTick(p.time_tag, displayTimezone),
    observed: p.Kp,
    forecast: null as number | null,
  }));
  const forecastChartData = (forecast ?? [])
    .filter((p) => p.observed !== "observed") // estimated + predicted, so Aug26 estimated gap is filled
    .slice(0, FORECAST_COUNT)
    .map((p) => ({
      time: p.time_tag,
      label: formatSlotTick(p.time_tag, displayTimezone),
      observed: null as number | null,
      forecast: p.kp,
    }));
  const mergedData = enrichWithMoon(
    [...observedChartData, ...forecastChartData].sort((a, b) =>
      a.time.localeCompare(b.time),
    ),
  );
  const latestObserved = observed[observed.length - 1];
  const nowLabel = formatSlotTick(latestObserved.time_tag, displayTimezone);
  const firstLabel = mergedData[0]?.label;
  const lastLabel = mergedData[mergedData.length - 1]?.label;

  return (
    <article className="forecast">
      <CollapsiblePanel
        heading={<h2>Forecast</h2>}
        bodyId="forecast-panel-body"
      >
        {showingSaved ? <StaleDataNotice /> : null}
        <div
          role="img"
          aria-labelledby={forecastChartLabelId}
          className="forecast__chart"
        >
          <span className="sr-only" id={forecastChartLabelId}>
            {`Kp observed (green circles) and forecast (plum squares) merged, vertical Now at ${nowLabel.replace("\n", " ")}; Moon illumination (blue, right axis, percent)`}
          </span>
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
              <MoonYAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-black)",
                  border: "1px solid var(--color-border-muted)",
                }}
                formatter={moonTooltipFormatter}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                labelFormatter={(label: any) => {
                  const flat =
                    typeof label === "string"
                      ? label.replace("\n", " ")
                      : String(label);
                  return `${flat}${utcSuffix(displayTimezone)}`;
                }}
              />
              <Legend
                // Keep the legend in series order regardless of recharts'
                // payload registration order: observed → forecast → moon
                itemSorter={(item) => {
                  switch (item.value) {
                    case "Kp observed":
                      return 0;
                    case "Kp forecast":
                      return 1;
                    case "Moon illumination":
                      return 2;
                    default:
                      return 3;
                  }
                }}
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
                dot={({ cx, cy, stroke }) => (
                  <Symbols
                    cx={cx}
                    cy={cy}
                    type="circle"
                    size={64}
                    fill={stroke}
                  />
                )}
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
                dot={({ cx, cy, stroke }) => (
                  <Symbols
                    cx={cx}
                    cy={cy}
                    type="square"
                    size={64}
                    fill={stroke}
                  />
                )}
                activeDot={false}
                legendType="square"
                connectNulls={false}
              />
              <MoonLine />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <h3 className="mini-table-heading">3-day Kp-index forecast</h3>
        <table>
          <caption className="sr-only">3-day Kp-index forecast</caption>
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Min</th>
              <th scope="col">Max</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const label = formatDayLabel(r.dayKey);
              const parts = label.split("\n");
              return (
                <tr key={r.day}>
                  <th scope="row" className="forecast__day">
                    {parts[0]}
                    {parts[1] ? (
                      <>
                        <br />
                        {parts[1]}
                      </>
                    ) : null}
                  </th>
                  <td className={kpClass(r.min)}>{formatKp(r.min)}</td>
                  <td className={kpClass(r.max)}>{formatKp(r.max)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <SourceAttribution source={SOURCES.noaaSwpc} />
        <h3>Predicted solar wind</h3>
        <figure className="forecast__figure">
          <FullSizeModal
            label="Predicted solar wind video, full size"
            triggerClassName="forecast__video-tile"
            trigger={
              <video
                aria-hidden="true"
                muted
                preload="metadata"
                src={ENLIL_VIDEO_URL}
              />
            }
          >
            <video controls preload="metadata" src={ENLIL_VIDEO_URL}>
              <p>
                Your browser can&apos;t play this video – see the{" "}
                <Link to="/forecasts/27days">27-day outlook</Link> and the{" "}
                <Link to="/forecasts/3days">3-day forecast</Link> panels
                instead.
              </p>
            </video>
          </FullSizeModal>
          <figcaption>
            Visualization of the predicted solar wind speed over the coming
            days. The Solar Wind panel shows the wind arriving at Earth right
            now; the <Link to="/forecasts/27days">27-day outlook</Link> and{" "}
            <Link to="/forecasts/3days">3-day forecast</Link> panels give the
            numbers behind this video.
          </figcaption>
        </figure>
        <SourceAttribution source={{ label: "IRF", href: ENLIL_SOURCE_URL }} />
        <div className="forecast__links">
          <Link to="/forecasts/3days">Full 3-day forecast →</Link>
          <Link to="/forecasts/daily">Daily observations →</Link>
        </div>
      </CollapsiblePanel>
    </article>
  );
};

export default Forecast;

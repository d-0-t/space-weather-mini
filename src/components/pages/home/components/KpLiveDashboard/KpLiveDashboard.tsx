import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  parsePlanetaryKIndex,
  parsePlanetaryKIndexForecast,
  NOAA_PLANETARY_K_INDEX_URL,
  NOAA_PLANETARY_K_INDEX_FORECAST_URL,
} from "../../../../../products/noaa-planetary-k-index";
import { formatAge } from "../../../../../products/live-helpers";
import { kpClass } from "../../../../../styles/kp-class";
import GlossaryTerm from "../../../../explainers/GlossaryTerm";

import "./KpLiveDashboard.scss";

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

const KpLiveDashboard: React.FC = () => {
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

  const data = observedQuery.data;
  const forecastData = forecastQuery.data;
  const isPending = observedQuery.isPending && !data;
  const isError = observedQuery.isError || forecastQuery.isError;

  if (isPending) {
    return (
      <article className="kp-live-dashboard" aria-busy="true">
        <h2>Kp Live</h2>
        <p>Loading planetary K-index…</p>
      </article>
    );
  }
  if (
    (observedQuery.isError && !data) ||
    (forecastQuery.isError && !forecastData)
  ) {
    return (
      <article className="kp-live-dashboard">
        <h2>Kp Live</h2>
        <p>Couldn&apos;t load Kp index. Please check back later.</p>
      </article>
    );
  }
  if (!data || !forecastData) return null;

  const latest = data[data.length - 1];
  const gLabel =
    latest.Kp >= 5 ? `G${Math.min(5, Math.floor(latest.Kp) - 4)}` : null;
  const age = formatAge(latest.time_tag);
  const issuedLocal = (() => {
    try {
      return new Date(latest.time_tag + "Z").toLocaleString(undefined, {
        timeZoneName: "long",
      });
    } catch {
      return latest.time_tag;
    }
  })();

  const staleWarning =
    isError && data ? (
      <p aria-live="polite">
        ⚠ Live data unavailable – showing {age}-old cache
      </p>
    ) : null;

  const chartData = data.map((p) => ({
    time_tag: p.time_tag,
    label: p.time_tag.slice(5, 16),
    kp: p.Kp,
  }));
  const forecastChartData = forecastData
    .filter((p) => p.observed === "predicted")
    .slice(0, 8)
    .map((p) => ({
      time_tag: p.time_tag,
      label: p.time_tag.slice(5, 16),
      kp: p.kp,
    }));

  return (
    <article className="kp-live-dashboard">
      <h2>
        Kp Live{" "}
        {gLabel && (
          <span
            className={kpClass(latest.Kp)}
            style={{ padding: "2px 6px", borderRadius: 4 }}
          >
            {gLabel}
          </span>
        )}
      </h2>
      <p>
        Current <GlossaryTerm termId="kp-index">Kp index</GlossaryTerm>:{" "}
        {latest.Kp} {gLabel && `(${gLabel})`}
        <br />
        <b>As of {latest.time_tag} UTC</b> · Issued (local): {issuedLocal} ·
        Updated {age}
      </p>
      {staleWarning}
      <div
        role="img"
        aria-label={`Kp index observed history: ${chartData.map((d) => `${d.label} Kp${d.kp}`).join(", ")}`}
        className="kp-live-dashboard__chart"
      >
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis domain={[0, 9]} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="kp"
              name="Kp observed"
              stroke="greenyellow"
              strokeWidth={2}
              dot={{}}
              legendType="circle"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Kp observed history</caption>
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Kp</th>
          </tr>
        </thead>
        <tbody>
          {chartData.map((d) => (
            <tr key={d.time_tag}>
              <td>{d.label}</td>
              <td>{d.kp}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div
        role="img"
        aria-label={`Kp forecast next 3 days: ${forecastChartData.map((d) => `${d.label} Kp${d.kp}`).join(", ")}`}
        className="kp-live-dashboard__chart"
      >
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={forecastChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis domain={[0, 9]} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="kp"
              name="Kp forecast"
              stroke="plum"
              strokeWidth={2}
              legendType="square"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <table>
        <caption>Kp forecast next 24h</caption>
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Kp</th>
            <th scope="col">NOAA Scale</th>
          </tr>
        </thead>
        <tbody>
          {forecastChartData.map((d, i) => {
            const src = forecastData.filter((p) => p.observed === "predicted")[
              i
            ];
            return (
              <tr key={d.time_tag}>
                <td>{d.label}</td>
                <td className={kpClass(d.kp)}>{d.kp}</td>
                <td>{src?.noaa_scale ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p>
        Daily geomagnetic indices history remains at{" "}
        <Link to="/forecasts/daily">Daily Data</Link>.
      </p>
    </article>
  );
};

export default KpLiveDashboard;

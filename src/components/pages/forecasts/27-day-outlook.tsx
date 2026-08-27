import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Symbols,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import "../Pages.scss";
import "../Tables.scss";
import "./27-day-outlook.scss";

import {
  parse27DayOutlook,
  TWENTY_SEVEN_DAY_OUTLOOK_URL,
} from "../../../products/27-day-outlook";
import { formatIssuedLocal } from "../../../products/product-header";
import { kpClass } from "../../../styles/kp-class";
import {
  MoonLine,
  MoonYAxis,
  enrichWithMoon,
  moonTooltipFormatter,
} from "../../../components/moon/moon-chart";
import GlossaryTerm from "../../explainers/GlossaryTerm";
import { SOURCES } from "../../../components/sources";
import { SourceAttribution } from "../../../components/sources";

const fetch27DayOutlook = async () => {
  const response = await fetch(TWENTY_SEVEN_DAY_OUTLOOK_URL);
  if (!response.ok) {
    throw new Error(`NOAA returned ${response.status}`);
  }
  return parse27DayOutlook(await response.text());
};

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

/** "2026 Aug 17" → UTC midnight time tag, so the daily points line up with
 *  the midnight emoji markers. The phase-change marker rule (enrichWithMoon)
 *  keeps the glyphs sparse on a full-cycle chart. */
const toMidnightTimeTag = (date: string): string => {
  const [yearStr, monStr, dayStr] = date.split(" ");
  const monthIdx = MONTHS_SHORT.indexOf(monStr);
  const d = new Date(Date.UTC(Number(yearStr), monthIdx, Number(dayStr), 0));
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
};

const TwentySevenDayOutlook: React.FC = () => {
  const { data, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: ["27-day-outlook"],
    queryFn: fetch27DayOutlook,
  });

  // Kp index trend + the moon illumination curve over a full lunar cycle;
  // radio flux and A index stay in the table below. Phase-aligned emoji
  // markers sit at the points nearest the true phase boundaries.
  const chartData = data
    ? enrichWithMoon(
        data.rows.map((r) => ({ ...r, time: toMidnightTimeTag(r.date) })),
        { phaseAligned: true },
      )
    : [];

  return (
    <div className="container twenty-seven-day-outlook">
      {isPending && (
        <p className="twenty-seven-day-outlook__status" aria-busy="true">
          Loading 27-day outlook…
        </p>
      )}
      {isError && !data && (
        <p className="twenty-seven-day-outlook__status">
          Couldn't load the 27-day outlook. Please check back later.
        </p>
      )}
      {isError && data && (
        <p className="twenty-seven-day-outlook__status">
          Couldn't refresh the 27-day outlook – showing the last data.
        </p>
      )}
      {data && (
        <>
          <h1>27-Day Outlook</h1>
          <p>
            <b>Issued (UTC):</b> {data.issued}
            <br />
            <b>Issued (local):</b> {formatIssuedLocal(data.issued)}
            <br />
            {data.author}
          </p>
          <p className="twenty-seven-day-outlook__explainers">
            Learn more:{" "}
            <GlossaryTerm termId="radio-flux">Radio flux</GlossaryTerm>
            {" · "}
            <GlossaryTerm termId="a-index">A index</GlossaryTerm>
            {" · "}
            <GlossaryTerm termId="kp-index">Kp index</GlossaryTerm>
            {" · "}
            <GlossaryTerm termId="27-day-outlook">27-day outlook</GlossaryTerm>
          </p>
          <article className="twenty-seven-day-outlook__panels">
            <div
              className="twenty-seven-day-outlook__chart"
              role="img"
              aria-label="Kp index trend for the next 27 days with Moon illumination (blue, right axis, percent)"
            >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" interval="preserveStartEnd" />
                  <YAxis domain={[0, 9]} />
                  <MoonYAxis />
                  <Tooltip formatter={moonTooltipFormatter} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="kpIndex"
                    className="twenty-seven-day-outlook__line--kp-index"
                    name="Kp Index"
                    strokeWidth={2}
                    stroke="greenyellow"
                    legendType="square"
                    dot={({ cx, cy, stroke }) => (
                      <Symbols
                        cx={cx}
                        cy={cy}
                        type="square"
                        size={64}
                        fill={stroke}
                      />
                    )}
                  />
                  <MoonLine />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <table className="twenty-seven-day-outlook__table">
              <caption>27-day Space Weather Outlook Table</caption>
              <thead>
                <tr>
                  <th scope="col">UTC Date</th>
                  <th scope="col">Radio Flux (10.7 cm)</th>
                  <th scope="col">Planetary A Index</th>
                  <th scope="col">Largest Kp Index</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.date} className="twenty-seven-day-outlook__row">
                    <td>{row.date}</td>
                    <td>{row.radioFlux}</td>
                    <td>{row.aIndex}</td>
                    <td className={kpClass(row.kpIndex)}>{row.kpIndex}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        </>
      )}
      <SourceAttribution source={SOURCES.noaaSwpc} />
    </div>
  );
};

export default TwentySevenDayOutlook;

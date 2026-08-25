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

import "../Pages.scss";
import "../Tables.scss";
import "./3-day-forecast.scss";

import {
  parseThreeDayForecast,
  THREE_DAY_FORECAST_URL,
  type ProbabilityRow,
  type ThreeDayForecast as ThreeDayForecastData,
} from "../../../products/3-day-forecast";
import { formatIssuedLocal } from "../../../products/product-header";
import { kpClass } from "../../../styles/kp-class";
import GlossaryTerm from "../../explainers/GlossaryTerm";

const fetchThreeDayForecast = async () => {
  const response = await fetch(THREE_DAY_FORECAST_URL);
  if (!response.ok) {
    throw new Error(`NOAA returned ${response.status}`);
  }
  return parseThreeDayForecast(await response.text());
};

// One chart point per 3-hour interval, the forecast days merged end to end
// into a single 24-point series.
const toChartPoint = (forecast: ThreeDayForecastData) =>
  forecast.days.flatMap((day, i) =>
    forecast.geomagneticActivity.kpBreakdown.map((row) => ({
      label: `${day} ${row.timeSlot}`,
      kp: row.days[i],
    })),
  );

const SectionArticle: React.FC<{
  title: string;
  details: string;
  rationale: string;
  children?: React.ReactNode;
}> = ({ title, details, rationale, children }) => (
  <article className="three-day-forecast__section">
    <h2>{title}</h2>
    <p className="three-day-forecast__details">{details}</p>
    {children}
    <p className="three-day-forecast__rationale">{rationale}</p>
  </article>
);

const ProbabilityTable: React.FC<{
  caption: string;
  days: string[];
  rows: ProbabilityRow[];
}> = ({ caption, days, rows }) => (
  <table className="three-day-forecast__table">
    <caption>{caption}</caption>
    <thead>
      <tr>
        <th scope="col">Storm scale</th>
        {days.map((day) => (
          <th scope="col" key={day}>
            {day}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row) => (
        <tr key={row.label}>
          <th scope="row">{row.label}</th>
          {row.days.map((percentage, i) => (
            <td key={days[i]}>{percentage}%</td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

const ThreeDayForecast: React.FC = () => {
  const { data, isPending, isError } = useQuery({
    queryKey: ["3-day-forecast"],
    queryFn: fetchThreeDayForecast,
  });

  return (
    <div className="container three-day-forecast">
      {isPending && (
        <p className="three-day-forecast__status" aria-busy="true">
          Loading 3-day forecast…
        </p>
      )}
      {isError && !data && (
        <p className="three-day-forecast__status">
          Couldn't load the 3-day forecast. Please check back later.
        </p>
      )}
      {isError && data && (
        <p className="three-day-forecast__status">
          Couldn't refresh the 3-day forecast – showing the last data.
        </p>
      )}
      {data && (
        <>
          <h1>3-Day Forecast</h1>
          <p>
            <b>Issued (UTC):</b> {data.issued}
            <br />
            <b>Issued (local):</b> {formatIssuedLocal(data.issued)}
            <br />
            {data.author}
          </p>
          <p className="three-day-forecast__explainers">
            Learn more:{" "}
            <GlossaryTerm termId="geomagnetic-activity">
              Geomagnetic activity
            </GlossaryTerm>
            {" · "}
            <GlossaryTerm termId="solar-radiation-storm">
              Solar radiation storm
            </GlossaryTerm>
            {" · "}
            <GlossaryTerm termId="radio-blackout">Radio blackout</GlossaryTerm>
            {" · "}
            <GlossaryTerm termId="kp-index">Kp index</GlossaryTerm>
            {" · "}
            <GlossaryTerm termId="rationale">Rationale</GlossaryTerm>
          </p>

          <SectionArticle
            title="Geomagnetic activity"
            details={data.geomagneticActivity.details}
            rationale={data.geomagneticActivity.rationale}
          >
            <div
              className="three-day-forecast__chart"
              role="img"
              aria-label={`Kp index forecast by 3-hour interval (${data.days.join(", ")})`}
            >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={toChartPoint(data)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" interval="preserveStartEnd" />
                  <YAxis domain={[0, 9]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="kp"
                    name="Kp"
                    strokeWidth={2}
                    stroke="greenyellow"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <table className="three-day-forecast__table">
              <caption>Kp index forecast for the next three days</caption>
              <thead>
                <tr>
                  <th scope="col">3-Hour Interval</th>
                  {data.days.map((day) => (
                    <th scope="col" key={day}>
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.geomagneticActivity.kpBreakdown.map((row) => (
                  <tr key={row.timeSlot}>
                    <th scope="row">{row.timeSlot}</th>
                    {row.days.map((kp, i) => (
                      <td key={data.days[i]} className={kpClass(kp)}>
                        {kp}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionArticle>

          <SectionArticle
            title="Solar radiation storm"
            details={data.solarRadiationStorm.details}
            rationale={data.solarRadiationStorm.rationale}
          >
            <ProbabilityTable
              caption="Solar radiation storm probabilities"
              days={data.days}
              rows={data.solarRadiationStorm.probabilities}
            />
          </SectionArticle>

          <SectionArticle
            title="Radio blackout"
            details={data.radioBlackout.details}
            rationale={data.radioBlackout.rationale}
          >
            <ProbabilityTable
              caption="Radio blackout probabilities"
              days={data.days}
              rows={data.radioBlackout.probabilities}
            />
          </SectionArticle>
        </>
      )}
    </div>
  );
};

export default ThreeDayForecast;

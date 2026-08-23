import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
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
import { kpClass } from "../../../styles/kp-class";

const fetch27DayOutlook = async () => {
  const response = await fetch(TWENTY_SEVEN_DAY_OUTLOOK_URL);
  if (!response.ok) {
    throw new Error(`NOAA returned ${response.status}`);
  }
  return parse27DayOutlook(await response.text());
};

const TwentySevenDayOutlook: React.FC = () => {
  const { data, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: ["27-day-outlook"],
    queryFn: fetch27DayOutlook,
  });

  return (
    <div className="container twenty-seven-day-outlook">
      {isPending && (
        <p className="twenty-seven-day-outlook__status" aria-busy="true">
          Loading 27-day outlook…
        </p>
      )}
      {isError && !data && (
        <div className="twenty-seven-day-outlook__status">
          <p>Couldn't load the 27-day outlook. Please try again.</p>
          <button
            type="button"
            className="twenty-seven-day-outlook__retry"
            onClick={() => refetch()}
          >
            Try again
          </button>
        </div>
      )}
      {isError && data && (
        <div className="twenty-seven-day-outlook__status">
          <p>Couldn't refresh the 27-day outlook — showing the last data. Please try again.</p>
          <button
            type="button"
            className="twenty-seven-day-outlook__retry"
            onClick={() => refetch()}
          >
            Try again
          </button>
        </div>
      )}
      {data && (
        <>
          <h1>27-Day Outlook</h1>
          <p>
            <b>As of:</b> {data.issued}{" "}
            <button
              type="button"
              className="twenty-seven-day-outlook__refresh"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? "Refreshing…" : "Refresh"}
            </button>
          </p>
          <article className="twenty-seven-day-outlook__panels">
            <div
              className="twenty-seven-day-outlook__chart"
              role="img"
              aria-label="Radio flux and A index trend for the next 27 days"
            >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.rows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" interval="preserveStartEnd" />
                  <YAxis />
                  <YAxis yAxisId="aIndex" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="radioFlux"
                    className="twenty-seven-day-outlook__line--radio-flux"
                    name="Radio Flux"
                  />
                  <Line
                    type="monotone"
                    dataKey="aIndex"
                    yAxisId="aIndex"
                    className="twenty-seven-day-outlook__line--a-index"
                    name="A Index"
                  />
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
    </div>
  );
};

export default TwentySevenDayOutlook;
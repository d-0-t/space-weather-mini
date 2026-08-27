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
import "./daily-geomagnetic-indices.scss";

import {
  DAILY_GEOMAGNETIC_INDICES_URL,
  largestK,
  parseDailyGeomagneticIndices,
  type DailyIndicesRow,
} from "../../../products/daily-geomagnetic-indices";
import { formatIssuedLocal } from "../../../products/product-header";
import { kpClass } from "../../../styles/kp-class";
import GlossaryTerm from "../../explainers/GlossaryTerm";
import { SOURCES } from "../../../components/sources";
import { SourceAttribution } from "../../../components/sources";

const fetchDailyGeomagneticIndices = async () => {
  const response = await fetch(DAILY_GEOMAGNETIC_INDICES_URL);
  if (!response.ok) {
    throw new Error(`NOAA returned ${response.status}`);
  }
  return parseDailyGeomagneticIndices(await response.text());
};

const toChartPoint = (row: DailyIndicesRow) => ({
  date: row.date.slice(5),
  fredericksburg: largestK(row.fredericksburg),
  college: largestK(row.college),
  planetary: largestK(row.planetary),
});

const StationColumns: React.FC<{
  station: "fredericksburg" | "college" | "planetary";
  row: DailyIndicesRow;
  toFixed?: number;
}> = ({ station, row, toFixed }) => (
  <>
    <td>{row[station].aIndex}</td>
    {row[station].kIndices.map((k, i) => (
      <td key={i} className={kpClass(k)}>
        {toFixed !== undefined ? Number(k).toFixed(toFixed) : k}
      </td>
    ))}
  </>
);

const DailyGeomagneticIndices: React.FC = () => {
  const { data, isPending, isError } = useQuery({
    queryKey: ["daily-geomagnetic-indices"],
    queryFn: fetchDailyGeomagneticIndices,
  });

  return (
    <div className="container daily-geomagnetic-indices">
      {isPending && (
        <p className="daily-geomagnetic-indices__status" aria-busy="true">
          Loading daily geomagnetic indices…
        </p>
      )}
      {isError && !data && (
        <p className="daily-geomagnetic-indices__status">
          Couldn't load the daily geomagnetic indices. Please check back later.
        </p>
      )}
      {isError && data && (
        <p className="daily-geomagnetic-indices__status">
          Couldn't refresh the daily geomagnetic indices – showing the last
          data.
        </p>
      )}
      {data && (
        <>
          <h1>Daily Geomagnetic Indices</h1>
          <p>
            <b>Issued (UTC):</b> {data.issued}
            <br />
            <b>Issued (local):</b> {formatIssuedLocal(data.issued)}
            <br />
            {data.author}
          </p>
          <p className="daily-geomagnetic-indices__explainers">
            Learn more: <GlossaryTerm termId="kp-index">Kp index</GlossaryTerm>
            {" · "}
            <GlossaryTerm termId="a-index">A index</GlossaryTerm>
            {" · "}
            <GlossaryTerm termId="geomagnetic-activity">
              Geomagnetic activity
            </GlossaryTerm>
            {" · "}
            <GlossaryTerm termId="daily-geomagnetic-indices">
              Daily geomagnetic indices
            </GlossaryTerm>
          </p>
          <article className="daily-geomagnetic-indices__panels">
            <div
              className="daily-geomagnetic-indices__chart"
              role="img"
              aria-label="Largest daily Kp index per station (Fredericksburg, College, estimated planetary) for the last 30 days"
            >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.rows.map(toChartPoint)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" interval="preserveStartEnd" />
                  <YAxis domain={[0, 9]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="fredericksburg"
                    name="Fredericksburg"
                    strokeWidth={2}
                    stroke="greenyellow"
                    legendType="circle"
                  />
                  <Line
                    type="monotone"
                    dataKey="college"
                    name="College"
                    strokeWidth={2}
                    stroke="plum"
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
                  <Line
                    type="monotone"
                    dataKey="planetary"
                    name="Planetary"
                    strokeWidth={2}
                    stroke="cyan"
                    legendType="triangle"
                    dot={({ cx, cy, stroke }) => (
                      <Symbols
                        cx={cx}
                        cy={cy}
                        type="triangle"
                        size={64}
                        fill={stroke}
                      />
                    )}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <table className="daily-geomagnetic-indices__table">
              <caption>
                Last 30 days of daily geomagnetic indices per station
              </caption>
              <thead>
                <tr>
                  <th scope="col" rowSpan={2}>
                    UTC Date
                  </th>
                  <th scope="colgroup" colSpan={9}>
                    Fredericksburg (middle latitude)
                  </th>
                  <th scope="colgroup" colSpan={9}>
                    College (high latitude)
                  </th>
                  <th scope="colgroup" colSpan={9}>
                    Estimated planetary
                  </th>
                </tr>
                <tr>
                  <th scope="col">A</th>
                  <th scope="col" colSpan={8}>
                    K-indices
                  </th>
                  <th scope="col">A</th>
                  <th scope="col" colSpan={8}>
                    K-indices
                  </th>
                  <th scope="col">A</th>
                  <th scope="col" colSpan={8}>
                    K-indices
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.date} className="daily-geomagnetic-indices__row">
                    <td>{row.date}</td>
                    <StationColumns station="fredericksburg" row={row} />
                    <StationColumns station="college" row={row} />
                    <StationColumns station="planetary" row={row} toFixed={0} />
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

export default DailyGeomagneticIndices;

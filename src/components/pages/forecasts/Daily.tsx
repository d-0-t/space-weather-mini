import { useCallback, useEffect, useState } from "react";

import "../Pages.css";
import "../Tables.css";
import Parser from "../../parser/TxtParser";
import EstimatedPlanetKGraph from "../../visualtabs/EstPlanetK-Graph";
const parser = new Parser();

const DailyReport: React.FC = () => {
  const [data, setData] = useState<any>();

  const loadData = useCallback(() => {
    fetch("https://services.swpc.noaa.gov/text/daily-geomagnetic-indices.txt")
      .then((r) => r.text())
      .then((text) => {
        let daily: any = text.replace(/\n/g, "<br/>");
        daily = parser.DailyParser(daily);
        let issueDate: any = new Date(daily[0][1]);
        issueDate = issueDate.toString();
        setData({
          data: daily,
          info: {
            title: daily[0][0],
            date: daily[0][1],
            dateLocal: issueDate,
            author: daily[0][2],
          },
          table: daily[1],
        });
      });

    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    //console.log("loading data...");
    loadData();
  }, [loadData]);

  return (
    <div className="container">
      {data && (
        <div id="daily-discussion">
          <h2>{data.info.title}</h2>
          <p>
            <b>Issued (UTC):</b> {data.info.date}
            <br />
            <b>Issued (local):</b> {data.info.dateLocal}
            <br />
            {data.info.author}
          </p>

          <article>
            <h3>Last 30 Days - Geomagnetic Data</h3>
            <div dangerouslySetInnerHTML={{ __html: data.table }} />
          </article>

          <EstimatedPlanetKGraph />
        </div>
      )}
    </div>
  );
};

export default DailyReport;

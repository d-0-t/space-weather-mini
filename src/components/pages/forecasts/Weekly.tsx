import { useCallback, useEffect, useState } from "react";

import "../Pages.css";
import Parser from "../../parser/TxtParser";
const parser = new Parser();

const WeeklyReport: React.FC = () => {
  const [data, setData] = useState<any>();

  const loadData = useCallback(() => {
    fetch("https://services.swpc.noaa.gov/text/weekly.txt")
      .then((r) => r.text())
      .then((text) => {
        let weekly = text.replace(/\n/g, "<br/>");
        let weeklyData = parser.WeeklyParser(weekly);
        let issueDate: any = new Date(weeklyData[1]);
        issueDate = issueDate.toString();

        //console.log(weeklyData);

        setData({
          data: weekly,
          weeklyReport: {
            title: weeklyData[0],
            date: weeklyData[1],
            dateLocal: issueDate,
            author: weeklyData[2],
            info: {
              highlights: {
                title: weeklyData[3][0][0],
                fromTo: weeklyData[3][0][1],
                description: weeklyData[3][0][2],
              },
              forecast: {
                title: weeklyData[3][1][0],
                fromTo: weeklyData[3][1][1],
                description: weeklyData[3][1][2],
              },
            },
          },
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
        <>
          <h2>{data.weeklyReport.title}</h2>
          <p>
            <b>Issued (UTC):</b> {data.weeklyReport.date}
            <br />
            <b>Issued (local):</b> {data.weeklyReport.dateLocal}
            <br />
            {data.weeklyReport.author}
          </p>
          <div id="weekly-discussion">
            <article>
              <h3>{data.weeklyReport.info.forecast.title}</h3>
              <b>{data.weeklyReport.info.forecast.fromTo}</b>
              <br />
              <div
                dangerouslySetInnerHTML={{
                  __html: data.weeklyReport.info.forecast.description,
                }}
              />
            </article>

            <article>
              <h3>{data.weeklyReport.info.highlights.title}</h3>
              <b>{data.weeklyReport.info.highlights.fromTo}</b>
              <br />
              <div
                dangerouslySetInnerHTML={{
                  __html: data.weeklyReport.info.highlights.description,
                }}
              />
            </article>
          </div>
        </>
      )}
    </div>
  );
};

export default WeeklyReport;

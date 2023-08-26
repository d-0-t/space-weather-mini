import { useCallback, useEffect, useState } from "react";

import "../Pages.css";
import "../Tables.css";

import Parser from "../../parser/TxtParser";
const parser = new Parser();

const ThreeDaysReport: React.FC = () => {
  const [data, setData] = useState<any>();

  const loadData = useCallback(() => {
    fetch("https://services.swpc.noaa.gov/text/3-day-forecast.txt")
      .then((r) => r.text())
      .then(async (text) => {
        let data3days: any = text.replace(/\n/g, "<br/>");
        data3days = parser.ThreeDays(data3days);

        let issueDate: any = new Date(data3days[0][1]);
        issueDate = issueDate.toString();
        console.log(data, data3days);

        setData({
          data: data3days,
          info: {
            title: data3days[0][0],
            date: data3days[0][1],
            dateLocal: issueDate,
            author: data3days[0][2],
          },
          descriptions: {
            geomagnetism: {
              title: data3days[0][3][0],
              details: data3days[0][3][1],
              regionale: data3days[0][3][2],
            },
            solarRadiation: {
              title: data3days[0][4][0],
              details: data3days[0][4][1],
              regionale: data3days[0][4][2],
            },
            radioBlackouts: {
              title: data3days[0][5][0],
              details: data3days[0][5][1],
              regionale: data3days[0][5][2],
            },
          },
          tables: {
            table_kp: data3days[1],
            table_srs: data3days[2],
            table_radio: data3days[3],
          },
        });
      });
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    //console.log("loading data...");
    loadData();
  }, [loadData]);

  // useEffect(() => {
  //   //console.log("data was updated...");
  //   if (data && descriptions && info && tables) setLoaded(true);
  // }, [data, descriptions, info, tables]);
  // if (!loaded) {
  //   return <div />;
  // }

  return (
    <div className="container">
      {data && (
        <div id="3-days">
          <h2>{data.info.title}</h2>
          <p>
            <b>Issued (UTC):</b> {data.info.date}
            <br />
            <b>Issued (local):</b> {data.info.dateLocal}
            <br />
            {data.info.author}
          </p>

          <article>
            <h3>{data.descriptions.geomagnetism.title}</h3>
            <div
              dangerouslySetInnerHTML={{
                __html: data.descriptions.geomagnetism.details,
              }}
            />
            <div
              className="marginedTable"
              dangerouslySetInnerHTML={{ __html: data.tables.table_kp }}
            />
            <div
              dangerouslySetInnerHTML={{
                __html: data.descriptions.geomagnetism.regionale,
              }}
            />
          </article>

          <article>
            <h3>{data.descriptions.solarRadiation.title}</h3>
            <div
              dangerouslySetInnerHTML={{
                __html: data.descriptions.solarRadiation.details,
              }}
            />
            <div
              className="marginedTable"
              dangerouslySetInnerHTML={{ __html: data.tables.table_srs }}
            />
            <div
              dangerouslySetInnerHTML={{
                __html: data.descriptions.solarRadiation.regionale,
              }}
            />
          </article>

          <article>
            <h3>{data.descriptions.radioBlackouts.title}</h3>
            <div
              dangerouslySetInnerHTML={{
                __html: data.descriptions.radioBlackouts.details,
              }}
            />
            <div
              className="marginedTable"
              dangerouslySetInnerHTML={{
                __html: data.tables.table_radio,
              }}
            />
            <div
              dangerouslySetInnerHTML={{
                __html: data.descriptions.radioBlackouts.regionale,
              }}
            />
          </article>
        </div>
      )}
    </div>
  );
};

export default ThreeDaysReport;

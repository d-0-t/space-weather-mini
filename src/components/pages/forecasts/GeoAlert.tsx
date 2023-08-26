import { useCallback, useEffect, useState } from "react";

import "../Pages.css";
import Parser from "../../parser/TxtParser";
const parser = new Parser();

const GeoAlert: React.FC = () => {
  const [data, setData] = useState<any>();

  const loadData = useCallback(() => {
    fetch("https://services.swpc.noaa.gov/text/wwv.txt")
      .then((r) => r.text())
      .then((text) => {
        let geoAlert = text.replace(/\n/g, "<br/>");
        let parsedGeoAlertArr = parser.GeoAlertParser(geoAlert);
        let issueDate: any = new Date(parsedGeoAlertArr[1]);
        issueDate = issueDate.toString();
        setData({
          data: geoAlert,
          geoAlertMsg: {
            title: parsedGeoAlertArr[0],
            date: parsedGeoAlertArr[1],
            dateLocal: issueDate,
            author: parsedGeoAlertArr[2],
            info: {
              details: parsedGeoAlertArr[3][0],
              observed: parsedGeoAlertArr[3][1],
              predicted: parsedGeoAlertArr[3][2],
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
        <div id="geo-alert">
          <h2>Geophysical Observations and Predictions</h2>
          <p>
            <b>Issued (UTC):</b> {data.geoAlertMsg.date}
            <br />
            <b>Issued (local):</b> {data.geoAlertMsg.dateLocal}
            <br />
            {data.geoAlertMsg.author}
          </p>

          <article>
            <h3>Predictions</h3>
            <p>{data.geoAlertMsg.info.predicted}</p>
            <h3>Observations</h3>
            <p>{data.geoAlertMsg.info.observed}</p>
            <h3>Geophysical Alert Message</h3>
            <div
              dangerouslySetInnerHTML={{
                __html: data.geoAlertMsg.info.details,
              }}
            />
          </article>
        </div>
      )}
    </div>
  );
};

export default GeoAlert;

import { useCallback, useEffect, useState } from "react";

import "../Pages.css";
import "../Tables.css";

import Parser from "../../parser/TxtParser";
const parser = new Parser();

const TwentySevenDays: React.FC = () => {
  const [data, setData] = useState<any>();

  const loadData = useCallback(() => {
    fetch("https://services.swpc.noaa.gov/text/27-day-outlook.txt")
      .then((r) => r.text())
      .then((text) => {
        let data27 = text.replace(/\n/g, "<br/>");
        let info27 = parser.TwentySevenDays(data27)[0];
        let issueDate: any = new Date(info27[1]);
        issueDate = issueDate.toString();
        //console.log(info27);
        let htmlTable27 = parser.TwentySevenDays(data27)[1];
        setData({
          data: data27,
          table: htmlTable27,
          info: {
            title: info27[0],
            date: info27[1],
            dateLocal: issueDate,
            author: info27[2],
          },
        });
      });

    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    //console.log("loading data...");
    loadData();
  }, [loadData]);

  // if (!data) {
  //   return <div />;
  // }

  return (
    <div className="container">
      {data && (
        <div id="27-days">
          <h2>{data.info.title}</h2>
          <p>
            <b>Issued (UTC):</b> {data.info.date}
            <br />
            <b>Issued (local):</b> {data.info.dateLocal}
            <br />
            {data.info.author}
          </p>

          <article>
            <h3>Table</h3>
            <div dangerouslySetInnerHTML={{ __html: data.table }} />
          </article>
        </div>
      )}
    </div>
  );
};

export default TwentySevenDays;

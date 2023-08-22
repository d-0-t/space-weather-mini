import { useEffect, useState } from "react";

import "./Pages.css";
import "./Tables.css";
import Parser from "../parser/JsonParser";

const parser = new Parser();

interface TestProps {
  // Add any props if needed
}

const Test: React.FC<TestProps> = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    //let PredData1h;
    fetch(
      "https://services.swpc.noaa.gov/json/geospace/geospace_pred_est_kp_1_hour.json",
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    )
      .then((response) => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error("Something went wrong");
        }
      })
      .then((jsonData) => {
        //let PredTable1h = parser.Prediction1h(jsonData);
        //console.log(PredTable1h);
        setData(jsonData); // Update the state with the received JSON data
      })
      .catch((error) => {
        return Promise.reject();
      });
  };

  if (!data) {
    return <div />;
  }

  return (
    <div className="container">
      <div id="test">
        <h1>This is a test</h1>
        <article>ASd</article>
      </div>
    </div>
  );
};

export default Test;

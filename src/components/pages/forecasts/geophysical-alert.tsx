import { useQuery } from "@tanstack/react-query";

import "../Pages.scss";
import "./geophysical-alert.scss";

import {
  GEOPHYSICAL_ALERT_URL,
  parseGeophysicalAlert,
} from "../../../products/geophysical-alert";
import { formatIssuedLocal } from "../../../products/product-header";
import GlossaryTerm from "../../explainers/GlossaryTerm";

const fetchGeophysicalAlert = async () => {
  const response = await fetch(GEOPHYSICAL_ALERT_URL);
  if (!response.ok) {
    throw new Error(`NOAA returned ${response.status}`);
  }
  return parseGeophysicalAlert(await response.text());
};

const GeophysicalAlert: React.FC = () => {
  const { data, isPending, isError } = useQuery({
    queryKey: ["geophysical-alert"],
    queryFn: fetchGeophysicalAlert,
  });

  return (
    <div className="container geophysical-alert" id="geo-alert">
      {isPending && (
        <p className="geophysical-alert__status" aria-busy="true">
          Loading geophysical alert…
        </p>
      )}
      {isError && !data && (
        <p className="geophysical-alert__status">
          Couldn&apos;t load the geophysical alert. Please check back later.
        </p>
      )}
      {isError && data && (
        <p className="geophysical-alert__status">
          Couldn&apos;t refresh the geophysical alert – showing the last data.
        </p>
      )}
      {data && (
        <>
          <h1>Geophysical Observations and Predictions</h1>
          <p>
            <b>Issued (UTC):</b> {data.issued}
            <br />
            <b>Issued (local):</b> {formatIssuedLocal(data.issued)}
            <br />
            {data.author}
          </p>
          <p className="geophysical-alert__explainers">
            Learn more:{" "}
            <GlossaryTerm termId="geophysical-alert">
              Geophysical alert
            </GlossaryTerm>
            {" · "}
            <GlossaryTerm termId="kp-index">Kp index</GlossaryTerm>
            {" · "}
            <GlossaryTerm termId="aurora-forecast">
              Aurora forecast
            </GlossaryTerm>
          </p>

          <article className="geophysical-alert__section">
            <h2>Geophysical Alert Message</h2>
            <p className="geophysical-alert__prose">{data.message}</p>
          </article>
          <article className="geophysical-alert__section">
            <h2>Observations</h2>
            <p className="geophysical-alert__prose">{data.observed}</p>
          </article>
          <article className="geophysical-alert__section">
            <h2>Predictions</h2>
            <p className="geophysical-alert__prose">{data.predicted}</p>
          </article>
        </>
      )}
    </div>
  );
};

export default GeophysicalAlert;

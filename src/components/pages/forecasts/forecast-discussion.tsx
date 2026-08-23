import { useQuery } from "@tanstack/react-query";

import "../Pages.scss";
import "./forecast-discussion.scss";

import {
  FORECAST_DISCUSSION_URL,
  parseForecastDiscussion,
  type DiscussionSection,
} from "../../../products/forecast-discussion";
import { formatIssuedLocal } from "../../../products/product-header";

const fetchForecastDiscussion = async () => {
  const response = await fetch(FORECAST_DISCUSSION_URL);
  if (!response.ok) {
    throw new Error(`NOAA returned ${response.status}`);
  }
  return parseForecastDiscussion(await response.text());
};

const SectionArticle: React.FC<{
  title: string;
  section: DiscussionSection;
}> = ({ title, section }) => (
  <article className="forecast-discussion__section">
    <h2>{title}</h2>
    <h3>Forecast</h3>
    <p className="forecast-discussion__prose">{section.forecast}</p>
    <h3>Day Summary</h3>
    <p className="forecast-discussion__prose">{section.daySummary}</p>
  </article>
);

const ForecastDiscussion: React.FC = () => {
  const { data, isPending, isError } = useQuery({
    queryKey: ["forecast-discussion"],
    queryFn: fetchForecastDiscussion,
  });

  return (
    <div className="container forecast-discussion">
      {isPending && (
        <p className="forecast-discussion__status" aria-busy="true">
          Loading forecast discussion…
        </p>
      )}
      {isError && !data && (
        <p className="forecast-discussion__status">
          Couldn't load the forecast discussion. Please check back later.
        </p>
      )}
      {isError && data && (
        <p className="forecast-discussion__status">
          Couldn't refresh the forecast discussion — showing the last data.
        </p>
      )}
      {data && (
        <>
          <h1>Forecast Discussion</h1>
          <p>
            <b>Issued (UTC):</b> {data.issued}
            <br />
            <b>Issued (local):</b> {formatIssuedLocal(data.issued)}
            <br />
            {data.author}
          </p>
          <SectionArticle title="Solar Activity" section={data.solarActivity} />
          <SectionArticle
            title="Energetic Particle"
            section={data.energeticParticle}
          />
          <SectionArticle title="Solar Wind" section={data.solarWind} />
          <SectionArticle title="Geospace" section={data.geospace} />
        </>
      )}
    </div>
  );
};

export default ForecastDiscussion;

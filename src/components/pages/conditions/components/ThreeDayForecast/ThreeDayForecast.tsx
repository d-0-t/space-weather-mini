import "./ThreeDayForecast.scss";
import CollapsiblePanel from "../../../../CollapsiblePanel/CollapsiblePanel";
import type { GeocodedPlace } from "../../../../../data/place-storage";
import WeatherDaily from "../Weather/WeatherDaily";
import { useWeather } from "../Weather/useWeather";

/**
 * Three-day weather forecast (dashboard-layout ticket 03): the daily Open-Meteo
 * table as its own Local conditions section, collapsible and anchorable
 * independently of Weather. It shares Weather's Open-Meteo query via the
 * same query key, so TanStack Query dedupes to one fetch per place. No
 * fetched-at line, Refresh control or attribution here: Weather owns those,
 * so nothing duplicates. Like Weather it reports its own load state: a
 * stale-data notice while showing saved data behind a failed refetch, a
 * busy line while loading, and a plain retryable error with no data.
 */
const ThreeDayForecast: React.FC<{ place: GeocodedPlace }> = ({ place }) => {
  const { data, isPending, isError } = useWeather(place);
  return (
    <section className="conditions__threeday">
      <CollapsiblePanel
        heading={<h2>Three-day weather forecast</h2>}
        bodyId="conditions-3day-body"
      >
        {data ? (
          <>
            {isError ? (
              <p className="three-day-forecast__status" role="status">
                Couldn&apos;t refresh the Three-day weather forecast – showing
                the last data.
              </p>
            ) : null}
            <WeatherDaily data={data} place={place} />
          </>
        ) : isPending ? (
          <p className="three-day-forecast__status" aria-busy="true">
            Loading Three-day weather forecast…
          </p>
        ) : (
          <p className="three-day-forecast__status">
            Couldn&apos;t load the Three-day weather forecast – check back
            later.
          </p>
        )}
      </CollapsiblePanel>
    </section>
  );
};

export default ThreeDayForecast;

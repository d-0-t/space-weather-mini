import "./WeatherBlock.scss";
import RefreshIcon from "@mui/icons-material/Refresh";
import CollapsiblePanel from "../../../../CollapsiblePanel/CollapsiblePanel";
import { useDisplayTimezone } from "../../../../DisplayTimezone/DisplayTimezoneContext";
import type { GeocodedPlace } from "../../../../../data/place-storage";
import { formatClock } from "../../../../../products/display-time";
import WeatherCurrent from "./WeatherCurrent";
import WeatherHourly from "./WeatherHourly";
import { useWeather } from "./useWeather";

/**
 * Weather for the geocoded place: current conditions and a 24 hour
 * horizontally scrolling hourly strip from one Open-Meteo fetch, refreshed
 * only on the always-enabled Refresh tap – no polling and no refetch on
 * focus (ADR 0003 exception, ADR 0005). The daily Open-Meteo table lives in
 * its own Three-day weather forecast section (dashboard-layout ticket 03)
 * sharing this query via the same key, so one fetch serves both. The last fetched payload is persisted, so
 * an offline reload hydrates the saved weather with its true fetch instant
 * while the (re)fetch decides between a fresh copy and the honest
 * "Couldn't refresh" line. Failure swaps only this block to a plain
 * retryable error; the place and daylight stay visible.
 */
const WeatherBlock: React.FC<{ place: GeocodedPlace }> = ({ place }) => {
  const { displayTimezone } = useDisplayTimezone();
  const query = useWeather(place);
  const { data, isPending, isError, refetch } = query;
  const refreshButton = (
    <button
      type="button"
      className="btn--secondary"
      title="Refresh"
      onClick={() => void refetch()}
    >
      <RefreshIcon fontSize="small" aria-hidden="true" />
      <span className="btn__label">Refresh</span>
    </button>
  );
  return (
    <section className="conditions__weather">
      <CollapsiblePanel
        heading={<h2>Weather</h2>}
        bodyId="conditions-weather-body"
        adornment={refreshButton}
      >
        {data ? (
          <>
            {isError ? (
              <p className="weather-block__status" role="status">
                Couldn't refresh the weather – showing the last data.
              </p>
            ) : null}
            <WeatherCurrent data={data} />
            <p className="weather-block__fetched">
              Updated at{" "}
              {formatClock(new Date(data.fetchedAt), displayTimezone)}, near{" "}
              {place.shortName}.
            </p>
            <WeatherHourly data={data} />

            <p className="weather-block__attribution">
              Source:{" "}
              <a
                href="https://open-meteo.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open-Meteo
              </a>{" "}
            </p>
          </>
        ) : isPending ? (
          <p className="weather-block__status" aria-busy="true">
            Loading weather…
          </p>
        ) : (
          <p className="weather-block__status">
            Couldn't load the weather – check back later.
          </p>
        )}
      </CollapsiblePanel>
    </section>
  );
};

export default WeatherBlock;

import "./conditions.scss";
import { useEffect, useId, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AcUnitIcon from "@mui/icons-material/AcUnit";
import CloudIcon from "@mui/icons-material/Cloud";
import CloudQueueIcon from "@mui/icons-material/CloudQueue";
import FoggyIcon from "@mui/icons-material/Foggy";
import GrainIcon from "@mui/icons-material/Grain";
import HelpIcon from "@mui/icons-material/Help";
import RefreshIcon from "@mui/icons-material/Refresh";
import SevereColdIcon from "@mui/icons-material/SevereCold";
import ThunderstormIcon from "@mui/icons-material/Thunderstorm";
import UmbrellaIcon from "@mui/icons-material/Umbrella";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import type { SvgIconComponent } from "@mui/icons-material";
import {
  PLACE_STORAGE_KEY,
  loadGeocodedPlace,
  saveGeocodedPlace,
  type GeocodedPlace,
} from "../../../data/place-storage";
import { daylightTimes, type DaylightDay } from "../../../data/sun";
import {
  createGeocodingClient,
  getDeviceLocation,
  type GeocodeMatch,
} from "../../../data/geocoding";
import { fetchWeather, type WeatherData } from "../../../data/weather";
import { wmoWeather } from "../../../data/wmo-codes";

const OSM_COPYRIGHT_URL = "https://www.openstreetmap.org/copyright";

const formatTime = (date: Date): string =>
  new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

/** Celsius with one decimal, e.g. "10.6°C" – the v1 unit everywhere. */
const formatCelsius = (value: number): string => `${value.toFixed(1)}°C`;

/** Total cloud with the low/mid/high split, e.g. "Cloud 100% · low 5% / mid 94% / high 100%". */
const cloudSplitText = (
  totalPercent: number,
  lowPercent: number,
  midPercent: number,
  highPercent: number,
): string =>
  `Cloud ${totalPercent}% · low ${lowPercent}% / mid ${midPercent}% / high ${highPercent}%`;

/** Visible label for the end of the day – midnight at the day's close. */
const DAY_END_LABEL = "24:00";

/**
 * Luminosity levels of the day sections, darkest to brightest: the sun at
 * −18° (Night) through the three twilight bands up to sun up (Day).
 */
const LUMINOSITY_LEVELS = [
  "Night",
  "Astronomical twilight",
  "Nautical twilight",
  "Civil twilight",
  "Day",
] as const;

interface TimelineBand {
  /** 0 = darkest (Night) … 4 = brightest (Day). */
  level: number;
  /** Duration in minutes; the band's width/height ratio on the timeline. */
  minutes: number;
  startTime: Date;
  /** null on the last band, which runs to the day end (24:00). */
  endTime: Date | null;
}

/**
 * The day as a chain of luminosity bands from 00:00 to 24:00. Each suncalc
 * boundary starts a band of its light level; from midnight to the first
 * boundary the sun sits one level below it, and the last band runs to
 * 24:00. Midnight sun collapses to one bright Day band, deep polar night
 * to one Night band.
 */
const buildTimeline = (day: DaylightDay): TimelineBand[] => {
  const dayStart = day.date;
  const dayEnd = new Date(day.date.getTime() + 86_400_000);
  const boundaries = (
    [
      { time: day.astronomicalDawn, level: 1 },
      { time: day.nauticalDawn, level: 2 },
      { time: day.civilDawn, level: 3 },
      { time: day.sunrise, level: 4 },
      { time: day.sunset, level: 3 },
      { time: day.civilDusk, level: 2 },
      { time: day.nauticalDusk, level: 1 },
      { time: day.astronomicalDusk, level: 0 },
    ] as Array<{ time: Date | null; level: number }>
  ).filter(
    // Events of the day all sit inside its 00:00–24:00 window; events that
    // land outside it (extreme timezone offsets) are clipped, so a band
    // never wraps past midnight.
    (boundary): boundary is { time: Date; level: number } =>
      boundary.time !== null &&
      boundary.time.getTime() >= dayStart.getTime() &&
      boundary.time.getTime() < dayEnd.getTime(),
  );

  if (boundaries.length === 0) {
    const level = day.polar === "midnight-sun" ? 4 : 0;
    return [{ level, minutes: 1440, startTime: dayStart, endTime: null }];
  }

  const bands: TimelineBand[] = [];
  const first = boundaries[0];
  if (first.time.getTime() > dayStart.getTime()) {
    bands.push({
      level: Math.max(0, first.level - 1),
      minutes: (first.time.getTime() - dayStart.getTime()) / 60_000,
      startTime: dayStart,
      endTime: first.time,
    });
  }
  for (let i = 0; i < boundaries.length; i++) {
    const start = boundaries[i];
    const next = boundaries[i + 1];
    bands.push({
      level: start.level,
      minutes:
        ((next?.time ?? dayEnd).getTime() - start.time.getTime()) / 60_000,
      startTime: start.time,
      endTime: next?.time ?? null,
    });
  }
  return bands.filter((band) => band.minutes > 0);
};

/**
 * The luminosity timeline: one band per day section, sized by duration
 * ratio, dark to bright left to right on wide screens and top to bottom on
 * narrow ones. Each band shows its start time at the break and its name;
 * the last band closes at 24:00.
 */
const LuminosityTimeline: React.FC<{ day: DaylightDay }> = ({ day }) => {
  const bands = buildTimeline(day);
  const last = bands.length - 1;
  return (
    <ul className="conditions__timeline">
      {bands.map((band, index) => (
        <li
          key={index}
          className={`conditions__band conditions__band--l${band.level}`}
          style={{ flexGrow: band.minutes }}
        >
          <span className="conditions__band-time">
            {formatTime(band.startTime)}
          </span>
          <span className="conditions__band-name">
            {LUMINOSITY_LEVELS[band.level]}
          </span>
          <span className="sr-only">
            to{" "}
            {band.endTime !== null ? formatTime(band.endTime) : DAY_END_LABEL}
          </span>
          {index === last ? (
            <span className="conditions__band-time conditions__band-time--end">
              {DAY_END_LABEL}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
};

const POLAR_COPY: Record<NonNullable<DaylightDay["polar"]>, string> = {
  "midnight-sun": "Sun does not set today",
  "polar-night": "Sun does not rise today",
};

interface DayBlockProps {
  heading: string;
  day: DaylightDay;
}

const DayBlock: React.FC<DayBlockProps> = ({ heading, day }) => (
  <section className="conditions__day">
    <h2>{heading}</h2>
    {day.polar !== null ? (
      <p className="conditions__polar-note">{POLAR_COPY[day.polar]}</p>
    ) : null}
    <LuminosityTimeline day={day} />
  </section>
);

/** The honest search error copies – empty, busy, and plain failure. */
const SEARCH_ERROR_COPY: Record<"no-match" | "busy" | "failed", string> = {
  "no-match": "No match – try adding a country",
  busy: "Search is busy – wait a second",
  failed: "Search failed – try again",
};

/** The single honest copy for any device location failure (ticket 02). */
const LOCATION_ERROR_COPY =
  "Could not get your device location – type a place like 'Tromsø, Norway'";

/**
 * The find-a-place block: a freeform Nominatim search that runs only on
 * Enter or the Search tap (never per keystroke), a radio pick list of up to
 * five matches, the required ODbL attribution, and a single-shot browser
 * geolocation button that reverse geocodes the fix through Nominatim.
 */
const PlaceFinder: React.FC<{
  onPick: (match: GeocodeMatch) => void;
}> = ({ onPick }) => {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<GeocodeMatch[] | null>(null);
  const [error, setError] = useState<keyof typeof SEARCH_ERROR_COPY | null>(
    null,
  );
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const client = useMemo(() => createGeocodingClient(), []);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearching(true);
    setError(null);
    setMatches(null);
    const result = await client.search(trimmed);
    setSearching(false);
    switch (result.status) {
      case "ok":
        setMatches(result.matches);
        break;
      case "no-match":
      case "busy":
      case "failed":
        setError(result.status);
        break;
    }
  };

  const handlePick = (match: GeocodeMatch): void => {
    onPick(match);
    setMatches(null);
    setError(null);
  };

  const handleFindMyLocation = async (): Promise<void> => {
    setLocating(true);
    setLocationError(false);
    const fix = await getDeviceLocation();
    if (fix.status !== "ok") {
      setLocating(false);
      setLocationError(true);
      return;
    }
    const match = await client.reverse(fix.latitude, fix.longitude);
    setLocating(false);
    // Reverse geocoding names the spot so the visitor can verify the fix;
    // "My location" is the honest fallback when Nominatim cannot name it.
    onPick({
      displayName: match?.displayName ?? "My location",
      latitude: fix.latitude,
      longitude: fix.longitude,
    });
  };

  return (
    <section className="conditions__finder">
      <h2>Find a place</h2>
      <form className="conditions__search" onSubmit={handleSubmit}>
        <label className="conditions__label" htmlFor="conditions-search-field">
          Search for a place
        </label>
        <div className="conditions__search-row">
          <input
            id="conditions-search-field"
            type="search"
            className="conditions__field"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. Tromsø, Norway"
          />
          <button type="submit" className="btn--primary" disabled={searching}>
            {searching ? "Searching…" : "Search"}
          </button>
        </div>
        {error !== null ? (
          <p className="conditions__status" role="status">
            {SEARCH_ERROR_COPY[error]}
          </p>
        ) : null}
        {matches !== null ? (
          <fieldset className="conditions__matches">
            <legend className="sr-only">Places matching “{query}”</legend>
            <ul className="conditions__match-list">
              {matches.map((match) => (
                <li key={match.displayName}>
                  <label className="conditions__match">
                    <input
                      className="conditions__match-input"
                      type="radio"
                      name="conditions-place-match"
                      onChange={() => handlePick(match)}
                    />
                    {match.displayName}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        ) : null}
        <p className="conditions__attribution">
          <a href={OSM_COPYRIGHT_URL} target="_blank" rel="noopener noreferrer">
            © OpenStreetMap contributors
          </a>
        </p>
      </form>
      <div className="conditions__locate">
        <button
          type="button"
          className="btn--secondary"
          disabled={locating}
          onClick={handleFindMyLocation}
        >
          {locating ? "Locating…" : "Find my location"}
        </button>
        {locationError ? (
          <p className="conditions__status" role="status">
            {LOCATION_ERROR_COPY}
          </p>
        ) : null}
      </div>
    </section>
  );
};

/**
 * The WMO icon-name to glyph map for the weather blocks (ticket 03). The
 * lookup file owns the names; this map owns the rendering, so the data
 * stays pure text and the icons stay a page concern.
 */
const WEATHER_ICON_BY_NAME: Record<string, SvgIconComponent> = {
  clear: WbSunnyIcon,
  "mostly-clear": WbSunnyIcon,
  "partly-cloudy": CloudQueueIcon,
  overcast: CloudIcon,
  fog: FoggyIcon,
  drizzle: WaterDropIcon,
  "freezing-drizzle": SevereColdIcon,
  rain: UmbrellaIcon,
  "freezing-rain": SevereColdIcon,
  snow: AcUnitIcon,
  "snow-grains": GrainIcon,
  "rain-showers": UmbrellaIcon,
  "snow-showers": AcUnitIcon,
  thunderstorm: ThunderstormIcon,
  "thunderstorm-hail": ThunderstormIcon,
  unknown: HelpIcon,
};

/** The WMO icon for a weather code; the text label sits beside it. */
const WeatherIcon: React.FC<{ code: number }> = ({ code }) => {
  const Icon = WEATHER_ICON_BY_NAME[wmoWeather(code).icon] ?? HelpIcon;
  return (
    <Icon
      aria-hidden="true"
      className="conditions__wmo-icon"
      fontSize="inherit"
    />
  );
};

/**
 * Weather for the geocoded place (ticket 03): current conditions, a 24 hour
 * horizontally scrolling hourly strip and a 3 day daily row from one
 * Open-Meteo fetch, refreshed only on the always-enabled Refresh tap – no
 * polling and no refetch on focus (ADR 0003 exception, ADR 0005). Failure
 * swaps only this block to a plain retryable error; the place and daylight
 * stay visible.
 */
const WeatherBlock: React.FC<{ place: GeocodedPlace }> = ({ place }) => {
  const query = useQuery({
    queryKey: ["open-meteo-weather", place.latitude, place.longitude],
    queryFn: () => fetchWeather(place.latitude, place.longitude),
    // The cache is shown between manual refreshes; every refetch trigger
    // except the Refresh tap is off, so one call per place change plus user
    // pulls is all the free tier ever sees.
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const { data, isPending, isError, refetch } = query;
  return (
    <section className="conditions__weather">
      <div className="conditions__weather-header">
        <h2>Weather</h2>
        <button
          type="button"
          className="btn--secondary"
          title="Refresh"
          onClick={() => void refetch()}
        >
          <RefreshIcon fontSize="small" aria-hidden="true" />
          <span className="btn__label">Refresh</span>
        </button>
      </div>
      {data ? (
        <>
          <p className="conditions__weather-fetched">
            Data from Open-Meteo at {formatTime(new Date(data.fetchedAt))} local
          </p>
          {isError ? (
            <p className="conditions__status" role="status">
              Couldn't refresh the weather – showing the last data.
            </p>
          ) : null}
          <WeatherCurrent data={data} />
          <WeatherHourly data={data} />
          <WeatherDaily data={data} place={place} />
        </>
      ) : isPending ? (
        <p className="conditions__status" aria-busy="true">
          Loading weather…
        </p>
      ) : (
        <p className="conditions__status">
          Couldn't load the weather – check back later.
        </p>
      )}
    </section>
  );
};

/** Current conditions: temperature, humidity, total cloud with the low/mid/high split and the WMO code as icon plus text. */
const WeatherCurrent: React.FC<{ data: WeatherData }> = ({ data }) => {
  const { current } = data;
  return (
    <div className="conditions__current">
      <p className="conditions__current-main">
        <WeatherIcon code={current.weatherCode} />
        <span className="conditions__current-temp">
          {formatCelsius(current.temperatureC)}
        </span>
        <span className="conditions__current-wmo">
          {wmoWeather(current.weatherCode).text}
        </span>
      </p>
      <p className="conditions__current-details">
        Humidity {current.humidityPercent}% ·{" "}
        {cloudSplitText(
          current.cloudCoverPercent,
          current.cloudLowPercent,
          current.cloudMidPercent,
          current.cloudHighPercent,
        )}
      </p>
    </div>
  );
};

/**
 * The 24 hour hourly strip: a horizontally scrollable row, one entry per
 * hour with time, temperature, humidity, total cloud with the low/mid/high
 * split and the WMO code as icon plus text.
 */
const WeatherHourly: React.FC<{ data: WeatherData }> = ({ data }) => {
  const stripLabelId = useId();
  return (
    <div className="conditions__hourly-block">
      <h3 className="sr-only" id={stripLabelId}>
        24-hour hourly strip
      </h3>
      <ul
        className="conditions__hourly"
        aria-labelledby={stripLabelId}
        // Keyboard access for the scrollable region (axe scrollable-region-focusable).
        tabIndex={0}
      >
        {data.hourly.map((hour) => (
          <li key={hour.time} className="conditions__hour">
            <span className="conditions__hour-time">{hour.time.slice(11)}</span>
            <span className="conditions__hour-main">
              <WeatherIcon code={hour.weatherCode} />
              <span className="conditions__hour-temp">
                {formatCelsius(hour.temperatureC)}
              </span>
            </span>
            <span className="conditions__hour-wmo">
              {wmoWeather(hour.weatherCode).text}
            </span>
            <span className="conditions__hour-detail">
              Humidity {hour.humidityPercent}%
            </span>
            <span className="conditions__hour-detail">
              {cloudSplitText(
                hour.cloudCoverPercent,
                hour.cloudLowPercent,
                hour.cloudMidPercent,
                hour.cloudHighPercent,
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** The 3 day daily row as a semantic table: one card per day with max and min, WMO icon and text and sunrise and sunset for reference. */
const WeatherDaily: React.FC<{ data: WeatherData; place: GeocodedPlace }> = ({
  data,
  place,
}) => {
  const tableLabelId = useId();
  return (
    <div
      className="conditions__daily-scroll"
      role="region"
      aria-labelledby={tableLabelId}
      // Keyboard access for the scrollable table region on narrow screens
      // (scrollable-region-focusable); named by the sr-only span below.
      tabIndex={0}
    >
      <span className="sr-only" id={tableLabelId}>
        3-day weather forecast table, scrollable
      </span>
      <table className="conditions__daily">
        <caption>3-day weather forecast at {place.displayName}</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Conditions</th>
            <th scope="col">Max</th>
            <th scope="col">Min</th>
            <th scope="col">Sunrise</th>
            <th scope="col">Sunset</th>
          </tr>
        </thead>
        <tbody>
          {data.daily.map((day) => (
            <tr key={day.date}>
              <td>{day.date}</td>
              <td>
                <WeatherIcon code={day.weatherCode} />
                <span className="conditions__daily-wmo">
                  {wmoWeather(day.weatherCode).text}
                </span>
              </td>
              <td>{formatCelsius(day.temperatureMaxC)}</td>
              <td>{formatCelsius(day.temperatureMinC)}</td>
              <td>{day.sunrise.slice(11)}</td>
              <td>{day.sunset.slice(11)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Local conditions – daylight for the stored geocoded place, derived on
 * device with suncalc (ADR 0005). No network call happens for solar times;
 * the place defaults to Kiruna, Sweden and persists the first pick.
 */
const LocalConditions: React.FC = () => {
  const [place, setPlace] = useState<GeocodedPlace>(() =>
    loadGeocodedPlace(localStorage),
  );
  useEffect(() => {
    if (localStorage.getItem(PLACE_STORAGE_KEY) === null) {
      saveGeocodedPlace(localStorage, {
        ...place,
        fetchedAt: new Date().toISOString(),
      });
    }
  }, [place]);
  const { today } = daylightTimes(place.latitude, place.longitude, new Date());
  const handlePick = (match: GeocodeMatch): void => {
    const picked: GeocodedPlace = {
      ...match,
      fetchedAt: new Date().toISOString(),
    };
    saveGeocodedPlace(localStorage, picked);
    setPlace(picked);
  };
  return (
    <div className="container conditions">
      <h1>Local conditions</h1>
      <p className="conditions__intro">Daylight chart in your time zone.</p>
      <p className="conditions__place">{place.displayName}</p>
      <PlaceFinder onPick={handlePick} />
      <DayBlock heading="Today's daylight chart" day={today} />
      <WeatherBlock place={place} />
      {/* Only Today renders for now (2026-09-01) – the Tomorrow block is
          kept in case the day-pair view returns. daylightTimes still
          computes tomorrow: today's Night ends at tomorrow's dawn. */}
      {/* <DayBlock heading="Tomorrow" day={tomorrow} /> */}
    </div>
  );
};

export default LocalConditions;

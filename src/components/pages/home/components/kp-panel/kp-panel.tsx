import { useId } from "react";

import {
  parsePlanetaryKIndex,
  parsePlanetaryKIndexForecast,
  NOAA_PLANETARY_K_INDEX_URL,
  NOAA_PLANETARY_K_INDEX_FORECAST_URL,
} from "../../../../../products/noaa-planetary-k-index";
import {
  parseThreeDayForecast,
  THREE_DAY_FORECAST_URL,
} from "../../../../../products/3-day-forecast";

import "./kp-panel.scss";

export function formatKp(kp: number): string {
  return `Kp${kp}`;
}

/** Frozen .kp01–.kp9 band class for a Kp value (ceil-based, Kp ≥ 9 → kp9). */
export function kpClass(kp: number): string {
  const ceil = Math.min(9, Math.ceil(kp));
  return ceil >= 9 ? "kp9" : `kp${ceil}${ceil + 1}`;
}

const KP_SEGMENT_CLASSES = [
  "kp01",
  "kp12",
  "kp23",
  "kp34",
  "kp45",
  "kp56",
  "kp67",
  "kp78",
  "kp89",
  "kp9",
] as const;

export const KpBar: React.FC<{ kp: number }> = ({ kp }) => {
  const filled = Math.min(9, kp);
  const barLabelId = useId();
  return (
    <div
      className="kp-bar"
      role="img"
      aria-labelledby={barLabelId}
    >
      <span className="sr-only" id={barLabelId}>
        {`Kp ${kp} on scale 0 to 9, ${filled} of 9 segments colored`}
      </span>
      <span aria-hidden="true" className="kp-bar__start" />
      {KP_SEGMENT_CLASSES.map((cls, i) => {
        const nextIsNotFilled = i + 1 > filled;
        const isFilled = i <= filled;
        const stopNow = (nextIsNotFilled && isFilled) || (isFilled && i >= 9);
        return (
          <span key={cls} style={{ display: "contents" }}>
            <span
              className={`kp-bar__segment ${isFilled ? cls : "kp-bar__segment--empty"}`}
            >
              {i}
            </span>
            {stopNow ? <span className="kp-bar__stop" /> : null}
          </span>
        );
      })}
    </div>
  );
};

export const fetchKpObserved = async () => {
  const response = await fetch(NOAA_PLANETARY_K_INDEX_URL);
  if (!response.ok) throw new Error(`NOAA returned ${response.status}`);
  return parsePlanetaryKIndex(await response.text());
};

export const fetchKpForecast = async () => {
  const response = await fetch(NOAA_PLANETARY_K_INDEX_FORECAST_URL);
  if (!response.ok) throw new Error(`NOAA returned ${response.status}`);
  return parsePlanetaryKIndexForecast(await response.text());
};

export const fetchThreeDay = async () => {
  const response = await fetch(THREE_DAY_FORECAST_URL);
  if (!response.ok) throw new Error(`NOAA returned ${response.status}`);
  return parseThreeDayForecast(await response.text());
};
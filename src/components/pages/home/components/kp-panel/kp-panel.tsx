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

export const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatKp(kp: number): string {
  return `Kp${kp}`;
}

/** Frozen .kp01–.kp9 band class for a Kp value (ceil-based, Kp ≥ 9 → kp9). */
export function kpClass(kp: number): string {
  const ceil = Math.min(9, Math.ceil(kp));
  return ceil >= 9 ? "kp9" : `kp${ceil}${ceil + 1}`;
}

export function formatTimeSlot(slot: string): string {
  return slot.replace("-", ":00 - ").replace("UT", ":00 UTC");
}

/** Formats "Aug 25" → "Tuesday\n25/08" (weekday and short date on two lines) */
export function formatDayLabel(dayLabel: string): string {
  const [monStr, dayStr] = dayLabel.split(" ");
  const monthIndex = MONTHS_SHORT.indexOf(monStr);
  if (monthIndex === -1) return dayLabel;
  const now = new Date();
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), monthIndex, Number(dayStr)),
  );
  if (isNaN(d.getTime())) return dayLabel;
  const weekday = d.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${weekday}\n${dd}/${mm}`;
}

/** Formats ISO "2026-08-18T00:00:00" → "Aug 18\n00:00" for chart XAxis (two lines) */
export function formatChartLabel(timeTag: string): string {
  const iso =
    timeTag.endsWith("Z") || timeTag.includes("+") ? timeTag : `${timeTag}Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    const sliced = timeTag.slice(5, 16); // "08-18T00:00"
    const [datePart, timePart] = sliced.split("T");
    if (!datePart || !timePart) return sliced.replace("T", "\n");
    const [mm, dd] = datePart.split("-");
    const monthIdx = Number(mm) - 1;
    const mon = MONTHS_SHORT[monthIdx] ?? mm;
    return `${mon} ${dd}\n${timePart}`;
  }
  const mon = MONTHS_SHORT[d.getUTCMonth()];
  const day = String(d.getUTCDate());
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mins = String(d.getUTCMinutes()).padStart(2, "0");
  return `${mon} ${day}\n${hh}:${mins}`;
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
  return (
    <div className="kp-bar" role="img" aria-label={`Kp ${kp} on a scale of 0 to 9`}>
      <span className="sr-only">
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
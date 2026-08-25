import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import {
  parseThreeDayForecast,
  THREE_DAY_FORECAST_URL,
} from "../../../../../products/3-day-forecast";
import { deriveMinMaxKp } from "../../../../../products/derive-kp-minmax";

import "./Live.scss";

const MONTHS_SHORT = [
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

/** Formats "Aug 25" → "Tuesday - 25/08" */
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
  return `${weekday} - ${dd}/${mm}`;
}

export function formatKp(kp: number): string {
  return `Kp${kp}`;
}

export function formatTimeSlot(slot: string): string {
  return slot.replace("-", ":00 - ").replace("UT", ":00 UTC");
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
  const filled = Math.min(9, Math.ceil(kp));
  return (
    <div className="kp-bar" role="img">
      <span className="sr-only">
        Kp ${kp} on scale 0 to 9, ${filled} of 9 segments colored
      </span>
      <span aria-hidden="true" className="kp-bar__start" />
      {KP_SEGMENT_CLASSES.map((cls, i) => {
        const nextIsNotFilled = i + 1 > filled;
        const isFilled = i <= filled;
        const stopNow = (nextIsNotFilled && isFilled) || (isFilled && i >= 9);
        return (
          <>
            <span
              key={cls}
              className={`kp-bar__segment ${isFilled ? cls : "kp-bar__segment--empty"}`}
            >
              {i}
            </span>
            {stopNow ? <span className="kp-bar__stop" /> : null}
          </>
        );
      })}
    </div>
  );
};

const fetchThreeDay = async () => {
  const response = await fetch(THREE_DAY_FORECAST_URL);
  if (!response.ok) throw new Error(`NOAA returned ${response.status}`);
  return parseThreeDayForecast(await response.text());
};

/** Live – current Kp for current 3h window + min/max per day (simple) */
const Live: React.FC = () => {
  const { data, isPending, isError } = useQuery({
    queryKey: ["3-day-forecast"],
    queryFn: fetchThreeDay,
  });

  if (isPending && !data) {
    return (
      <article aria-busy="true">
        <h2>Live</h2>
        <p>Loading Kp forecast…</p>
      </article>
    );
  }
  if (isError && !data) {
    return (
      <article>
        <h2>Live</h2>
        <p>Couldn&apos;t load Kp forecast. Please check back later.</p>
      </article>
    );
  }
  if (!data) return null;

  const nowHour = new Date().getUTCHours();
  const slotIndex = Math.floor(nowHour / 3);
  let dayIndex = 0;
  const now = new Date();
  for (let i = 0; i < data.days.length; i++) {
    const dayLabel = data.days[i];
    const withYear = `${dayLabel} ${now.getUTCFullYear()}`;
    const d = new Date(withYear + " UTC");
    if (
      !isNaN(d.getTime()) &&
      d.getUTCDate() === now.getUTCDate() &&
      d.getUTCMonth() === now.getUTCMonth()
    ) {
      dayIndex = i;
      break;
    }
  }
  const currentKp =
    data.geomagneticActivity.kpBreakdown[slotIndex]?.days[dayIndex] ??
    data.geomagneticActivity.kpBreakdown[0].days[dayIndex];
  const currentSlot =
    data.geomagneticActivity.kpBreakdown[slotIndex]?.timeSlot ?? "";
  const rows = deriveMinMaxKp(data.days, data.geomagneticActivity.kpBreakdown);

  return (
    <article className="live">
      <h2>Live</h2>
      <div className="live__current">
        <span className="live__current__time">
          {formatTimeSlot(currentSlot)}
        </span>
        <span
          className={`live__current__kp kp${currentKp >= 9 ? "9" : Math.ceil(currentKp) + "" + (Math.ceil(currentKp) + 1)}`}
        >
          {formatKp(currentKp)}
        </span>
      </div>
      <KpBar kp={currentKp} />
      <table>
        <caption>Kp-index forecast</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Min</th>
            <th scope="col">Max</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.day}>
              <th scope="row">{formatDayLabel(r.day)}</th>
              <td
                className={`kp${r.min >= 9 ? "9" : Math.ceil(r.min) + "" + (Math.ceil(r.min) + 1)}`}
              >
                {formatKp(r.min)}
              </td>
              <td
                className={`kp${r.max >= 9 ? "9" : Math.ceil(r.max) + "" + (Math.ceil(r.max) + 1)}`}
              >
                {formatKp(r.max)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        <Link to="/forecasts/3days">Full 3-day forecast →</Link>
      </p>
    </article>
  );
};

export default Live;

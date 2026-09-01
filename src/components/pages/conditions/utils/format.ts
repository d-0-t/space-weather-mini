export const formatTime = (date: Date): string =>
  new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

/** Celsius with one decimal, e.g. "10.6°C" – the v1 unit everywhere. */
export const formatCelsius = (value: number): string => `${value.toFixed(1)}°C`;

/** Total cloud with the low/mid/high split, e.g. "Cloud 100% · low 5% / mid 94% / high 100%". */
export const cloudSplitText = (
  totalPercent: number,
  lowPercent: number,
  midPercent: number,
  highPercent: number,
): string =>
  `Cloud ${totalPercent}% · low ${lowPercent}% / mid ${midPercent}% / high ${highPercent}%`;

/** Visible label for the end of the day – midnight at the day's close. */
export const DAY_END_LABEL = "24:00";

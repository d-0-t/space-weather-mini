/** Celsius with one decimal, e.g. "10.6°C" – the v1 unit everywhere. */
export const formatCelsius = (value: number): string =>
  `${Math.round(value)}°C`; //`${value.toFixed(1)}°C`;

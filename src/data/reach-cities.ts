/**
 * Reach towns city data – the static towns the Aurora now panel's Reach
 * towns element can surface (CONTEXT.md "Reach towns"). Offline-safe, no
 * fetch (ADR-0001).
 *
 * Approximate geomagnetic latitude (MLAT), centered-dipole method:
 *
 *   sin(MLAT) = sin(lat)·sin(80.8°) + cos(lat)·cos(80.8°)·cos(lon + 72.8°)
 *
 * against the IGRF-14 geomagnetic north pole at epoch 2025.0,
 * 80.8° N, 72.8° W (WDC for Geomagnetism, Kyoto, "Magnetic North,
 * Geomagnetic and Magnetic Poles", read live 2026-09-14; the 2026
 * predicted pole 80.9° N, 72.8° W moves any value below 0.1°). The sign
 * keeps the southern hemisphere negative; eligibility uses |MLAT|.
 *
 * Error note: comparing the approximation against WDC Kyoto's IGRF-14
 * dipole transformation spot checks (Tromsø 67.40, Rovaniemi 63.49,
 * Yellowknife 68.37, Hobart −49.40, Ushuaia −45.44) leaves a residual of
 * at most ~0.3° of latitude. The element is an approximate, average
 * guide, never a per-town promise (honesty bounds N3/N10).
 *
 * Coordinates: Open-Meteo geocoding, read 2026-09-14 – the same source
 * the app's weather uses.
 *
 * Coverage: 72 towns across Europe, North America, Asia, Oceania and
 * South America. The guide list stays between 45 and 70 degrees |MLAT|
 * (deep-polar-cap towns past 70° are deliberately absent to avoid an
 * overreaching list), except for webcam locations: every image and live
 * cam in data/webcams.ts carries a `city` that must exist here, because
 * the Possible locations panel's camera icon opens that town's webcams –
 * Rankin Inlet (the SMILE ASI station) therefore rides just past the
 * 70-degree guide window. Skibotn and Rabbit Lake miss Open-Meteo
 * geocoding (or return a same-name place far away), so those two carry
 * the operator-stated coordinates from their webcam entries.
 */

/** One town of the Reach towns list; MLAT is approximate (see file header). */
export interface ReachCity {
  /** Display name, e.g. "Tromsø". */
  city: string;
  /** Display country name, e.g. "Norway". */
  country: string;
  /** ISO 3166-1 alpha-2 code for the flag, lowercased for flagcdn, e.g. "no". */
  countryCode: string;
  /** Geographic latitude in degrees, negative south. */
  lat: number;
  /** Geographic longitude in degrees, negative west. */
  lon: number;
  /** Signed approximate geomagnetic latitude in degrees. */
  mlat: number;
}

/** The centered-dipole geomagnetic north pole this file's MLAT uses. */
const POLE_LATITUDE_DEG = 80.8;
const POLE_LONGITUDE_DEG = -72.8;

/**
 * The signed approximate geomagnetic latitude (MLAT) of any coordinate by
 * the same centered-dipole method the table's precomputed `mlat` values
 * use (see the file header for the pole, method, error note and source).
 * The one runtime computation of the formula – the stored places' tip in
 * the alert settings (ticket 06) reads it; nothing re-derives a fork.
 */
export function approxGeomagneticLatitude(
  latitude: number,
  longitude: number,
): number {
  const degreesToRadians = Math.PI / 180;
  const sinMlat =
    Math.sin(latitude * degreesToRadians) *
      Math.sin(POLE_LATITUDE_DEG * degreesToRadians) +
    Math.cos(latitude * degreesToRadians) *
      Math.cos(POLE_LATITUDE_DEG * degreesToRadians) *
      Math.cos(
        (longitude - POLE_LONGITUDE_DEG) * degreesToRadians,
      );
  return Math.asin(sinMlat) / degreesToRadians;
}

/** Every reachable town, grouped by country. */
export const REACH_CITIES: readonly ReachCity[] = [
  { city: "Rovaniemi", country: "Finland", countryCode: "fi", lat: 66.499, lon: 25.6887, mlat: 63.62 },
  { city: "Ivalo", country: "Finland", countryCode: "fi", lat: 68.6599, lon: 27.5389, mlat: 65.37 },
  { city: "Helsinki", country: "Finland", countryCode: "fi", lat: 60.1695, lon: 24.9354, mlat: 57.74 },
  { city: "Sodankylä", country: "Finland", countryCode: "fi", lat: 67.41667, lon: 26.6, mlat: 64.34 },
  { city: "Syrjävaara", country: "Finland", countryCode: "fi", lat: 62.85968, lon: 28.98947, mlat: 59.72 },
  { city: "Hankasalmi", country: "Finland", countryCode: "fi", lat: 62.38333, lon: 26.43333, mlat: 59.63 },
  { city: "Nyrölä", country: "Finland", countryCode: "fi", lat: 62.35457, lon: 25.46853, mlat: 59.74 },
  { city: "Kirkkonummi", country: "Finland", countryCode: "fi", lat: 60.12381, lon: 24.43853, mlat: 57.77 },
  { city: "Tromsø", country: "Norway", countryCode: "no", lat: 69.6676, lon: 18.9258, mlat: 67.51 },
  { city: "Alta", country: "Norway", countryCode: "no", lat: 69.9689, lon: 23.2717, mlat: 67.17 },
  { city: "Oslo", country: "Norway", countryCode: "no", lat: 59.9127, lon: 10.7461, mlat: 59.67 },
  { city: "Nordkapp", country: "Norway", countryCode: "no", lat: 71.1725, lon: 25.78444, mlat: 67.91 },
  { city: "Skjervøy", country: "Norway", countryCode: "no", lat: 70.03114, lon: 20.97141, mlat: 67.55 },
  { city: "Skibotn", country: "Norway", countryCode: "no", lat: 69.3373, lon: 20.2163, mlat: 67.02 },
  { city: "Finnsnes", country: "Norway", countryCode: "no", lat: 69.22959, lon: 17.98114, mlat: 67.25 },
  { city: "Risøyhamn", country: "Norway", countryCode: "no", lat: 68.9719, lon: 15.63814, mlat: 67.36 },
  { city: "Setermoen", country: "Norway", countryCode: "no", lat: 68.86099, lon: 18.34857, mlat: 66.86 },
  { city: "Loen", country: "Norway", countryCode: "no", lat: 61.87151, lon: 6.8459, mlat: 62.14 },
  { city: "Brekke", country: "Norway", countryCode: "no", lat: 61.02001, lon: 5.46153, mlat: 61.56 },
  { city: "Kiruna", country: "Sweden", countryCode: "se", lat: 67.8557, lon: 20.2251, mlat: 65.66 },
  { city: "Luleå", country: "Sweden", countryCode: "se", lat: 65.5841, lon: 22.1547, mlat: 63.27 },
  { city: "Stockholm", country: "Sweden", countryCode: "se", lat: 59.3294, lon: 18.0687, mlat: 57.97 },
  { city: "Abisko", country: "Sweden", countryCode: "se", lat: 68.34914, lon: 18.82868, mlat: 66.32 },
  { city: "Porjus", country: "Sweden", countryCode: "se", lat: 66.95927, lon: 19.82071, mlat: 64.89 },
  { city: "Reykjavík", country: "Iceland", countryCode: "is", lat: 64.1355, lon: -21.8954, mlat: 68.79 },
  { city: "Akureyri", country: "Iceland", countryCode: "is", lat: 65.6835, lon: -18.0878, mlat: 69.65 },
  { city: "Qaqortoq", country: "Greenland", countryCode: "gl", lat: 60.7184, lon: -46.0356, mlat: 68.56 },
  { city: "Tórshavn", country: "Faroe Islands", countryCode: "fo", lat: 62.0097, lon: -6.7716, mlat: 64.44 },
  { city: "Lerwick", country: "United Kingdom", countryCode: "gb", lat: 60.1534, lon: -1.1443, mlat: 61.79 },
  { city: "Edinburgh", country: "United Kingdom", countryCode: "gb", lat: 55.9521, lon: -3.1965, mlat: 58.11 },
  { city: "London", country: "United Kingdom", countryCode: "gb", lat: 51.5085, lon: -0.1257, mlat: 53.35 },
  { city: "Dublin", country: "Ireland", countryCode: "ie", lat: 53.3331, lon: -6.2489, mlat: 56.08 },
  { city: "Copenhagen", country: "Denmark", countryCode: "dk", lat: 55.6759, lon: 12.5655, mlat: 55.34 },
  { city: "Tallinn", country: "Estonia", countryCode: "ee", lat: 59.437, lon: 24.7535, mlat: 57.07 },
  { city: "Riga", country: "Latvia", countryCode: "lv", lat: 56.946, lon: 24.1059, mlat: 54.77 },
  { city: "Vilnius", country: "Lithuania", countryCode: "lt", lat: 54.6892, lon: 25.2798, mlat: 52.42 },
  { city: "Warsaw", country: "Poland", countryCode: "pl", lat: 52.2298, lon: 21.0118, mlat: 50.7 },
  { city: "Berlin", country: "Germany", countryCode: "de", lat: 52.5244, lon: 13.4105, mlat: 52.17 },
  { city: "Amsterdam", country: "Netherlands", countryCode: "nl", lat: 52.374, lon: 4.8897, mlat: 53.38 },
  { city: "Paris", country: "France", countryCode: "fr", lat: 48.8534, lon: 2.3488, mlat: 50.38 },
  { city: "Murmansk", country: "Russia", countryCode: "ru", lat: 68.9678, lon: 33.0992, mlat: 64.91 },
  { city: "Norilsk", country: "Russia", countryCode: "ru", lat: 69.3535, lon: 88.2027, mlat: 60.51 },
  { city: "Arkhangelsk", country: "Russia", countryCode: "ru", lat: 64.5461, lon: 40.5518, mlat: 59.78 },
  { city: "Saint Petersburg", country: "Russia", countryCode: "ru", lat: 59.9386, lon: 30.3141, mlat: 56.74 },
  { city: "Yakutsk", country: "Russia", countryCode: "ru", lat: 62.0311, lon: 129.7229, mlat: 53.38 },
  { city: "Moscow", country: "Russia", countryCode: "ru", lat: 55.752, lon: 37.6178, mlat: 51.68 },
  { city: "Petropavlovsk-Kamchatsky", country: "Russia", countryCode: "ru", lat: 53.0639, lon: 158.6275, mlat: 46.81 },
  { city: "Kaliningrad", country: "Russia", countryCode: "ru", lat: 54.70639, lon: 20.51102, mlat: 53.17 },
  { city: "Fairbanks", country: "United States", countryCode: "us", lat: 64.8378, lon: -147.7164, mlat: 65.67 },
  { city: "Anchorage", country: "United States", countryCode: "us", lat: 61.2181, lon: -149.9003, mlat: 61.93 },
  { city: "Juneau", country: "United States", countryCode: "us", lat: 58.3019, lon: -134.4197, mlat: 61.62 },
  { city: "Seattle", country: "United States", countryCode: "us", lat: 47.6062, lon: -122.3321, mlat: 53.03 },
  { city: "Minneapolis", country: "United States", countryCode: "us", lat: 44.98, lon: -93.2638, mlat: 53.49 },
  { city: "Portland, Maine", country: "United States", countryCode: "us", lat: 43.6574, lon: -70.2589, mlat: 52.85 },
  { city: "Boston", country: "United States", countryCode: "us", lat: 42.3584, lon: -71.0598, mlat: 51.55 },
  { city: "Chicago", country: "United States", countryCode: "us", lat: 41.85, lon: -87.65, mlat: 50.69 },
  { city: "New York", country: "United States", countryCode: "us", lat: 40.7143, lon: -74.006, mlat: 49.91 },
  { city: "Denver", country: "United States", countryCode: "us", lat: 39.7392, lon: -104.9847, mlat: 47.32 },
  { city: "Isle Royale", country: "United States", countryCode: "us", lat: 48.00044, lon: -88.83341, mlat: 56.76 },
  { city: "Yellowknife", country: "Canada", countryCode: "ca", lat: 62.4541, lon: -114.3725, mlat: 68.52 },
  { city: "Churchill", country: "Canada", countryCode: "ca", lat: 58.7681, lon: -94.1667, mlat: 67.11 },
  { city: "Whitehorse", country: "Canada", countryCode: "ca", lat: 60.7161, lon: -135.0538, mlat: 63.82 },
  { city: "Edmonton", country: "Canada", countryCode: "ca", lat: 53.5501, lon: -113.4687, mlat: 60.01 },
  { city: "St. John's", country: "Canada", countryCode: "ca", lat: 47.5649, lon: -52.7093, mlat: 56.08 },
  { city: "Halifax", country: "Canada", countryCode: "ca", lat: 44.6427, lon: -63.5769, mlat: 53.7 },
  { city: "Rankin Inlet", country: "Canada", countryCode: "ca", lat: 62.80906, lon: -92.08534, mlat: 71.26 },
  { city: "Rabbit Lake", country: "Canada", countryCode: "ca", lat: 58.2, lon: -103.71, mlat: 65.68 },
  { city: "Gillam", country: "Canada", countryCode: "ca", lat: 56.34745, lon: -94.70808, mlat: 64.68 },
  { city: "Pinawa", country: "Canada", countryCode: "ca", lat: 50.1489, lon: -95.88115, mlat: 58.44 },
  { city: "Kapuskasing", country: "Canada", countryCode: "ca", lat: 49.41694, lon: -82.43308, mlat: 58.46 },
  { city: "Hobart", country: "Australia", countryCode: "au", lat: -42.8794, lon: 147.3294, mlat: -49.58 },
  { city: "Invercargill", country: "New Zealand", countryCode: "nz", lat: -46.4, lon: 168.35, mlat: -50.18 },
  { city: "Christchurch", country: "New Zealand", countryCode: "nz", lat: -43.5333, lon: 172.6333, mlat: -46.73 },
  { city: "Ushuaia", country: "Argentina", countryCode: "ar", lat: -54.8108, lon: -68.3159, mlat: -45.63 },
  { city: "Puerto Williams", country: "Chile", countryCode: "cl", lat: -54.9335, lon: -67.6096, mlat: -45.76 },
];

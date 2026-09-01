import {
  webcamCountryCode,
  WEBCAM_COUNTRY_CODES,
} from "../../../../data/webcams";
import type { GeocodedPlace } from "../../../../data/place-storage";

/**
 * Extra country name → code mappings for Nominatim display_name variants
 * that are not covered by WEBCAM_COUNTRY_CODES (local language names,
 * common English aliases). Keys are lowercased.
 */
const EXTRA_COUNTRY_CODES: Record<string, string> = {
  sverige: "se",
  sweden: "se",
  norge: "no",
  norway: "no",
  noreg: "no",
  suomi: "fi",
  finland: "fi",
  danmark: "dk",
  denmark: "dk",
  island: "is",
  iceland: "is",
  grönland: "gl",
  groenland: "gl",
  greenland: "gl",
  "united states": "us",
  "united states of america": "us",
  usa: "us",
  america: "us",
  "alaska, us": "us",
  us: "us",
  "united kingdom": "gb",
  uk: "gb",
  "great britain": "gb",
  england: "gb",
  deutschland: "de",
  germany: "de",
  schweiz: "ch",
  suisse: "ch",
  switzerland: "ch",
  "new zealand": "nz",
  antarctica: "aq",
  antarktis: "aq",
  russia: "ru",
  rossiya: "ru",
  canada: "ca",
  australia: "au",
  france: "fr",
  frankreich: "fr",
  spanien: "es",
  spain: "es",
  italy: "it",
  italia: "it",
  poland: "pl",
  polska: "pl",
  netherlands: "nl",
  nederland: "nl",
};

/**
 * Lowercased country name → ISO code, merging the webcam registry
 * (authoritative for our verified countries) with the extra variants.
 */
const COUNTRY_CODE_BY_NAME: Record<string, string> = (() => {
  const base: Record<string, string> = {};
  for (const [name, code] of Object.entries(WEBCAM_COUNTRY_CODES)) {
    base[name.toLowerCase()] = code;
  }
  for (const [name, code] of Object.entries(EXTRA_COUNTRY_CODES)) {
    base[name.toLowerCase()] = code;
  }
  return base;
})();

const isCountryName = (part: string): boolean =>
  COUNTRY_CODE_BY_NAME[part.trim().toLowerCase()] !== undefined;

const countryCodeForName = (name: string): string | undefined => {
  const direct = webcamCountryCode(name);
  if (direct) return direct;
  return COUNTRY_CODE_BY_NAME[name.trim().toLowerCase()];
};

export interface ShortPlace {
  /** First + (second if not a country), e.g. "Kiruna, Kiruna kommun" or "Oslo". */
  shortName: string;
  /** Country name as in display_name's last segment or stored country. */
  country: string;
  /** ISO2 lowercased for flagcdn, may be empty if unknown. */
  countryCode: string;
}

/**
 * Short display name for a geocoded place: first and second comma segment
 * (second omitted when it is itself a country). The country is not part of
 * the short name – the caller renders it as a flag in front.
 *
 * Examples:
 *  "Oslo, Norway" → "Oslo" + Norway/no
 *  "Kiruna, Kiruna kommun, Norrbottens län, 981 30, Sverige" → "Kiruna, Kiruna kommun" + Sverige/se
 *  "Storgata, Nerstranda, Sørbyen, Tromsø, Troms, 9008, Norge" → "Storgata, Nerstranda" + Norge/no
 *  "Springfield, Sangamon County, Illinois, United States" → "Springfield, Sangamon County" + US/us
 */
export function shortPlace(place: Partial<GeocodedPlace>): ShortPlace {
  const raw = place.displayName ?? "";
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    const code = place.countryCode ?? "";
    return { shortName: raw, country: place.country ?? "", countryCode: code };
  }

  const country = place.country ?? parts[parts.length - 1] ?? "";
  const countryCode =
    place.countryCode?.toLowerCase() ??
    countryCodeForName(country) ??
    countryCodeForName(parts[parts.length - 1] ?? "") ??
    "";

  let shortName: string;
  if (parts.length === 1) {
    shortName = parts[0];
  } else {
    const second = parts[1];
    const secondIsCountry =
      isCountryName(second) ||
      second.toLowerCase() === country.trim().toLowerCase();
    if (secondIsCountry) {
      shortName = parts[0];
    } else {
      shortName = `${parts[0]}, ${parts[1]}`;
    }
  }

  return { shortName, country, countryCode };
}

/** Convenience: just the short textual part without flag info. */
export function shortDisplayName(displayName: string): string {
  // Fallback when only a raw string is available (no stored countryCode).
  // We synthesize a minimal place for the parser.
  return shortPlace({ displayName, latitude: 0, longitude: 0, fetchedAt: "" })
    .shortName;
}

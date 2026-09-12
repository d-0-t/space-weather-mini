/**
 * Interval-text tables for the plain-language summary in the Aurora Now
 * panel (Home). Three rows – live Kp index, solar-wind speed, and Bz (GSM)
 * as a gate – each mapping a live value to one of three plain levels plus
 * one concise honest sentence and its mapping source. Pure data over the
 * existing product hooks: no fetching, no component state, null values
 * read as "no data" and never as zero or a level. Hemispheric power was
 * dropped from the summary (human decision 2026-09-12: it is the OVATION
 * synthesis of the same L1 inputs the other rows already show) and stays
 * expert-only in the Magnetosphere panel.
 *
 * Shape per the human decision of 2026-09-12: the summary renders ONE
 * merged paragraph (one short sentence per row), so the earlier P1/P2
 * drafting variants and per-row cards are gone; ticket 08 reviews the
 * single wording per row. The SWPC caveats (approximate averages,
 * geomagnetic latitude) live in the summary's source data via the source
 * keys, not in shipped copy (removed in review).
 *
 * Honesty bounds per `docs/research/plain-language-honesty-2026-09-12.md`
 * (the 12-item NO-GO list is normative): every line carries likelihood
 * ("possible / can / favors", never "will"); no tonight claims (N5 – a
 * 3-hour Kp block cannot ground one); no color promises (N4); planetary
 * Kp never conflated with the local oval (N9); gate language only for
 * Bz, never a Kp outcome (N1); speed always paired with the direction
 * caveat (N2); the word "conditions" never appears for 1-min L1 readings
 * (N12).
 */

/** The three plain levels of the interpreter, plus the missing-data state. */
export type InterpreterLevel = "calm" | "active" | "storm-like" | "no-data";

/** One interval-text row: stable key, level, one concise sentence, source. */
export interface IntervalText {
  /** Stable key of this value interval's text, e.g. "kp-calm". */
  key: string;
  level: Exclude<InterpreterLevel, "no-data">;
  /** The concise sentence for this interval. */
  sentence: string;
  /** Mapping source of the claim, e.g. the NOAA page owning the band. */
  source: string;
}

/** One missing-data row: honest "no data" copy, never a level, never zero. */
export interface NoDataText {
  level: "no-data";
  /** Stable key of the missing-data text. */
  key: "no-data";
  sentence: string;
  /** Empty: no band claim exists without a value. */
  source: string;
}

const KP_SOURCE = "NOAA SWPC, Tips on Viewing the Aurora";
const SPEED_SOURCE = "NOAA SWPC, Solar Wind (phenomena page)";
const BZ_SOURCE = "NOAA SWPC, Geomagnetic Storms (phenomena page)";

/**
 * Bz (GSM) as the gate (SWPC Geomagnetic Storms page): northward Bz keeps
 * the gate closed; southward Bz couples energy in, with the storm only
 * when strong southward driving is SUSTAINED for hours (1-min readings
 * flicker – duration beats instant value). Gate language only – "favors /
 * can drive", never a Kp outcome (N1) – and never "conditions", only the
 * latest reading (N12).
 */
export function bzIntervalText(bz: number | null): IntervalText | NoDataText {
  if (bz === null) return noData();
  if (bz > 0) {
    return {
      key: "bz-calm",
      level: "calm",
      sentence: "The magnetic field points northward, keeping the gate to aurora shut.",
      source: BZ_SOURCE,
    };
  }
  if (bz > -10) {
    return {
      key: "bz-active",
      level: "active",
      sentence: "The magnetic gate is cracked open – it can favor aurora, and what decides is whether it holds for hours.",
      source: BZ_SOURCE,
    };
  }
  return {
    key: "bz-storm",
    level: "storm-like",
    sentence: "The magnetic gate is open wide; if it holds for hours it can drive a storm.",
    source: BZ_SOURCE,
  };
}

/**
 * Solar wind speed bands (SWPC Solar Wind page): slow < 400 km/s is the
 * common equatorial state and brings calm; 400–800 covers elevated through
 * coronal-hole fast streams (storming possible only with the direction on
 * side); 700+ is event-grade (a G2 alert rode on winds > 700 km/s). Speed
 * alone never decides (N2) – every line pairs the direction caveat.
 */
export function speedIntervalText(speed: number | null): IntervalText | NoDataText {
  if (speed === null) return noData();
  if (speed < 400) {
    return {
      key: "speed-calm",
      level: "calm",
      sentence: "The particle stream from the Sun is running slow and calm; the gate's direction matters more.",
      source: SPEED_SOURCE,
    };
  }
  if (speed < 700) {
    return {
      key: "speed-active",
      level: "active",
      sentence: "The particle stream has picked up speed – it favors storming only together with a southward magnetic gate.",
      source: SPEED_SOURCE,
    };
  }
  return {
    key: "speed-storm",
    level: "storm-like",
    sentence: "The particle stream is very fast – storm-grade if the magnetic gate turns southward and holds.",
    source: SPEED_SOURCE,
  };
}

/** Kp bands: 0–2 calm, 3–5 active, 6–9 storm-like (Tips on Viewing the Aurora). */
export function kpIntervalText(kp: number | null): IntervalText | NoDataText {
  if (kp === null) return noData();
  if (kp < 3) {
    return {
      key: "kp-calm",
      level: "calm",
      sentence: "Aurora intensity is currently low, so any glow may stay far north and faint.",
      source: KP_SOURCE,
    };
  }
  if (kp < 6) {
    return {
      key: "kp-active",
      level: "active",
      sentence: "Aurora is possible now, brighter and moving – it can be quite pleasing from the right place.",
      source: KP_SOURCE,
    };
  }
  return {
    key: "kp-storm",
    level: "storm-like",
    sentence: "A strong display is possible, reaching farther south than usual; far-south viewers mostly get red, not green.",
    source: KP_SOURCE,
  };
}

/** The shared honest missing-data copy for every row ("no data", never zero). */
function noData(): NoDataText {
  return {
    level: "no-data",
    key: "no-data",
    sentence: "No data right now.",
    source: "",
  };
}

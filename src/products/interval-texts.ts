/**
 * Interval-text tables for the plain-language summary in the Aurora Now
 * panel (Home). Two rows – live Kp index, and one merged L1 sentence
 * covering the solar-wind stream's speed AND density plus the magnetic
 * field's direction together (human decisions 2026-09-13: the field
 * decides what speed means, so one sentence carries all three instead of
 * repeating the field across two rows; density rides along as a bonus
 * adjective, verdict keywords like "fast"/"dense" carry a good/bad
 * polarity for keyword highlighting, and `overallWord` names each
 * selector option's verdict on a five-word ladder) – each mapping live
 * values to one of
 * three plain levels plus one concise honest sentence and its mapping
 * source. Pure data over the existing product hooks: no fetching, no
 * component state, null values read as "no data" and never as zero or a
 * level. Hemispheric power was dropped from the summary (human decision
 * 2026-09-12: it is the OVATION synthesis of the same L1 inputs the
 * other rows already show) and stays expert-only in the Magnetosphere
 * panel.
 *
 * Shape per the human decision of 2026-09-12: the summary renders ONE
 * merged paragraph (one short sentence per row), so the earlier P1/P2
 * drafting variants and per-row cards are gone. The SWPC caveats
 * (approximate averages, geomagnetic latitude) live in the summary's
 * source data via the source keys, not in shipped copy.
 *
 * Honesty bounds per `docs/research/plain-language-honesty-2026-09-12.md`
 * (the 12-item NO-GO list is normative): every line carries likelihood
 * ("possible / can / favors", never "will"); no tonight claims (N5 – a
 * 3-hour Kp block cannot ground one); no color promises (N4); planetary
 * Kp never conflated with the local oval (N9); no Kp outcome from a
 * magnetic-field band (N1); speed never decides alone (N2 – now
 * structural: the direction rides in the same sentence, and a northward
 * field caps the level at active no matter how fast the stream); the
 * word "conditions" never appears for 1-min L1 readings (N12). Gate
 * jargon ("magnetic gate", "open wide", "northward") left shipped copy
 * in the 2026-09-13 rewording – the field's direction is described as
 * "the right way / the wrong way for aurora"; the gate framing survives
 * only in the expert Bz card.
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
  /**
   * Verdict keywords to highlight, as exact substrings of the sentence
   * (empty for rows with no verdict words, e.g. the Kp lines).
   */
  marks?: SentenceMark[];
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
const L1_SOURCE =
  "NOAA SWPC, Solar Wind (phenomena page); NOAA SWPC, Geomagnetic Storms (phenomena page)";

/**
 * The solar-wind stream's speed, in plain words (SWPC Solar Wind page):
 * slow < 400 km/s is the common equatorial state; 400–800 covers elevated
 * through coronal-hole fast streams; 700+ is event-grade (a G2 alert rode
 * on winds > 700 km/s).
 */
type SpeedBand = "slow" | "fast" | "very-fast";

/**
 * The stream's density (SWPC Solar Wind page + honesty inventory S2):
 * single digits p/cm³ is the typical quiet baseline; tens elevated; 40+
 * very dense  –  "storm fuel" only together with speed and a southward
 * field (N2: density never decides alone). The band labels are an
 * in-app convention (no NOAA per-band wording exists)  –  kept to two
 * honest steps to avoid inventing precision: light (< 10 p/cm³) and
 * dense (>= 10).
 */
type DensityBand = "light" | "dense";

/**
 * The magnetic field's direction, in plain words (SWPC Geomagnetic Storms
 * page): northward Bz points the wrong way for aurora; southward Bz
 * couples energy in, with the storm only when strong southward driving is
 * SUSTAINED for hours (1-min readings flicker – duration beats instant
 * value).
 */
type FieldBand = "wrong-way" | "weakly-right" | "strongly-right";

/**
 * A verdict keyword with its plain polarity: the summary highlights these
 * in the palette's good/bad colors (color reinforces the word, never
 * replaces it  –  the word stays for screen readers and color-blind
 * users).
 */
export interface SentenceMark {
  /** The keyword substring, exactly as it appears in the sentence. */
  text: string;
  /** Good (lime accent) or bad (orange)  –  the palette's two verdict hues. */
  polarity: "good" | "bad";
}

const SPEED_CLAUSE: Record<SpeedBand, { text: string; mark: SentenceMark }> = {
  slow: {
    text: "The particle stream from the Sun is running slow",
    mark: { text: "slow", polarity: "bad" },
  },
  fast: {
    text: "The particle stream from the Sun is running fast",
    mark: { text: "fast", polarity: "good" },
  },
  "very-fast": {
    text: "The particle stream from the Sun is running very fast",
    mark: { text: "very fast", polarity: "good" },
  },
};

const DENSITY_CLAUSE: Record<
  DensityBand,
  { text: string; mark: SentenceMark }
> = {
  light: {
    text: " and thin. ",
    mark: { text: "thin", polarity: "bad" },
  },
  dense: {
    text: " and dense. ",
    mark: { text: "dense", polarity: "good" },
  },
};

const FIELD_CLAUSE: Record<FieldBand, { text: string; mark: SentenceMark }> = {
  "wrong-way": {
    text: "The magnetic field is pointed the wrong way for aurora and holds the energy back.",
    mark: { text: "wrong way", polarity: "bad" },
  },
  "weakly-right": {
    text: "The magnetic field leans weakly toward aurora.",
    mark: { text: "weakly", polarity: "good" },
  },
  "strongly-right": {
    text: "The magnetic field is pointed the right way for aurora and pushing hard.",
    mark: { text: "right way", polarity: "good" },
  },
};

function speedBand(speed: number): SpeedBand {
  if (speed < 400) return "slow";
  if (speed < 700) return "fast";
  return "very-fast";
}

function densityBand(density: number): DensityBand {
  return density >= 10 ? "dense" : "light";
}

function fieldBand(bz: number): FieldBand {
  if (bz > 0) return "wrong-way";
  if (bz > -10) return "weakly-right";
  return "strongly-right";
}

/**
 * The merged L1 sentence: solar-wind speed, density AND the magnetic
 * field's direction in one line, because together they decide what the
 * stream means (N2). Density is a bonus adjective on the speed clause  –
 * a thin stream reads " and thin" (light fuel, never a verdict beyond
 * that), a dense one " and dense" (storm fuel). The level is the
 * sentence's honest severity: a northward field caps the level at active
 * however fast the stream runs; only a southward field (or a very fast
 * stream leaning southward) reaches storm-like. Any input missing reads
 * the honest "no data" row  –  never a half sentence, never zero.
 */
export function l1IntervalText(
  speed: number | null,
  bz: number | null,
  density: number | null,
): IntervalText | NoDataText {
  if (speed === null || bz === null || density === null) return noData();
  const speedB = speedBand(speed);
  const densityB = densityBand(density);
  const fieldB = fieldBand(bz);
  let level: Exclude<InterpreterLevel, "no-data">;
  if (fieldB === "wrong-way") {
    level = speedB === "slow" ? "calm" : "active";
  } else if (fieldB === "weakly-right") {
    level = speedB === "very-fast" ? "storm-like" : "active";
  } else {
    level = "storm-like";
  }
  const parts = [
    SPEED_CLAUSE[speedB],
    DENSITY_CLAUSE[densityB],
    FIELD_CLAUSE[fieldB],
  ];
  return {
    key: `l1-${level}`,
    level,
    sentence: parts.map((part) => part.text).join(""),
    source: L1_SOURCE,
    marks: parts.map((part) => part.mark),
  };
}

/** Kp bands: 0–2 calm, 3–5 active, 6–9 storm-like (Tips on Viewing the Aurora). */
export function kpIntervalText(kp: number | null): IntervalText | NoDataText {
  if (kp === null) return noData();
  if (kp < 3) {
    return {
      key: "kp-calm",
      level: "calm",
      sentence:
        "Aurora intensity is currently low, so any glow may stay far north and faint.",
      source: KP_SOURCE,
      marks: [{ text: "low", polarity: "bad" }],
    };
  }
  if (kp < 6) {
    return {
      key: "kp-active",
      level: "active",
      sentence:
        "Aurora is possible now, brighter and moving – enjoyable from the right place.",
      source: KP_SOURCE,
      marks: [{ text: "possible", polarity: "good" }],
    };
  }
  return {
    key: "kp-storm",
    level: "storm-like",
    sentence:
      "Strong aurora is possible, reaching farther south than usual. (Far-south viewers mostly get red, not green.)",
    source: KP_SOURCE,
    marks: [{ text: "Strong", polarity: "good" }],
  };
}

/**
 * The summary's one-word overall verdict, shown next to each time-ahead
 * option ("In 15 min – moderate"). Five steps on a Kp-flavored ladder
 * (human decision 2026-09-13): inactive / faint / moderate / strong /
 * intense. The word is the STRONGEST driver, never an average – an
 * average could mask a storm-grade input behind calm companions (Kp 7 +
 * calm wind must not read "moderate"). Kp carries the planetary
 * intensity (its G-scale grade is the ladder's spine); the L1 side
 * grades the FIELD's coupling finely (wrong-way → inactive/faint,
 * weakly-right → faint/moderate, strongly-right → moderate+), so a slow,
 * thin, weakly-leaning stream reads faint, not moderate – the coarse
 * 3-step L1 level would inflate it. Density never lifts the word (N2 –
 * it is descriptive fuel, not a driver); a very fast stream can lift it
 * one step, because speed is a real coupling driver. No-data inputs
 * never lower the word silently: the selector option itself disappears
 * when a feed is missing (the summary's pending rule), so the word only
 * ever renders with all three readings present.
 */
export type OverallWord =
  | "inactive"
  | "faint"
  | "moderate"
  | "strong"
  | "intense";

export function overallWord(
  kp: number | null,
  l1Level: OverallWord | null,
): OverallWord | null {
  if (kp === null && l1Level === null) return null;
  const kpWord: OverallWord | null =
    kp === null
      ? null
      : kp < 2
        ? "inactive"
        : kp < 4
          ? "faint"
          : kp < 5
            ? "moderate"
            : kp < 6
              ? "strong"
              : "intense";
  const rank = (word: OverallWord | null) =>
    word === null ? -1 : OVERALL_WORDS.indexOf(word);
  return rank(kpWord) >= rank(l1Level) ? kpWord : l1Level;
}

/**
 * The L1 side of the verdict word, graded from the FINER bands instead of
 * the coarse 3-step level: the field's direction sets the base rung
 * (wrong-way = inactive, weakly-right = faint, strongly-right =
 * moderate), speed lifts it one rung per band step, and density is
 * ignored (N2 – descriptive, never a driver). Capped at strong: the word
 * reserves "intense" for Kp 6+ (a planetary 3-hour grade no 1-min
 * snapshot can claim).
 */
export function l1Word(
  speed: number | null,
  bz: number | null,
): OverallWord | null {
  if (speed === null || bz === null) return null;
  const base: OverallWord =
    fieldBand(bz) === "wrong-way"
      ? "inactive"
      : fieldBand(bz) === "weakly-right"
        ? "faint"
        : "moderate";
  const lift = speed < 400 ? 0 : speed < 700 ? 1 : 2;
  const rank = Math.min(
    OVERALL_WORDS.indexOf("strong"),
    OVERALL_WORDS.indexOf(base) + lift,
  );
  return OVERALL_WORDS[rank];
}

/** The ladder in ascending order – the rank lookup for the max rule. */
const OVERALL_WORDS: OverallWord[] = [
  "inactive",
  "faint",
  "moderate",
  "strong",
  "intense",
];

/** The shared honest missing-data copy for every row ("no data", never zero). */
function noData(): NoDataText {
  return {
    level: "no-data",
    key: "no-data",
    sentence: "No data right now.",
    source: "",
  };
}

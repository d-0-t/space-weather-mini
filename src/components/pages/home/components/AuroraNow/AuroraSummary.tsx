import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import "./AuroraSummary.scss";
import {
  kpIntervalText,
  l1IntervalText,
  l1Word,
  moonWashoutText,
  overallWord,
  viewDistanceText,
  type IntervalText,
  type NoDataText,
  type SentenceMark,
} from "../../../../../products/interval-texts";
import {
  formatAge,
  formatShort,
  parseTimeTag,
} from "../../../../../products/display-time";
import {
  distanceToNearestAurora,
  loadViewDistanceThreshold,
} from "../../../../../products/view-distance";
import {
  addMinutes,
  averagedValueAt,
  transitMinutes,
} from "../live-panels/live-panels";
import { useDisplayTimezone } from "../../../../DisplayTimezone/DisplayTimezoneContext";
import { isMoonAboveHorizon } from "../../../../../data/moon";
import { moonIllumination } from "../../../../moon/moon";
import { useGeocodedPlace } from "../../../../PlaceFinder/useGeocodedPlace";
import { fetchMagField, fetchWind } from "../SolarWind/SolarWind";
import { fetchKpObserved } from "../kp-panel/kp-panel";
import { useOvationQuery } from "./useOvationQuery";
import {
  STALE_DATA_NOTICE,
  liveDataState,
  useIsOffline,
} from "../offline/offline";

/**
 * The time-ahead offsets offered by the selector, in minutes. "0" is the
 * reading arriving at Earth now (the expert card's Now line); the largest
 * offset is the freshest measurement, still `transit` minutes from Earth
 * – no measured reading arrives later than that.
 */
const OFFSET_STEPS = [15, 30] as const;

/**
 * Splits a sentence into plain and highlighted runs by its marks. Marks
 * are exact substrings; each renders as a good/bad span so color
 * reinforces the word (the word itself stays for screen readers and
 * color-blind users). A mark not found in its sentence would silently
 * drop its highlight, so the tests pin every mark against its sentence.
 */
const MarkedSentence: React.FC<{ text: string; marks?: SentenceMark[] }> = ({
  text,
  marks,
}) => {
  if (!marks || marks.length === 0) return <>{text}</>;
  const spans: React.ReactNode[] = [];
  let cursor = 0;
  for (const mark of marks) {
    const at = text.indexOf(mark.text, cursor);
    if (at < 0) continue;
    if (at > cursor) spans.push(text.slice(cursor, at));
    spans.push(
      <span
        key={`${mark.text}-${at}`}
        className={
          mark.polarity === "good"
            ? "aurora-now__summary__mark--good"
            : "aurora-now__summary__mark--bad"
        }
      >
        {mark.text}
      </span>,
    );
    cursor = at + mark.text.length;
  }
  if (cursor < text.length) spans.push(text.slice(cursor));
  return <>{spans}</>;
};

/**
 * The Summary Dashboard panel's plain-language summary: ONE concise paragraph
 * summing up the live Kp index plus one merged L1 sentence covering the
 * solar-wind stream AND the magnetic field together (hemispheric power
 * stays expert-only in the Magnetosphere panel – it is the OVATION
 * synthesis of the same L1 inputs; the two L1 readings share one sentence
 * per the 2026-09-13 human decision). The L1 half follows the time-ahead
 * selector: "now" is the reading arriving at Earth, the offsets pick
 * measured readings still propagating here; displayed values are 5-minute
 * averages, never single 1-min readings. It ends with two extra sentences:
 * the Moon wash-out caveat (only while the Moon is up and lit enough to
 * matter) and the stored place's View distance reach, then one link to the
 * Aurora guide read-through. The paragraph is
 * always fully open; a feed that hasn't landed yet leaves its sentence out
 * (never a mid-paragraph loading/error line), and one that failed for good
 * reads the honest "No data right now." Shares the expert panels' query
 * keys, so each feed is still fetched exactly once.
 */
const AuroraSummary: React.FC = () => {
  const offline = useIsOffline();
  const { displayTimezone } = useDisplayTimezone();
  const [offsetMinutes, setOffsetMinutes] = useState(0);
  const windQuery = useQuery({
    queryKey: ["rtsw-wind", "live"],
    queryFn: fetchWind,
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: false,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const magQuery = useQuery({
    queryKey: ["rtsw-mag-field", "live"],
    queryFn: fetchMagField,
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: false,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const observedQuery = useQuery({
    queryKey: ["planetary-k-index", "live"],
    queryFn: fetchKpObserved,
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: false,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const { place } = useGeocodedPlace();
  // The chaser-set threshold is read once per mount (the View distance line's
  // discipline); the Oval grid query is shared with the map and band line.
  const [threshold] = useState(() => loadViewDistanceThreshold(localStorage));
  const ovalQuery = useOvationQuery();

  const windRows = (windQuery.data ?? []).map((p) => ({
    time_tag: p.time_tag,
    value: p.speed,
  }));
  const densityRows = (windQuery.data ?? []).map((p) => ({
    time_tag: p.time_tag,
    value: p.density,
  }));
  const magRows = (magQuery.data ?? []).map((p) => ({
    time_tag: p.time_tag,
    value: p.bz_gsm,
  }));
  const latestWind = windRows.length > 0 ? windRows[windRows.length - 1] : null;
  const latestMag = magRows.length > 0 ? magRows[magRows.length - 1] : null;
  const latestObserved =
    observedQuery.data && observedQuery.data.length > 0
      ? observedQuery.data[observedQuery.data.length - 1]
      : null;

  // The two extra interpreter sentences: the Moon wash-out caveat (only while
  // the Moon is up and lit enough to matter) and the View distance reach for
  // the stored place. Both are omitted when their data has not landed.
  const now = new Date();
  const ovalProduct = ovalQuery.data ?? null;
  const viewDistance = useMemo(
    () =>
      ovalProduct
        ? distanceToNearestAurora(place, ovalProduct.coordinates, threshold)
        : null,
    [place, ovalProduct, threshold],
  );
  const moonText = moonWashoutText(
    isMoonAboveHorizon(place.latitude, place.longitude, now),
    moonIllumination(now),
  );
  const reachText = viewDistance ? viewDistanceText(viewDistance) : null;

  // The selector's horizon: the freshest L1 measurement is `transit`
  // minutes from Earth, so no offset beyond it has a measured reading.
  const transit = latestWind ? transitMinutes(latestWind.value) : 0;
  const offsets = [
    0,
    ...OFFSET_STEPS.filter((step) => transit > step),
    ...(transit > 0 ? [transit] : []),
  ];

  // The L1 reading for the chosen offset: the value arriving at Earth
  // `offsetMinutes` from now sits `transit - offsetMinutes` behind the
  // freshest measurement on the feed's timeline – averaged over 5 minutes
  // around that instant (the 1-min feed bursts and flickers).
  const selectedWind =
    latestWind && latestWind.value !== null
      ? averagedValueAt(
          windRows,
          addMinutes(latestWind.time_tag, offsetMinutes - transit),
        )
      : { value: null, timeTag: null };
  const selectedMag =
    latestMag && latestMag.value !== null
      ? averagedValueAt(
          magRows,
          addMinutes(latestMag.time_tag, offsetMinutes - transit),
        )
      : { value: null, timeTag: null };
  // Same 5-minute-average rule as speed: the density adjective reads the
  // same instant the speed clause reads (both ride the rtsw-wind feed,
  // one fetch). No wind feed → no density reading either.
  const selectedDensity =
    latestWind && latestWind.value !== null
      ? averagedValueAt(
          densityRows,
          addMinutes(latestWind.time_tag, offsetMinutes - transit),
        )
      : { value: null, timeTag: null };

  const l1Text: IntervalText | NoDataText = l1IntervalText(
    selectedWind.value,
    selectedMag.value,
    selectedDensity.value,
  );
  const kpText: IntervalText | NoDataText = kpIntervalText(
    latestObserved ? latestObserved.Kp : null,
  );

  // One-word verdict per selector option: the strongest driver's word on
  // the inactive→intense ladder, computed per offset from THAT offset's
  // L1 readings – graded finely (field direction base rung, speed lift,
  // density ignored) so a slow, thin, weakly-leaning stream reads faint,
  // not the coarse level's "moderate". The Kp readout is planetary and
  // stays put. An option whose L1 reading is missing carries no word –
  // never a guessed one.
  const optionWord = (offset: number): string | null => {
    const wordAt = (
      wind: number | null,
      mag: number | null,
      dens: number | null,
    ) => {
      const l1 = l1IntervalText(wind, mag, dens);
      if (l1.level === "no-data") return null;
      const windWord = l1Word(wind, mag);
      return overallWord(latestObserved ? latestObserved.Kp : null, windWord);
    };
    if (offset === offsetMinutes) {
      const word = wordAt(
        selectedWind.value,
        selectedMag.value,
        selectedDensity.value,
      );
      return word;
    }
    const windAt = averagedValueAt(
      windRows,
      addMinutes(latestWind?.time_tag ?? "", offset - transit),
    );
    const magAt = averagedValueAt(
      magRows,
      addMinutes(latestMag?.time_tag ?? "", offset - transit),
    );
    const densAt = averagedValueAt(
      densityRows,
      addMinutes(latestWind?.time_tag ?? "", offset - transit),
    );
    return wordAt(windAt.value, magAt.value, densAt.value);
  };

  const pending = (query: { isPending: boolean; data?: unknown }) =>
    query.isPending && !query.data;
  const stale = (query: { isError: boolean; data?: unknown }) =>
    liveDataState(query, offline) === "stale";

  const anyStale = [stale(windQuery), stale(magQuery)].some((state) => state);

  // One As-of line for the summary's own claims: the real update time of
  // its two L1 feeds – the oldest of their FRESHEST readings. It never
  // moves with the time-ahead selector (that selector picks which
  // measured reading the merged L1 sentence reads; the feed's update
  // time is one fact). The Kp block's freshness is the panel's own As-of
  // line under the Kp readout – never duplicated here.
  const asOfCandidates = [latestWind?.time_tag, latestMag?.time_tag].filter(
    (tag): tag is string => typeof tag === "string",
  );
  const asOf =
    asOfCandidates.length > 0
      ? asOfCandidates.reduce((oldest, tag) =>
          parseTimeTag(tag) < parseTimeTag(oldest) ? tag : oldest,
        )
      : null;

  return (
    <div className="aurora-now__summary">
      {anyStale ? (
        <p className="live-panel__warning" aria-live="polite">
          {STALE_DATA_NOTICE}
        </p>
      ) : null}
      {offsets.length > 1 ? (
        <label className="aurora-now__summary__offset">
          <span className="aurora-now__summary__offset-label">Time</span>
          <select
            value={String(offsetMinutes)}
            onChange={(event) => setOffsetMinutes(Number(event.target.value))}
          >
            {offsets.map((offset) => {
              const word = optionWord(offset);
              const label =
                offset === 0
                  ? "Now"
                  : offset === transit
                    ? `In ${offset} min (latest)`
                    : `In ${offset} min`;
              return (
                <option key={offset} value={String(offset)}>
                  {word ? `${label} – ${word}` : label}
                </option>
              );
            })}
          </select>
        </label>
      ) : null}
      <p className="aurora-now__summary__text">
        {[
          {
            key: kpText.key,
            sentence: kpText.sentence,
            marks: kpText.level === "no-data" ? undefined : kpText.marks,
            loading: pending(observedQuery),
          },
          {
            key: l1Text.key,
            sentence: l1Text.sentence,
            marks: l1Text.level === "no-data" ? undefined : l1Text.marks,
            loading: pending(windQuery) || pending(magQuery),
          },
          ...(moonText
            ? [
                {
                  key: "moon-washout",
                  sentence: moonText,
                  marks: undefined,
                  loading: false,
                },
              ]
            : []),
          ...(reachText
            ? [
                {
                  key: "view-distance",
                  sentence: reachText,
                  marks: undefined,
                  loading: false,
                },
              ]
            : []),
        ]
          .filter((part) => !part.loading)
          .map((part, index) => (
            <span key={part.key}>
              {index > 0 ? " " : null}
              <MarkedSentence text={part.sentence} marks={part.marks} />
            </span>
          ))}
      </p>
      {asOf ? (
        <p className="live-panel__fresh">
          As of {formatShort(asOf, displayTimezone)}. Updated {formatAge(asOf)}.
        </p>
      ) : null}
      {/* One path from the quick check to the full read-through (ticket 09):
          the Aurora guide, at the end of the summary so nothing interrupts
          the live claims. */}
      <p className="aurora-now__summary__guide">
        <Link to="/about/guide">Read aurora guide →</Link>
      </p>
    </div>
  );
};

export default AuroraSummary;

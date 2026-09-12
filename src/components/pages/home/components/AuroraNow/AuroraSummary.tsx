import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import "./AuroraSummary.scss";
import {
  bzIntervalText,
  kpIntervalText,
  speedIntervalText,
  type IntervalText,
  type NoDataText,
} from "../../../../../products/interval-texts";
import {
  formatAge,
  formatShort,
  parseTimeTag,
} from "../../../../../products/display-time";
import {
  addMinutes,
  averagedValueAt,
  transitMinutes,
} from "../live-panels/live-panels";
import { useDisplayTimezone } from "../../../../DisplayTimezone/DisplayTimezoneContext";
import { fetchMagField, fetchWind } from "../SolarWind/SolarWind";
import { fetchKpObserved } from "../kp-panel/kp-panel";
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
 * The Aurora Now panel's plain-language summary: ONE concise paragraph
 * summing up the live Kp index, the solar-wind stream and the magnetic
 * gate (hemispheric power stays expert-only in the Magnetosphere panel –
 * it is the OVATION synthesis of the same L1 inputs). The L1 half follows
 * the time-ahead selector: "now" is the reading arriving at Earth, the
 * offsets pick measured readings still propagating here; displayed values
 * are 5-minute averages, never single 1-min readings. The paragraph is
 * always fully open; a feed that hasn't landed yet leaves its sentence
 * out (never a mid-paragraph loading/error line), and one that failed for
 * good reads the honest "No data right now." Shares the expert panels'
 * query keys, so each feed is still fetched exactly once.
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

  const windRows = (windQuery.data ?? []).map((p) => ({
    time_tag: p.time_tag,
    value: p.speed,
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

  const speedText: IntervalText | NoDataText = speedIntervalText(
    selectedWind.value,
  );
  const bzText: IntervalText | NoDataText = bzIntervalText(selectedMag.value);
  const kpText: IntervalText | NoDataText = kpIntervalText(
    latestObserved ? latestObserved.Kp : null,
  );

  const pending = (query: { isPending: boolean; data?: unknown }) =>
    query.isPending && !query.data;
  const stale = (query: { isError: boolean; data?: unknown }) =>
    liveDataState(query, offline) === "stale";

  const anyStale = [stale(windQuery), stale(magQuery)].some((state) => state);

  // One As-of line for the summary's own claims: the real update time of
  // its two L1 feeds – the oldest of their FRESHEST readings. It never
  // moves with the time-ahead selector (that selector picks which
  // measured reading the sentences read; the feed's update time is one
  // fact). The Kp block's freshness is the panel's own As-of line under
  // the Kp readout – never duplicated here.
  const asOfCandidates = [
    latestWind?.time_tag,
    latestMag?.time_tag,
  ].filter((tag): tag is string => typeof tag === "string");
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
          <h3>Summary</h3>
          <select
            value={String(offsetMinutes)}
            onChange={(event) => setOffsetMinutes(Number(event.target.value))}
          >
            {offsets.map((offset) => (
              <option key={offset} value={String(offset)}>
                {offset === 0
                  ? "Arriving now"
                  : offset === transit
                    ? `In ${offset} min (latest)`
                    : `In ${offset} min`}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <p className="aurora-now__summary__text">
        {[
          { text: kpText, loading: pending(observedQuery) },
          { text: speedText, loading: pending(windQuery) },
          { text: bzText, loading: pending(magQuery) },
        ]
          .filter((part) => !part.loading)
          .map((part, index) => (
            <span key={part.text.key}>
              {index > 0 ? " " : null}
              {part.text.sentence}
            </span>
          ))}
      </p>
      {asOf ? (
        <p className="live-panel__fresh">
          As of {formatShort(asOf, displayTimezone)}. Updated {formatAge(asOf)}.
        </p>
      ) : null}
    </div>
  );
};

export default AuroraSummary;

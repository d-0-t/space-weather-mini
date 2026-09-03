import { useQuery } from "@tanstack/react-query";

import {
  parseRtswWind,
  parseRtswMagField,
  RTSW_WIND_URL,
  RTSW_MAG_FIELD_URL,
} from "../../../../../products/solar-wind";
import { formatAge } from "../../../../../products/live-helpers";
import { severityColor } from "../../../../../styles/severity";
import { SOURCES } from "../../../../sources";
import { SourceAttribution } from "../../../../sources";
import {
  BEFORE_NOW_MINUTES,
  SMOOTHING,
  SparklineCard,
  addMinutes,
  chartTimeLabel,
  latestValue,
  smoothPoints,
  transitMinutes,
  valueAt,
} from "../live-panels/live-panels";
import CollapsiblePanel from "../../../../CollapsiblePanel/CollapsiblePanel";
import {
  COULDNT_LOAD_COPY,
  liveDataState,
  useIsOffline,
} from "../offline/offline";

const fetchWind = async () => {
  const response = await fetch(RTSW_WIND_URL);
  if (!response.ok) throw new Error(`NOAA returned ${response.status}`);
  return parseRtswWind(await response.text());
};

const fetchMagField = async () => {
  const response = await fetch(RTSW_MAG_FIELD_URL);
  if (!response.ok) throw new Error(`NOAA returned ${response.status}`);
  return parseRtswMagField(await response.text());
};

/** Solar Wind – live L1 solar wind speed, density and IMF (Bt, Bz). */
const SolarWind: React.FC = () => {
  const offline = useIsOffline();
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

  const wind = windQuery.data;
  const mag = magQuery.data;

  if (windQuery.isPending && !wind) {
    return (
      <article className="live-panel solar-wind" aria-busy="true">
        <CollapsiblePanel heading={<h2>Solar Wind</h2>} bodyId="solar-wind-panel-body">
          <p>Loading solar wind…</p>
        </CollapsiblePanel>
      </article>
    );
  }
  if ((windQuery.isError && !wind) || (magQuery.isError && !mag)) {
    return (
      <article className="live-panel solar-wind">
        <CollapsiblePanel heading={<h2>Solar Wind</h2>} bodyId="solar-wind-panel-body">
          <p>{COULDNT_LOAD_COPY}</p>
        </CollapsiblePanel>
      </article>
    );
  }
  if (!wind || !mag) return null;

  const speedRows = wind.map((p) => ({ time_tag: p.time_tag, value: p.speed }));
  const densityRows = wind.map((p) => ({
    time_tag: p.time_tag,
    value: p.density,
  }));
  const btRows = mag.map((p) => ({ time_tag: p.time_tag, value: p.bt }));
  const bzRows = mag.map((p) => ({ time_tag: p.time_tag, value: p.bz_gsm }));

  const speed = latestValue(speedRows);
  const density = latestValue(densityRows);
  const bt = latestValue(btRows);
  const bz = latestValue(bzRows);

  // "Now" on the L1 charts = the reading that is arriving at Earth right now:
  // the freshest measurement minus the L1→Earth propagation delay. The chart
  // shows BEFORE_NOW_MINUTES of data before it plus every fresher reading.
  const transit = transitMinutes(speed.value);
  const latestSource = [...wind]
    .reverse()
    .find((p) => p.speed !== null)?.source;
  const windNowTag = addMinutes(speed.timeTag ?? "", -transit);
  const magNowTag = addMinutes(bt.timeTag ?? "", -transit);
  const windNowLabel = chartTimeLabel(windNowTag);
  const magNowLabel = chartTimeLabel(magNowTag);
  const l1Window = BEFORE_NOW_MINUTES + transit;
  const l1AnchorOffset = Math.round(transit / SMOOTHING.solarWind);

  // Headline values show the reading closest to "Now" (arriving at Earth now),
  // not the freshest measurement (still propagating to Earth). The freshness
  // line instead tracks the feed's freshest reading – when it was updated.
  const speedNow = valueAt(speedRows, windNowTag);
  const densityNow = valueAt(densityRows, windNowTag);
  const btNow = valueAt(btRows, magNowTag);
  const bzNow = valueAt(bzRows, magNowTag);

  const state = (query: { isError: boolean; data?: unknown }) =>
    liveDataState(query, offline);

  return (
    <article className="live-panel solar-wind">
      <CollapsiblePanel heading={<h2>Solar Wind</h2>} bodyId="solar-wind-panel-body">
      {transit > 0 ? (
        <p className="live-panel__explain">
          We are {transit} minutes behind{" "}
          {latestSource ? `${latestSource}'s` : "the L1 spacecraft's"} data,
          based on solar wind speed.
        </p>
      ) : null}
      <div className="live-panel__grid">
        <SparklineCard
          title="Speed"
          value={speedNow.value !== null ? speedNow.value.toFixed(0) : "–"}
          note="km/s"
          unit="km/s"
          help={{
            label: "About solar wind",
            rows: [
              ["< 400 km/s", "normal"],
              ["400 km/s", "elevated"],
              ["500 km/s", "moderate"],
              ["700 km/s", "high"],
              ["900 km/s", "very high"],
            ],
            text: "Solar wind speed – how fast the stream of charged particles from the Sun flows past Earth. Faster wind, especially 500+ km/s, compresses Earth's magnetic field and can trigger aurora.",
          }}
          asOf={speed.timeTag ?? "–"}
          updated={speed.timeTag ? formatAge(speed.timeTag) : "–"}
          points={smoothPoints(speedRows, l1Window, SMOOTHING.solarWind)}
          nowLabel={windNowLabel}
          anchorOffset={l1AnchorOffset}
          accent="greenyellow"
          colorBy={(v) => severityColor("speed", v)}
          ariaLabel="Solar wind speed, km/s, 2 hours before Now plus upcoming"
          state={state(windQuery)}
        />
        <SparklineCard
          title="Particle density"
          value={densityNow.value !== null ? densityNow.value.toFixed(1) : "–"}
          note="p/cm³"
          unit="p/cm³"
          help={{
            label: "About particle density",
            rows: [
              ["1-10 p/cm³", "low"],
              ["10-20 p/cm³", "moderate"],
              ["40+ p/cm³", "high"],
              ["60+ p/cm³", "very high"],
            ],
            text: "Particle density – how many protons per cubic centimetre the solar wind carries. Denser wind pushes harder against Earth's magnetic field, and combined with high speed it makes storms more likely.",
          }}
          asOf={density.timeTag ?? "–"}
          updated={density.timeTag ? formatAge(density.timeTag) : "–"}
          points={smoothPoints(densityRows, l1Window, SMOOTHING.solarWind)}
          nowLabel={windNowLabel}
          anchorOffset={l1AnchorOffset}
          accent="cyan"
          colorBy={(v) => severityColor("density", v)}
          ariaLabel="Proton density, p per cubic cm, 2 hours before Now plus upcoming"
          state={state(windQuery)}
        />
        <SparklineCard
          title="Bt"
          unit="nT"
          help={{
            label: "About Bt",
            rows: [
              ["< 5 nT", "quiet"],
              ["5-15 nT", "elevated"],
              ["15-30 nT", "strong"],
              ["30+ nT", "very strong"],
            ],
            text: "Interplanetary magnetic field (IMF), Bt component – the total strength of the Sun's magnetic field carried by the solar wind. Higher Bt means more energy is available to drive geomagnetic activity.",
          }}
          value={btNow.value !== null ? btNow.value.toFixed(1) : "–"}
          note="nT"
          asOf={bt.timeTag ?? "–"}
          updated={bt.timeTag ? formatAge(bt.timeTag) : "–"}
          points={smoothPoints(btRows, l1Window, SMOOTHING.solarWind)}
          nowLabel={magNowLabel}
          anchorOffset={l1AnchorOffset}
          accent="plum"
          colorBy={(v) => severityColor("bt", v)}
          ariaLabel="Total magnetic field strength Bt, nT, 2 hours before Now plus upcoming"
          state={state(magQuery)}
        />
        <SparklineCard
          title="Bz"
          unit="nT"
          help={{
            label: "About Bz",
            rows: [
              ["+ (northward)", "quiet"],
              ["- (southward)", "potential"],
              ["0 to −5 nT", "mild"],
              ["−5 to −10 nT", "active (Kp3-4)"],
              ["−10 to −20 nT", "storm (Kp5-7)"],
              ["< −20 nT", "major storm (Kp7+)"],
            ],
            text: "Interplanetary magnetic field (IMF), Bz (GSM) component – the north-south component of the solar wind's magnetic field in GSM coordinates. Southward (negative) Bz reconnects with Earth's magnetic field, coupling energy into the magnetosphere and driving aurora.",
          }}
          value={
            bzNow.value !== null
              ? `${bzNow.value >= 0 ? "+" : ""}${bzNow.value.toFixed(1)}`
              : "–"
          }
          note={
            bzNow.value !== null
              ? `nT (${bzNow.value < 0 ? "South" : "North"})`
              : "nT"
          }
          asOf={bz.timeTag ?? "–"}
          updated={bz.timeTag ? formatAge(bz.timeTag) : "–"}
          points={smoothPoints(bzRows, l1Window, SMOOTHING.solarWind)}
          nowLabel={magNowLabel}
          anchorOffset={l1AnchorOffset}
          accent="orange"
          colorBy={(v) => severityColor("bz", v)}
          ariaLabel="Bz GSM magnetic field, nT, 2 hours before Now plus upcoming, south or north"
          state={state(magQuery)}
        />
      </div>
      <SourceAttribution source={SOURCES.noaaSwpc} />
      </CollapsiblePanel>
    </article>
  );
};

export default SolarWind;

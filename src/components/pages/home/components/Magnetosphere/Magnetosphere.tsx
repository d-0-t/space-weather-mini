import { useQuery } from "@tanstack/react-query";

import {
  parseHemiPower,
  HEMI_POWER_URL,
} from "../../../../../products/hemi-power";
import {
  parseKyotoDst,
  KYOTO_DST_URL,
} from "../../../../../products/kyoto-dst";
import {
  parseBoulderKIndex,
  BOULDER_K_INDEX_URL,
} from "../../../../../products/boulder-k-index";
import { formatAge } from "../../../../../products/live-helpers";
import { SOURCES } from "../../../../sources";
import { SourceAttribution } from "../../../../sources";
import FullSizeModal from "../../../../FullSizeModal";
import {
  ChartHelp,
  DATA_WINDOWS,
  MiniSparkline,
  SMOOTHING,
  SparklineCard,
  formatLocalTime,
  latestValue,
  smoothPoints,
} from "../live-panels/live-panels";
import CollapsiblePanel from "../CollapsiblePanel/CollapsiblePanel";

const KIRUNA_MAGNETOGRAM_URL =
  "https://spaceweather.irf.se/data/irf-kir-mag.png";

const fetchHemiPower = async () => {
  const response = await fetch(HEMI_POWER_URL);
  if (!response.ok) throw new Error(`NOAA returned ${response.status}`);
  return parseHemiPower(await response.text());
};

const fetchDst = async () => {
  const response = await fetch(KYOTO_DST_URL);
  if (!response.ok) throw new Error(`NOAA returned ${response.status}`);
  return parseKyotoDst(await response.text());
};

const fetchBoulder = async () => {
  const response = await fetch(BOULDER_K_INDEX_URL);
  if (!response.ok) throw new Error(`NOAA returned ${response.status}`);
  return parseBoulderKIndex(await response.text());
};

const KirunaMagnetogramCard: React.FC = () => (
  <section className="live-panel__card">
    <div className="live-panel__head">
      <h3>Kiruna magnetometer</h3>
      <ChartHelp
        content={{
          label: "About the Kiruna magnetogram",
          text: "IRF's live magnetogram for Kiruna (68°N, Sweden) plots the X, Y and Z field components in nT over 24 hours. Gentle wiggles are normal. Large swings – especially 100+ nT in the X component – mean substorms are overhead, so bright aurora is likely at high latitudes.",
        }}
      />
    </div>
    <div className="live-panel__panel">
      <FullSizeModal
        label="Kiruna magnetogram, full size"
        triggerClassName="live-panel__image-tile"
        trigger={
          <img
            src={KIRUNA_MAGNETOGRAM_URL}
            alt="Kiruna magnetogram, X Y and Z components in nT over the last 24 hours"
          />
        }
      >
        <img
          src={KIRUNA_MAGNETOGRAM_URL}
          alt="Kiruna magnetogram, X Y and Z components in nT over the last 24 hours"
          className="image-modal__img--invert"
        />
      </FullSizeModal>
    </div>
    <SourceAttribution source={SOURCES.irf} />
  </section>
);

const BoulderMagnetometerCard: React.FC = () => {
  const boulderQuery = useQuery({
    queryKey: ["boulder-k-index", "live"],
    queryFn: fetchBoulder,
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: false,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const boulderRows = (boulderQuery.data ?? []).map((p) => ({
    time_tag: p.time_tag,
    value: p.k_index,
  }));
  const points = smoothPoints(
    boulderRows,
    DATA_WINDOWS.boulder,
    SMOOTHING.boulder,
  );
  const latest = latestValue(boulderRows);
  const warning =
    boulderQuery.isError && boulderQuery.data
      ? "⚠ Live data unavailable – showing cache"
      : null;

  return (
    <section className="live-panel__card">
      <div className="live-panel__head">
        <h3>NOAA magnetometer (Boulder)</h3>
        <ChartHelp
          content={{
            label: "About the NOAA magnetometer",
            rows: [
              ["0-2", "quiet"],
              ["3", "unsettled"],
              ["4", "active"],
              ["5+", "minor storm"],
            ],
            text: "NOAA Boulder's local K index (0-9), measured by a ground magnetometer in Colorado. A simple local gauge of how disturbed the magnetic field is around you.",
          }}
        />
      </div>
      {warning ? <p className="live-panel__warning">{warning}</p> : null}
      <p className="live-panel__value">
        K {latest.value !== null ? latest.value.toFixed(1) : "–"}
        <span className="live-panel__note"> (local ground)</span>
      </p>
      {points.length > 1 ? (
        <MiniSparkline
          title="Boulder K index"
          points={points}
          accent="orange"
          unit="K"
          ariaLabel="Boulder magnetometer K index, last 3 hours"
        />
      ) : null}
      <p className="live-panel__fresh">
        Updated {latest.timeTag ? formatAge(latest.timeTag) : "–"} (
        {latest.timeTag ? formatLocalTime(latest.timeTag) : "–"})
      </p>
      <SourceAttribution source={SOURCES.noaaSwpc} />
    </section>
  );
};

/** Magnetosphere – auroral hemispheric power, Dst and ground magnetometers. */
const Magnetosphere: React.FC = () => {
  const hemiQuery = useQuery({
    queryKey: ["hemi-power", "live"],
    queryFn: fetchHemiPower,
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: false,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const dstQuery = useQuery({
    queryKey: ["kyoto-dst", "live"],
    queryFn: fetchDst,
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: false,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const latestHemi = hemiQuery.data?.points[hemiQuery.data.points.length - 1];
  const latestDst = dstQuery.data?.points[dstQuery.data.points.length - 1];

  const stale = (query: { isError: boolean; data?: unknown }) =>
    query.isError && query.data
      ? "⚠ Live data unavailable – showing cache"
      : null;

  return (
    <article className="live-panel magnetosphere">
      <CollapsiblePanel
        heading={<h2>Magnetosphere</h2>}
        bodyId="magnetosphere-panel-body"
      >
      <div className="live-panel__grid">
        <SparklineCard
          title="Hemispheric power"
          value={latestHemi ? String(Math.round(latestHemi.northPowerGW)) : "–"}
          unit="GW"
          valueBlock={
            latestHemi ? (
              <p className="live-panel__hemi">
                <span className="live-panel__hemi__side">
                  <span className="live-panel__hemi__num">
                    {Math.round(latestHemi.northPowerGW)}
                  </span>
                  <span className="live-panel__hemi__unit">GW</span>
                  <span className="live-panel__hemi__dir">North</span>
                </span>
                <span className="live-panel__hemi__side">
                  <span className="live-panel__hemi__num">
                    {Math.round(latestHemi.southPowerGW)}
                  </span>
                  <span className="live-panel__hemi__unit">GW</span>
                  <span className="live-panel__hemi__dir">South</span>
                </span>
              </p>
            ) : undefined
          }
          help={{
            label: "About hemispheric power",
            rows: [
              ["< 10 GW", "quiet"],
              ["15-30 GW", "active"],
              ["30-50 GW", "strong"],
              ["50+ GW", "very strong"],
            ],
            text: "Hemispheric power – the total energy, in gigawatts, the solar wind deposits into the auroral zone of each hemisphere. Higher numbers mean brighter, more widespread aurora.",
          }}
          asOf={latestHemi ? latestHemi.observationTime : "–"}
          updated={
            latestHemi
              ? formatAge(latestHemi.observationTime.replace("_", "T"))
              : "–"
          }
          points={smoothPoints(
            (hemiQuery.data?.points ?? []).map((p) => ({
              time_tag: p.observationTime,
              value: p.northPowerGW,
            })),
            null,
            SMOOTHING.hemi,
          )}
          second={{
            points: smoothPoints(
              (hemiQuery.data?.points ?? []).map((p) => ({
                time_tag: p.observationTime,
                value: p.southPowerGW,
              })),
              null,
              SMOOTHING.hemi,
            ),
            accent: "cyan",
            name: "South hemispheric power",
            invert: true,
          }}
          primaryName="North hemispheric power"
          accent="plum"
          ariaLabel="Hemispheric power, north and south mirrored around zero, all available data, gigawatts"
          warning={stale(hemiQuery)}
          source={SOURCES.noaaSwpc}
        />
        <SparklineCard
          title="Disturbance Storm Time index"
          unit="nT"
          help={{
            label: "About Dst",
            rows: [
              ["0 to −30 nT", "quiet to unsettled"],
              ["−50 to −100 nT", "moderate storm"],
              ["−100 to −200 nT", "strong storm"],
              ["< −200 nT", "severe storm"],
            ],
            text: "Disturbance Storm Time index – how much the ring current has weakened Earth's magnetic field at the equator, in nanotesla. Negative values mean a geomagnetic storm is underway; deeper values mean stronger storms.",
          }}
          value={latestDst ? String(latestDst.dst) : "–"}
          note="nT"
          asOf={latestDst ? latestDst.time_tag : "–"}
          updated={latestDst ? formatAge(latestDst.time_tag) : "–"}
          points={smoothPoints(
            (dstQuery.data?.points ?? []).map((p) => ({
              time_tag: p.time_tag,
              value: p.dst,
            })),
            DATA_WINDOWS.dst,
            SMOOTHING.dst,
          )}
          accent="cyan"
          ariaLabel="Disturbance storm index, last 24 hours, nT"
          warning={stale(dstQuery)}
          source={SOURCES.kyoto}
        />
        <KirunaMagnetogramCard />
        <BoulderMagnetometerCard />
      </div>
      </CollapsiblePanel>
    </article>
  );
};

export default Magnetosphere;
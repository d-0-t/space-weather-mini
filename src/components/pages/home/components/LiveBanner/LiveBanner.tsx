import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Line, LineChart, ResponsiveContainer } from "recharts";

import {
  parseSolarWindMagField,
  parseSolarWindSpeed,
  SOLAR_WIND_MAG_FIELD_URL,
  SOLAR_WIND_SPEED_URL,
} from "../../../../../products/solar-wind";
import {
  parseHemiPower,
  HEMI_POWER_URL,
} from "../../../../../products/hemi-power";
import {
  parseKyotoDst,
  KYOTO_DST_URL,
} from "../../../../../products/kyoto-dst";
import { formatAge } from "../../../../../products/live-helpers";
import { severityColor } from "../../../../../styles/severity";
import GlossaryTerm from "../../../../explainers/GlossaryTerm";

import "./LiveBanner.scss";

const fetchMagField = async () => {
  const response = await fetch(SOLAR_WIND_MAG_FIELD_URL);
  if (!response.ok) throw new Error(`NOAA returned ${response.status}`);
  return parseSolarWindMagField(await response.text());
};

const fetchSpeed = async () => {
  const response = await fetch(SOLAR_WIND_SPEED_URL);
  if (!response.ok) throw new Error(`NOAA returned ${response.status}`);
  return parseSolarWindSpeed(await response.text());
};

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

const LiveBanner: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const magQuery = useQuery({
    queryKey: ["solar-wind-mag", "live"],
    queryFn: fetchMagField,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const speedQuery = useQuery({
    queryKey: ["solar-wind-speed", "live"],
    queryFn: fetchSpeed,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
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

  const mag = magQuery.data;
  const speed = speedQuery.data;
  const hemi = hemiQuery.data;
  const dst = dstQuery.data;

  const isPending =
    (magQuery.isPending && !mag) || (speedQuery.isPending && !speed);
  const isError =
    magQuery.isError ||
    speedQuery.isError ||
    hemiQuery.isError ||
    dstQuery.isError;

  if (isPending) {
    return (
      <article className="live-banner" aria-busy="true">
        <h2>Live Solar Wind &amp; IMF</h2>
        <p>Loading solar wind…</p>
      </article>
    );
  }
  if (!mag || !speed) {
    if (isError) {
      return (
        <article className="live-banner">
          <h2>Live Solar Wind &amp; IMF</h2>
          <p>Couldn&apos;t load solar wind. Please check back later.</p>
        </article>
      );
    }
    return null;
  }

  const bz = mag.bz_gsm;
  const bt = mag.bt;
  const protonSpeed = speed.proton_speed;
  const latestHemi = hemi?.points[hemi.points.length - 1];
  const latestDst = dst?.points[dst.points.length - 1];
  const hemiGW = latestHemi?.northPowerGW ?? null;
  const dstVal = latestDst?.dst ?? null;

  const bzAge = formatAge(mag.time_tag);
  const speedAge = formatAge(speed.time_tag);
  const hemiAge = latestHemi
    ? formatAge(latestHemi.observationTime.replace("_", "T"))
    : "–";
  const dstAge = latestDst ? formatAge(latestDst.time_tag) : "–";

  const bSharp =
    bz < -5 ? "southward – aurora enabler" : bz < 0 ? "southward" : "northward";
  const staleWarning =
    isError && (mag || speed) ? (
      <p aria-live="polite">⚠ Live data unavailable – showing cache</p>
    ) : null;

  return (
    <article className="live-banner">
      <h2>
        Live Solar Wind &amp;{" "}
        <GlossaryTerm termId="interplanetary-magnetic-field">
          Interplanetary magnetic field (IMF)
        </GlossaryTerm>
      </h2>
      <p className="live-banner__pills">
        <span>
          <b>Bz (GSM)</b> {bz} nT ({bSharp})
        </span>{" "}
        · <span>Bt {bt} nT</span> · <span>Speed {protonSpeed} km/s</span> ·{" "}
        <span>Density –</span> ·{" "}
        <span>
          <GlossaryTerm termId="hemispheric-power">
            Hemispheric power
          </GlossaryTerm>{" "}
          {hemiGW ?? "–"} GW
        </span>{" "}
        ·{" "}
        <span>
          <GlossaryTerm termId="dst-index">Dst index</GlossaryTerm>{" "}
          {dstVal ?? "–"} nT
        </span>
      </p>
      <p className="live-banner__freshness">
        Bz As of {mag.time_tag} · Updated {bzAge} · Speed As of {speed.time_tag}{" "}
        · Updated {speedAge} · Hemi As of {latestHemi?.observationTime ?? "–"} ·
        Updated {hemiAge} · Dst As of {latestDst?.time_tag ?? "–"} · Updated{" "}
        {dstAge}
      </p>
      {staleWarning}
      <p className="live-banner__explain">
        Southward <GlossaryTerm termId="bz-gsm">Bz (GSM)</GlossaryTerm> enables
        reconnection and aurora – brightening follows 20–40 min after south
        flip.
      </p>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {expanded ? "Hide details" : "Show 6-hour sparklines"}
      </button>
      {expanded && (
        <div className="live-banner__details">
          <div
            role="img"
            aria-labelledby="live-banner-sparklines-label"
          >
            <p id="live-banner-sparklines-label">
              Bz / Bt / Speed / Hemi / Dst 6-hour sparklines (paired tables
              below)
            </p>
            <ResponsiveContainer width="100%" height={100}>
              <LineChart data={[{ label: mag.time_tag, bz: mag.bz_gsm }]}>
                <Line
                  type="monotone"
                  dataKey="bz"
                  stroke={severityColor("bz", bz)}
                  dot={false}
                  legendType="triangle"
                />
              </LineChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={100}>
              <LineChart data={[{ label: speed.time_tag, speed: protonSpeed }]}>
                <Line
                  type="monotone"
                  dataKey="speed"
                  stroke={severityColor("speed", protonSpeed)}
                  dot={false}
                  legendType="circle"
                />
              </LineChart>
            </ResponsiveContainer>
            {hemi && (
              <ResponsiveContainer width="100%" height={100}>
                <LineChart
                  data={hemi.points.slice(-12).map((p) => ({
                    label: p.observationTime.slice(11),
                    gw: p.northPowerGW,
                  }))}
                >
                  <Line
                    type="monotone"
                    dataKey="gw"
                    stroke={
                      hemiGW !== null
                        ? severityColor("hemi", hemiGW)
                        : "plum"
                    }
                    dot={false}
                    legendType="square"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
            {dst && (
              <ResponsiveContainer width="100%" height={100}>
                <LineChart
                  data={dst.points.slice(-6).map((p) => ({
                    label: p.time_tag.slice(11, 16),
                    dst: p.dst,
                  }))}
                >
                  <Line
                    type="monotone"
                    dataKey="dst"
                    stroke={
                      dstVal !== null ? severityColor("dst", dstVal) : "cyan"
                    }
                    dot={false}
                    legendType="triangle"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </article>
  );
};

export default LiveBanner;

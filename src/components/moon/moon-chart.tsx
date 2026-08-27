import { Line, YAxis } from "recharts";

import {
  getMoonPhase,
  getMoonPhaseAtFraction,
  moonCycleFraction,
  moonEmojiAtMidnight,
  moonIlluminationPercent,
  parseTimeTag,
} from "./moon";

export const MOON_SERIES_NAME = "Moon illumination";

/**
 * Emoji moon marker drawn at midnight points on the moon illumination line.
 * Returns null off-midnight, so only the nightly phase glyphs are rendered.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MoonEmojiDot = (props: any): React.ReactElement | null => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload?.moonEmoji) return null;
  return (
    <text
      x={cx}
      y={cy}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={16}
    >
      {payload.moonEmoji}
    </text>
  );
};

/**
 * Right-axis config for the moon illumination series. Capped at 110 so a full
 * moon (100%) never flattens against the top of the chart like a roof, and
 * floored at -10 so a new moon (0%) clears the X-axis labels below.
 */
export const MoonYAxis: React.FC = () => (
  <YAxis
    yAxisId="moon"
    orientation="right"
    domain={[-10, 110]}
    ticks={[0, 50, 100]}
    tick={{ fill: "var(--color-white)", fontSize: 11 }}
    tickFormatter={(value: number) => `${value}%`}
    width={36}
  />
);

/** Blue moon illumination line on the shared moon axis, with midnight emoji markers. */
export const MoonLine: React.FC = () => (
  <Line
    type="monotone"
    dataKey="moon"
    name={MOON_SERIES_NAME}
    yAxisId="moon"
    stroke="deepskyblue"
    strokeWidth={2}
    dot={MoonEmojiDot}
    activeDot={false}
    connectNulls={false}
  />
);

/**
 * Adds the moon series fields to chart points that carry a `time` time tag:
 * the illumination percent (0-100) and the phase emoji.
 *
 * Default: every midnight gets the emoji of its phase bucket (3-hourly charts
 * have few midnights). With `phaseAligned: true` (daily charts), each of the
 * 8 phase boundaries (0, ⅛, … ⅞) gets a single marker on the data point
 * NEAREST its true fraction, so 🌕 sits on the 100% peak, 🌑 at the 0% trough
 * and 🌓/🌗 at the ~50% crossings instead of lagging a day behind.
 */
export function enrichWithMoon<T extends { time: string }>(
  points: T[],
  options: { phaseAligned?: boolean } = {},
): (T & { moon: number; moonEmoji: string | null })[] {
  if (!options.phaseAligned) {
    return points.map((p) => ({
      ...p,
      moon: moonIlluminationPercent(parseTimeTag(p.time)),
      moonEmoji: moonEmojiAtMidnight(p.time),
    }));
  }
  const boundaries = [0, 1, 2, 3, 4, 5, 6, 7] as const;
  const nearest = new Map<number, { index: number; dist: number }>();
  points.forEach((p, index) => {
    const fraction = moonCycleFraction(parseTimeTag(p.time));
    if (Number.isNaN(fraction)) return;
    for (const k of boundaries) {
      let dist = Math.abs(fraction - k / 8);
      if (dist > 0.5) dist = 1 - dist; // circular distance across the cycle
      const current = nearest.get(k);
      if (!current || dist < current.dist) {
        nearest.set(k, { index, dist });
      }
    }
  });
  const markers = new Map<number, string>();
  for (const [k, { index }] of nearest) {
    markers.set(index, getMoonPhaseAtFraction(k / 8).emoji);
  }
  return points.map((p, index) => ({
    ...p,
    moon: moonIlluminationPercent(parseTimeTag(p.time)),
    moonEmoji: markers.get(index) ?? null,
  }));
}

/**
 * Tooltip entry formatter: the moon entry reads "78% – Waxing gibbous";
 * all other entries pass through unchanged.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function moonTooltipFormatter(
  value: any,
  name: any,
  _item?: any,
  _index?: any,
  payload?: any,
): [React.ReactNode, string] {
  if (name === MOON_SERIES_NAME) {
    const time = payload?.[0]?.payload?.time as string | undefined;
    const phase = time ? getMoonPhase(parseTimeTag(time)).name : "Moon";
    return [`${Math.round(Number(value))}% – ${phase}`, "Moon"];
  }
  return [value, name];
}
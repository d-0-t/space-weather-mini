import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import SignalCellular1Bar from "@mui/icons-material/SignalCellular1Bar";
import SignalCellular2Bar from "@mui/icons-material/SignalCellular2Bar";
import SignalCellular3Bar from "@mui/icons-material/SignalCellular3Bar";
import { useRef, useState } from "react";
import type { RefObject } from "react";

import { webcamsForTown } from "../../../../../data/webcams";
import {
  type ReachProbability,
  type ReachTown,
} from "../../../../../products/reach-towns";
import { flagSrc } from "../../../webcams/webcam-card-parts";
import ReachTownWebcamsDialog from "./ReachTownWebcamsDialog";
import { useReachTowns } from "./useReachTowns";

import "./ReachTowns.scss";

/**
 * The Reach towns list (CONTEXT.md Possible locations content): the global
 * town list naming where the aurora may be seen for the current observed Kp.
 * A town shows only while its approximate |geomagnetic latitude| is at or
 * poleward of the Tips reach edge E = 66° − 2° × Kp AND the sun there is at
 * or below −12° (astronomical twilight or darker; data/sun.ts). The solar
 * state follows the shared 60 s tick (useReachTowns) and the Kp half rides
 * the caller's 5-minute refetch, so the list is never stale. When nothing
 * qualifies it renders nothing – no empty list and no filler. The honesty
 * bounds ("may be seen", rough guide, magnetic-not-normal latitude, Kp a
 * 3-hour average, only dark towns listed, absence ≠ no aurora) live behind
 * the info popover with the rule's owner at NOAA/SWPC as its footnote. The
 * Possible locations Dashboard panel owns the h2 heading; this element is
 * the list plus its info control only.
 *
 * Towns that own a webcam (an image or live cam in data/webcams.ts, matched
 * by the town's flag code + city) render a camera icon button after their
 * name: it opens the town's webcam dialog (ReachTownWebcamsDialog) with
 * each cam the town has, in the shape the webcam card shows. Webcam towns
 * bypass the guide's one-town-per-band-per-country dedup, so their icon is
 * never crowded out by a same-country neighbour with a larger margin.
 */

/** The ranked probability glyph: more filled bars = more confident. */
const PROBABILITY_ICONS: Record<ReachProbability, typeof SignalCellular1Bar> = {
  possible: SignalCellular1Bar,
  likely: SignalCellular2Bar,
  "very-likely": SignalCellular3Bar,
};

/** The ordinal word for each band (screen readers and titles). */
const PROBABILITY_LABELS: Record<ReachProbability, string> = {
  possible: "Possible",
  likely: "Likely",
  "very-likely": "Very likely",
};

/** Hover explanation per band; the word alone is never a promise. */
const PROBABILITY_TITLES: Record<ReachProbability, string> = {
  possible:
    "Possible – at the edge of the aurora's reach, low on the poleward horizon. May be seen, not promised.",
  likely: "Likely – inside the aurora's reach. May be seen, not promised.",
  "very-likely":
    "Very likely – deep inside the aurora's reach. May be seen, not promised.",
};

const ReachTownRow: React.FC<{ town: ReachTown }> = ({ town }) => {
  const ProbabilityIcon = PROBABILITY_ICONS[town.probability];
  const cams = webcamsForTown(town.countryCode, town.city);
  const cameraRef = useRef<HTMLButtonElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const camsLabel = cams.length === 1 ? "webcam" : "webcams";
  const cameraLabel = `Open the ${town.city} ${camsLabel}`;
  return (
    <li
      className={`reach-towns__town reach-towns__town--${town.probability}`}
    >
      <span
        className={`reach-towns__probability reach-towns__probability--${town.probability}`}
      >
        <span
          className="reach-towns__probability-icon"
          title={PROBABILITY_TITLES[town.probability]}
        >
          <ProbabilityIcon aria-hidden="true" fontSize="small" />
        </span>
        <span className="sr-only">
          {PROBABILITY_LABELS[town.probability]}
        </span>
      </span>
      <img
        className="reach-towns__flag"
        src={flagSrc(town.countryCode, "16x12")}
        srcSet={`${flagSrc(town.countryCode, "32x24")} 2x, ${flagSrc(
          town.countryCode,
          "48x36",
        )} 3x`}
        width={16}
        height={12}
        alt={town.country}
        title={town.country}
        loading="lazy"
      />
      <span className="reach-towns__city">{town.city}</span>
      {cams.length > 0 ? (
        <>
          <button
            ref={cameraRef}
            type="button"
            className="reach-towns__camera"
            title={cameraLabel}
            onClick={() => setDialogOpen(true)}
          >
            <PhotoCameraIcon aria-hidden="true" fontSize="small" />
            <span className="sr-only">{cameraLabel}</span>
          </button>
          {dialogOpen ? (
            <ReachTownWebcamsDialog
              town={town.city}
              cams={cams}
              triggerRef={cameraRef}
              onClose={() => setDialogOpen(false)}
            />
          ) : null}
        </>
      ) : null}
    </li>
  );
};

const ReachTowns: React.FC<{ kp: number; towns?: ReachTown[] }> = ({
  kp,
  towns: townsProp,
}) => {
  // The panel shell pre-selects through the same hook to decide empty vs
  // list; passing its rows in skips the second tick so shell and rows can
  // never disagree. Standalone use (kp only) selects here.
  const hooked = useReachTowns(townsProp === undefined ? kp : null);
  const towns = townsProp ?? hooked;

  if (towns.length === 0) return null;

  return (
    <div className="reach-towns">
      <ul className="reach-towns__list">
        {towns.map((town) => (
          <ReachTownRow
            key={`${town.country}/${town.city}`}
            town={town}
          />
        ))}
      </ul>
    </div>
  );
};

export default ReachTowns;

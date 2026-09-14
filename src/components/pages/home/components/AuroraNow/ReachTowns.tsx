import { useEffect, useMemo, useState } from "react";
import SignalCellular1Bar from "@mui/icons-material/SignalCellular1Bar";
import SignalCellular2Bar from "@mui/icons-material/SignalCellular2Bar";
import SignalCellular3Bar from "@mui/icons-material/SignalCellular3Bar";

import { REACH_CITIES } from "../../../../../data/reach-cities";
import { solarElevationDegrees } from "../../../../../data/sun";
import {
  selectReachTowns,
  type ReachProbability,
} from "../../../../../products/reach-towns";
import HelpPopover from "../../../../HelpPopover/HelpPopover";
import { flagSrc } from "../../../webcams/webcam-card-parts";

import "./ReachTowns.scss";
import OpenInNew from "@mui/icons-material/OpenInNew";
import { Link } from "react-router-dom";

/** The Tips on Viewing the Aurora page that owns the reach rule. */
const TIPS_URL = "https://www.swpc.noaa.gov/content/tips-viewing-aurora";

/**
 * The Reach towns element (CONTEXT.md; ticket 01 decision, ticket 02
 * build): a global town list under the Kp block naming where the aurora
 * may be seen for the current observed Kp. A town shows only while its
 * approximate |geomagnetic latitude| is at or poleward of the Tips reach
 * edge E = 66° − 2° × Kp AND the sun there is at or below −12°
 * (astronomical twilight or darker; data/sun.ts). The solar state is
 * recomputed on a 60 s tick and on the panel's own 5-minute Kp refetch,
 * so the list is never stale. When nothing qualifies it renders nothing –
 * no empty heading and no filler. The honesty bounds ("may be seen",
 * rough guide, magnetic-not-normal latitude, Kp a 3-hour average, only
 * dark towns listed, absence ≠ no aurora) live behind the heading's info
 * popover with the rule's owner at NOAA/SWPC as its footnote.
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

const ReachTowns: React.FC<{ kp: number }> = ({ kp }) => {
  // The sun state follows the clock on a 60 s tick (the webcams pattern);
  // the Kp halves of the list ride the parent's 5-minute refetch.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const towns = useMemo(
    () =>
      selectReachTowns(REACH_CITIES, kp, (entry) =>
        solarElevationDegrees(entry.lat, entry.lon, now),
      ),
    [kp, now],
  );

  if (towns.length === 0) return null;

  return (
    <section className="reach-towns" aria-labelledby="reach-towns-heading">
      <div className="reach-towns__head">
        <h3 className="reach-towns__heading" id="reach-towns-heading">
          Possible locations
        </h3>
        <HelpPopover
          popoverClassName="reach-towns__popover"
          content={{
            label: "About these towns",
            paragraphs: [
              "The aurora may be seen in these places, but isn't guaranteed.",
              "The list is based on the Kp index, which is a 3-hour world average that changes.",
              "Only dark enough locations are shown.",
            ],
            footnote: (
              <span className="reach-towns__popover__links">
                <Link to={"about/guide"}>Aurora Guide</Link>
                <a href={TIPS_URL} target="_blank" rel="noopener noreferrer">
                  NOAA/SWPC's Tips on Viewing the Aurora{" "}
                  <OpenInNew aria-hidden="true" fontSize="inherit" />
                </a>
              </span>
            ),
          }}
        />
      </div>
      <ul className="reach-towns__list">
        {towns.map((town) => {
          const ProbabilityIcon = PROBABILITY_ICONS[town.probability];
          return (
            <li
              className={`reach-towns__town reach-towns__town--${town.probability}`}
              key={`${town.country}/${town.city}`}
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
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default ReachTowns;

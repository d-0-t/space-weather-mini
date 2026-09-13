import OpenInNew from "@mui/icons-material/OpenInNew";
import { Link } from "react-router-dom";

import "./Pages.scss";
import {
  cloudCoverMapUrl,
  lightPollutionMapUrl,
} from "../../data/external-links";
import GlossaryTerm from "../explainers/GlossaryTerm";
import { useGeocodedPlace } from "../PlaceFinder/useGeocodedPlace";
import "./Guide.scss";

/**
 * The "Aurora guide" page of the About submenu (ticket 09): a read-through
 * narrative for laymen and travelers in the evening's order – what auroras
 * are, when to look, latitude-aware where to look, what can hide them, and
 * the starter aids for a first night. Every claim stays inside the honesty
 * inventory's bounds: no promises, no colour promises, no city strings, no
 * light-pollution numbers. Terms open the shared glossary popups; the live
 * position defers to the Dashboard's oval and view-distance band, and the
 * sky caveats link the stored place's map viewers.
 */
const Guide: React.FC = () => {
  const { place } = useGeocodedPlace();
  const pollutionHref = lightPollutionMapUrl(place.latitude, place.longitude);
  const cloudHref = cloudCoverMapUrl(place.latitude, place.longitude);

  return (
    <div className="container aurora-guide">
      <h1>Aurora guide</h1>

      <article>
        <p>
          A good aurora night needs three things: a dark sky, a clear view, and
          geomagnetic activity. This page walks through all three, in the order
          the evening asks for them.
        </p>

        <h2>What auroras are</h2>
        <p>
          The Sun sends out the{" "}
          <GlossaryTerm termId="solar-wind">solar wind</GlossaryTerm> – a stream
          of charged particles flowing in every direction. Earth&apos;s magnetic
          field deflects most of it, but near the poles some particles are
          funnelled down into the upper atmosphere. There they collide with
          oxygen and nitrogen and make the air glow. That glow is the aurora.
        </p>
        <p>
          Colours follow altitude: green is the most common and usually sits
          overhead at high latitudes, red is emitted higher up and is often what
          a viewer far from the pole catches, and faint purple fringes can ride
          the lower edge. Which colours you get on a given night is never
          something anyone can promise.
        </p>

        <h2>When to look</h2>
        <p>
          Aurora needs <GlossaryTerm termId="night">night</GlossaryTerm>, or at
          least astronomical twilight first. The Sun should be well below the
          horizon, not just set. In the far north the summer nights never get
          dark enough, and the season begins with the first properly dark
          evenings of late summer. The Dashboard&apos;s Darkest line names
          tonight&apos;s darkest stretch at your place, and{" "}
          <Link to="/conditions">Local conditions</Link> shows the twilight
          bands around it.
        </p>
        <p>
          Once it is dark, it's up to patience and luck. Activity arrives in
          bursts: an empty sky at 21:00 can fill within minutes, so give it an
          hour or two before calling it a night. The{" "}
          <GlossaryTerm termId="kp-index">Kp index</GlossaryTerm> is a
          three-hour average for the whole planet, not a schedule for the sky.
          How far south aurora reaches at a given Kp is approximate.
        </p>

        <h2>Where to look</h2>
        <p>
          Where to look depends on how far north you are, and the answer is not
          always &ldquo;face north.&rdquo;
        </p>
        <p>
          Close to the polar regions the glowing band – the{" "}
          <GlossaryTerm termId="oval">aurora oval</GlossaryTerm> – can sit
          overhead, and in a strong event it pushes so far south that the glow
          appears in the southern sky. Look around, not just up. Further south
          the oval stays low on the northern horizon, where a bright night shows
          as a broad glow or a pale arc that can resemble a cloud.
        </p>
        <p>
          Check the <Link to="/#view-distance">Dashboard</Link>: the{" "}
          <Link to="/#oval-glow">Oval glow intensity</Link> panel paints the
          forecast band on a world map, and the{" "}
          <GlossaryTerm termId="view-distance">View distance</GlossaryTerm> line
          reads the nearest glow, its distance band and a confidence label for
          your stored place. Both describe the next 30–90 minutes from the
          latest model run, so look again before you head out.
        </p>

        <h2>What can hide aurora</h2>
        <p>
          The lights can be out and still invisible from your spot. Clouds are
          the usual culprit: the best space-weather night is wasted under an
          overcast sky. Check the cloud coverage at your place on{" "}
          <Link to="/conditions">Local conditions</Link>, or open the{" "}
          <a href={cloudHref} target="_blank" rel="noopener noreferrer">
            live cloud-cover map{" "}
            <OpenInNew aria-hidden="true" fontSize="inherit" />
          </a>
          .
        </p>
        <p>
          A bright Moon washes out faint aurora, so the darkest skies around the
          new Moon are best, and a Moon below the horizon is no obstacle at all.
          Street lights hide the faint parts too, so the darker your viewing
          spot, the more you will see. The{" "}
          <a href={pollutionHref} target="_blank" rel="noopener noreferrer">
            light-pollution map{" "}
            <OpenInNew aria-hidden="true" fontSize="inherit" />
          </a>{" "}
          opens centred on this place.
        </p>
        <p>
          Daylight is another hindrance: there is nothing to see until the Sun
          is well down.
        </p>

        <h2>Before you go out</h2>
        <p>
          Dress for standing still, not for walking. The cold arrives the moment
          you stop, so wear a layer more than the walk there, with a windproof
          shell, a hat, gloves and warm boots. In extreme cold, consider using
          heating packets.
        </p>
        <p>
          Give it one to two hours, and look up often. Activity comes and goes,
          and the sky that is empty when you arrive can be full before you
          leave.
        </p>
        <p>
          For a photo, you will usually need a tripod, because seconds-long
          exposures cannot be hand-held. Manual focus should be turned to
          infinity, and a wide aperture with a few seconds of exposure – f/2.8
          at 5–10 seconds and ISO 1600 is a good starting point. You can adjust
          these values as the aurora intensity changes.
        </p>
        <p>
          And if tonight stays quiet, that is normal. Forecasts describe the
          odds, and are never a promise.
        </p>
        <p>Good luck, and happy hunting!</p>
      </article>
    </div>
  );
};

export default Guide;

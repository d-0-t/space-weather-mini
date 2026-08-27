import { Link } from "react-router-dom";

import FullSizeModal from "../../../../FullSizeModal";

import "./PredictedSolarWind.scss";

const ENLIL_VIDEO_URL = "https://spaceweather.irf.se/data/swpc_enlil.mp4";
const ENLIL_SOURCE_URL = "https://spaceweather.irf.se/forecast/enlil/";

/**
 * Predicted solar wind – IRF's ENLIL-model video of the solar wind over the
 * coming days. The video carries no audio, so a visible caption explains what
 * it visualizes and points to the numeric forecast panels on this app. The
 * panel shows a small preview; the video opens full size in a modal.
 */
const PredictedSolarWind: React.FC = () => (
  <article className="predicted-solar-wind">
    <h2>Predicted solar wind</h2>
    <figure className="predicted-solar-wind__figure">
      <FullSizeModal
        label="Predicted solar wind video, full size"
        triggerClassName="predicted-solar-wind__video-tile"
        trigger={
          <video
            aria-hidden="true"
            muted
            preload="metadata"
            src={ENLIL_VIDEO_URL}
          />
        }
      >
        <video controls preload="metadata" src={ENLIL_VIDEO_URL}>
          <p>
            Your browser can&apos;t play this video – see the{" "}
            <Link to="/forecasts/27days">27-day outlook</Link> and the{" "}
            <Link to="/forecasts/3days">3-day forecast</Link> panels instead.
          </p>
        </video>
      </FullSizeModal>
      <figcaption>
        Visualization of the predicted solar wind speed over the coming days.
        The Space Weather Now panel shows the wind arriving at Earth right now;
        the{" "}
        <Link to="/forecasts/27days">27-day outlook</Link> and{" "}
        <Link to="/forecasts/3days">3-day forecast</Link> panels give the
        numbers behind this video.
      </figcaption>
    </figure>
    <p className="predicted-solar-wind__source">
      Source:{" "}
      <a href={ENLIL_SOURCE_URL} target="_blank" rel="noopener noreferrer">
        IRF
      </a>
    </p>
  </article>
);

export default PredictedSolarWind;
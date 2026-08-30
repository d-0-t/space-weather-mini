import "./webcams.scss";
import type { WebcamTwitchEntry } from "../../../data/webcams";
import {
  WebcamCardAttribution,
  WebcamHideButton,
} from "./webcam-card-parts";

/** The Lights over Lapland Twitch player – never autoplaying (ticket 01). */
const WebcamTwitchCard: React.FC<{
  entry: WebcamTwitchEntry;
  parent: string;
  onHide: (id: string) => void;
}> = ({ entry, parent, onHide }) => (
  <div className="webcam-card webcam-card--stream webcam-card--wide">
    <div className="webcam-card__head">
      <h3 className="webcam-card__title">{entry.name}</h3>
      <WebcamHideButton name={entry.name} onHide={() => onHide(entry.id)} />
    </div>
    <iframe
      src={`https://player.twitch.tv/?channel=${entry.twitchChannel}&parent=${parent}&autoplay=false&muted=true`}
      title={`${entry.name} – live on Twitch`}
      height="360"
      width="640"
      allowFullScreen
      className="webcam-card__twitch"
    />
    <WebcamCardAttribution operator={entry.operator} siteUrl={entry.siteUrl} />
    {entry.note ? <p className="webcam-card__note">{entry.note}</p> : null}
  </div>
);

export default WebcamTwitchCard;
import "./webcams.scss";
import type { WebcamTwitchEntry } from "../../../data/webcams";
import {
  WebcamCardAttribution,
  WebcamHideButton,
  WebcamPinToggle,
  type WebcamPinProps,
} from "./webcam-card-parts";

/** The Lights over Lapland Twitch player – never autoplaying (ticket 01). */
const WebcamTwitchCard: React.FC<
  WebcamPinProps & {
    entry: WebcamTwitchEntry;
    parent: string;
    canHide: boolean;
    onHide: (id: string) => void;
  }
> = ({ entry, parent, canHide, onHide, pinMode, pinned, pinDisabled, onTogglePin }) => {
  const pinClass = pinMode
    ? pinned
      ? " webcam-card--pinned"
      : " webcam-card--pin-unselected"
    : "";
  return (
    <div className={`webcam-card webcam-card--stream webcam-card--wide${pinClass}`}>
      <div className="webcam-card__head">
        <h3 className="webcam-card__title">{entry.name}</h3>
        {pinMode ? (
          <WebcamPinToggle
            id={entry.id}
            name={entry.name}
            pinMode={pinMode}
            pinned={pinned}
            pinDisabled={pinDisabled}
            onTogglePin={onTogglePin}
          />
        ) : canHide ? (
          <WebcamHideButton name={entry.name} onHide={() => onHide(entry.id)} />
        ) : null}
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
};

export default WebcamTwitchCard;
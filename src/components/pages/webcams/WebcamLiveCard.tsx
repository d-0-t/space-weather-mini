import { useEffect, useState } from "react";

import "./webcams.scss";
import type { WebcamLiveEntry } from "../../../data/webcams";
import {
  formatLoadedTime,
  parseSseFramePath,
  WebcamCardAttribution,
  WebcamCardBaseProps,
  WebcamCardImage,
  WebcamCardTitle,
  WebcamHideButton,
  WebcamPinToggle,
  type WebcamPinProps,
} from "./webcam-card-parts";

/**
 * The one true-live cam (UAF Poker Flat, ticket 03): follows the operator's
 * CORS-open SSE feed for ~5–15 s frames while live mode is on, auto-refresh
 * is on, and the tab is visible. On feed failure the still swaps for an
 * honest fallback note with the operator link; the next frame restores it.
 * Whenever the feed stops (live mode off, consent off, or tab hidden) the
 * card reverts to the operator's placeholder still, so the freshness line
 * can never claim "placeholder frame" over a real frame.
 */
const WebcamLiveCard: React.FC<
  WebcamCardBaseProps &
    WebcamPinProps & {
      entry: WebcamLiveEntry;
    }
> = ({ entry, autoRefresh, tabVisible, canHide, onHide, pinMode, pinned, pinDisabled, onTogglePin }) => {
  const [liveEnabled, setLiveEnabled] = useState(true);
  const [src, setSrc] = useState(entry.imageUrl);
  const [loadedAt, setLoadedAt] = useState(formatLoadedTime);
  const [feedFailed, setFeedFailed] = useState(false);

  const feeding = autoRefresh && tabVisible && liveEnabled;

  useEffect(() => {
    if (!feeding) return;
    const source = new EventSource(entry.sseUrl);
    source.addEventListener("message", (event: MessageEvent) => {
      const path = parseSseFramePath(event.data);
      if (path === null) return;
      setFeedFailed(false);
      setSrc(`${entry.frameBaseUrl}${path}`);
      setLoadedAt(formatLoadedTime());
    });
    source.addEventListener("error", () => setFeedFailed(true));
    return () => source.close();
  }, [feeding, entry]);

  useEffect(() => {
    if (!feeding) setSrc(entry.imageUrl);
  }, [feeding, entry]);

  return (
    <article
      className={`webcam-card webcam-card--live${
        feeding ? " webcam-card--wide" : ""
      }`}
    >
<div className="webcam-card__head">
      <WebcamCardTitle
        country={entry.country}
        name={entry.name}
        latitude={entry.latitude}
      />
      {canHide ? (
        <WebcamHideButton name={entry.name} onHide={() => onHide(entry.id)} />
      ) : null}
    </div>
    {feedFailed ? (
        <p className="webcam-card__feed-fallback">
          Live feed unavailable –{" "}
          <a
            href={entry.siteUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            visit the operator's site
          </a>
        </p>
      ) : (
        <WebcamCardImage
          label={`${entry.name}, full size`}
          src={src}
          alt={entry.alt}
        />
      )}
      {feedFailed ? null : (
        <p className="webcam-card__freshness">
          {feeding
            ? `Loaded ${loadedAt} · live feed updates every ~5–15 s`
            : `Loaded ${loadedAt} · placeholder frame`}
        </p>
      )}
      {entry.note ? <p className="webcam-card__note">{entry.note}</p> : null}
      <WebcamCardAttribution operator={entry.operator} siteUrl={entry.siteUrl} />
      <div className="webcam-card__actions">
        {feedFailed ? null : (
          <label className="btn--secondary webcam-card__live-toggle">
            <input
              type="checkbox"
              className="webcam-card__live-toggle__checkbox"
              title="Follows the operator's live feed while auto-refresh is on"
              checked={liveEnabled}
              disabled={!autoRefresh}
              onChange={() => setLiveEnabled((enabled) => !enabled)}
            />
            <span className="btn__label">Live updates</span>
          </label>
        )}
      </div>
      <WebcamPinToggle
        id={entry.id}
        name={entry.name}
        pinMode={pinMode}
        pinned={pinned}
        pinDisabled={pinDisabled}
        onTogglePin={onTogglePin}
      />
    </article>
  );
};

export default WebcamLiveCard;
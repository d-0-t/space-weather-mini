import { useEffect, useRef, useState } from "react";

import "./webcams.scss";
import type { WebcamImageEntry } from "../../../data/webcams";
import {
  cacheBustedSrc,
  formatLoadedTime,
  WebcamCardAttribution,
  WebcamCardBaseProps,
  WebcamCardImage,
  WebcamCardTitle,
  WebcamHideButton,
} from "./webcam-card-parts";

/**
 * One image card (ticket 03): owns its own still `src` and "Loaded HH:MM"
 * time, so every reload – the page-level Refresh button, the opt-in cadence
 * interval, or the SSE feed – updates the honest freshness line. Auto-refresh
 * never polls faster than the operator's cadence and pauses while the tab is
 * hidden (ADR-0003 discipline); the Refresh button always works.
 */
const WebcamImageCard: React.FC<
  WebcamCardBaseProps & {
    card: WebcamImageEntry;
    refreshNonce: number;
  }
> = ({ card, autoRefresh, tabVisible, refreshNonce, onHide }) => {
  const [src, setSrc] = useState(card.imageUrl);
  const [loadedAt, setLoadedAt] = useState(formatLoadedTime);

  const reload = () => {
    setSrc(cacheBustedSrc(card.imageUrl));
    setLoadedAt(formatLoadedTime());
  };

  // The page-level Refresh button re-renders every card's still; the nonce
  // changes on click, so the mount render (nonce unchanged) is skipped.
  const lastNonce = useRef(refreshNonce);
  useEffect(() => {
    if (lastNonce.current === refreshNonce) return;
    lastNonce.current = refreshNonce;
    reload();
    // reload() closes over stable props only; the nonce is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshNonce]);

  useEffect(() => {
    if (!autoRefresh || !card.refreshable || !tabVisible) return;
    const minutes = Math.max(card.cadenceMinutes, 1);
    const id = window.setInterval(reload, minutes * 60_000);
    return () => window.clearInterval(id);
    // reload() closes over stable props only; the gating props are the deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, card, tabVisible]);

  return (
    <article
      className={`webcam-card${
        card.panoramic ? " webcam-card--panoramic" : ""
      }`}
    >
      <div className="webcam-card__head">
        <WebcamCardTitle
          country={card.country}
          name={card.name}
          latitude={card.latitude}
        />
        <WebcamHideButton name={card.name} onHide={() => onHide(card.id)} />
      </div>
      <WebcamCardImage
        label={`${card.name}, full size`}
        src={src}
        alt={card.alt}
      />
      <p className="webcam-card__freshness">
        Loaded {loadedAt} · Refreshes every {card.cadenceMinutes} min
        {card.note ? ` · ${card.note}` : ""}
      </p>
      <WebcamCardAttribution operator={card.operator} siteUrl={card.siteUrl} />
    </article>
  );
};

export default WebcamImageCard;

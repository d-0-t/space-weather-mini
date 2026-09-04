import { useEffect, useState } from "react";

import "./PinnedWebcams.scss";
import CollapsiblePanel from "../../../../CollapsiblePanel/CollapsiblePanel";
import FullSizeModal from "../../../../FullSizeModal";
import {
  loadPinsAutoRefresh,
  loadPinnedIds,
  savePinsAutoRefresh,
} from "../../../../../data/webcam-storage";
import {
  webcamRegistry,
  type WebcamEntry,
  type WebcamImageEntry,
  type WebcamLiveEntry,
  type WebcamTwitchEntry,
} from "../../../../../data/webcams";
import {
  CountryFlag,
  formatLatitude,
} from "../../../webcams/webcam-card-parts";

/** Deploy target the Twitch player must receive as its parent: the page's own host. */
const twitchParent = (): string => window.location.hostname || "localhost";

/** True while the tab is visible; pinned-card refreshes pause while hidden (ADR-0003). */
const useTabVisible = (): boolean => {
  const [visible, setVisible] = useState(
    () => document.visibilityState !== "hidden",
  );
  useEffect(() => {
    const onVisibilityChange = () =>
      setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);
  return visible;
};

/**
 * One pinned webcam on the Dashboard: flag + name + latitude title, the
 * operator's still in a full-size dialog, and the source attribution.
 * Image pins reload on the operator's cadence while the consent is on;
 * the live pin has no cadence (its live frames come via SSE on the webcams
 * page), so its placeholder stays still.
 */
const PinnedImageCard: React.FC<{
  entry: WebcamImageEntry | WebcamLiveEntry;
  /** Auto-refresh is only armed while the Dashboard's consent is on and the tab is visible. */
  refresh: boolean;
}> = ({ entry, refresh }) => {
  const [src, setSrc] = useState(entry.imageUrl);

  useEffect(() => {
    setSrc(entry.imageUrl);
  }, [entry]);

  useEffect(() => {
    if (!refresh || entry.type !== "image") return;
    const minutes = Math.max(entry.cadenceMinutes, 1);
    const id = window.setInterval(() => {
      setSrc(`${entry.imageUrl}?t=${Date.now()}`);
    }, minutes * 60_000);
    return () => window.clearInterval(id);
    // entry is a stable registry object; the gating props are the deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, entry]);

  return (
    <section className="pinned-webcam-card">
      <h3 className="pinned-webcam-card__title">
        <CountryFlag
          country={entry.country}
          className="pinned-webcam-card__flag"
        />{" "}
        {entry.name} · {formatLatitude(entry.latitude)}
      </h3>
      <FullSizeModal
        label={`${entry.name}, full size`}
        triggerClassName="pinned-webcam-card__trigger"
        trigger={
          <img src={src} alt={entry.alt} className="pinned-webcam-card__img" />
        }
      >
        <img src={src} alt={entry.alt} />
      </FullSizeModal>
      <p className="pinned-webcam-card__attribution">
        Source:{" "}
        <a href={entry.siteUrl} target="_blank" rel="noopener noreferrer">
          {entry.operator}
        </a>
      </p>
    </section>
  );
};

/** A pinned Twitch stream embeds the never-autoplaying player, not an image. */
const PinnedTwitchCard: React.FC<{ entry: WebcamTwitchEntry }> = ({
  entry,
}) => (
  <section className="pinned-webcam-card">
    <h3 className="pinned-webcam-card__title">{entry.name}</h3>
    <iframe
      src={`https://player.twitch.tv/?channel=${entry.twitchChannel}&parent=${twitchParent()}&autoplay=false&muted=true`}
      title={`${entry.name} – live on Twitch`}
      height="360"
      width="640"
      allowFullScreen
      className="pinned-webcam-card__twitch"
    />
    <p className="pinned-webcam-card__attribution">
      Source:{" "}
      <a href={entry.siteUrl} target="_blank" rel="noopener noreferrer">
        {entry.operator}
      </a>
    </p>
  </section>
);

/**
 * Pinned Webcams – the 1-2 cams the visitor pinned on the webcams page,
 * shown under Aurora Now in a collapsible panel (like the other home
 * panels). The opt-in auto-refresh reloads the pinned stills on their
 * operators' cadences; the panel hides itself while nothing is pinned.
 */
const PinnedWebcams: React.FC<{ entries?: WebcamEntry[] }> = ({
  entries = webcamRegistry,
}) => {
  const [autoRefresh, setAutoRefresh] = useState(() =>
    loadPinsAutoRefresh(localStorage),
  );
  const tabVisible = useTabVisible();

  // Resolved against the current registry so a cam removed from the config
  // stops showing (its stale id stays inert in storage). Link rows are never
  // pinnable – only image, live and Twitch cards are.
  const pinned = loadPinnedIds(localStorage)
    .map((id) => entries.find((entry) => entry.id === id))
    .filter(
      (
        entry,
      ): entry is WebcamImageEntry | WebcamLiveEntry | WebcamTwitchEntry =>
        entry !== undefined && entry.type !== "link",
    );

  if (pinned.length === 0) return null;

  const handleAutoRefreshChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const next = event.target.checked;
    savePinsAutoRefresh(localStorage, next);
    setAutoRefresh(next);
  };

  return (
    <article className="pinned-webcams">
      <CollapsiblePanel
        heading={<h2>Pinned webcams</h2>}
        bodyId="pinned-webcams-panel-body"
      >
        <label className="pinned-webcams__autorefresh">
          <input
            type="checkbox"
            className="pinned-webcams__autorefresh__checkbox"
            title="Reloads each pinned image on its operator's cadence – uses data"
            checked={autoRefresh}
            onChange={handleAutoRefreshChange}
          />
          Auto-refresh
        </label>
        <div className="pinned-webcams__cards">
          {pinned.map((entry) =>
            entry.type === "twitch" ? (
              <PinnedTwitchCard key={entry.id} entry={entry} />
            ) : (
              <PinnedImageCard
                key={entry.id}
                entry={entry}
                refresh={autoRefresh && tabVisible}
              />
            ),
          )}
        </div>
      </CollapsiblePanel>
    </article>
  );
};

export default PinnedWebcams;

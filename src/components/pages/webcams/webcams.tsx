import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import FilterListIcon from "@mui/icons-material/FilterList";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

import "./webcams.scss";
import {
  loadAutoRefresh,
  loadFilteredRegions,
  loadHiddenSourceIds,
  saveAutoRefresh,
  saveFilteredRegions,
  saveHiddenSourceIds,
} from "../../../data/webcam-storage";
import {
  webcamRegistry,
  WEBCAM_REGION_ORDER,
  type WebcamEntry,
  type WebcamImageEntry,
  type WebcamLinkEntry,
  type WebcamRegion,
} from "../../../data/webcams";
import WebcamFilterDialog from "./WebcamFilterDialog";
import WebcamHiddenDialog from "./WebcamHiddenDialog";
import WebcamImageCard from "./WebcamImageCard";
import WebcamLiveCard from "./WebcamLiveCard";
import { regionLabel, WebcamHideButton } from "./webcam-card-parts";

/** Deploy target the Twitch player must receive as its parent: the page's own host. */
const twitchParent = (): string => window.location.hostname || "localhost";

/**
 * A closed dialog hands focus back to its trigger button (the browser does
 * this for native dialogs; the explicit handler covers test environments).
 */
const useDialogFocusReturn = (
  dialogRef: RefObject<HTMLDialogElement | null>,
  triggerRef: RefObject<HTMLButtonElement | null>,
): void => {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => triggerRef.current?.focus();
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [dialogRef, triggerRef]);
};

const KIND_NOTES: Record<WebcamLinkEntry["kind"], string> = {
  youtube: "YouTube stream",
  twitch: "Twitch stream",
  player: "site player",
  "http-only": "Webcam",
};

/** Link rows lead with the regions that have no image cards, then the rest in fixed order. */
const LINK_REGION_ORDER: readonly WebcamRegion[] = [
  "New Zealand",
  "UK",
  "Greenland",
  "Russia",
  ...WEBCAM_REGION_ORDER.filter(
    (region) => !["New Zealand", "UK", "Greenland", "Russia"].includes(region),
  ),
];

const sectionId = (region: WebcamRegion): string =>
  `webcams-region-${region}`;

/** Panoramic feeds render last, spanning the whole row. */
const orderedCards = (cards: WebcamImageEntry[]): WebcamImageEntry[] =>
  cards
    .filter((card) => !card.panoramic)
    .concat(cards.filter((card) => card.panoramic));

/** Buckets entries of one type by region, in the given display order. */
const groupByRegion = <T extends WebcamEntry>(
  entries: WebcamEntry[],
  type: T["type"],
  order: readonly WebcamRegion[],
): [WebcamRegion, T[]][] => {
  const map = new Map<WebcamRegion, T[]>();
  for (const region of order) map.set(region, []);
  for (const entry of entries) {
    if (entry.type === type) map.get(entry.region as WebcamRegion)?.push(entry as T);
  }
  return [...map.entries()].filter(([, items]) => items.length > 0);
};

/** True while the tab is visible; auto-refresh pauses while hidden (ADR-0003). */
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

/** "Auto-refresh (2–10 min)" – the refreshable cadence range, single value as "60s"/"N min". */
const autoRefreshLabel = (entries: WebcamEntry[]): string => {
  const cadences = entries
    .filter(
      (entry): entry is WebcamImageEntry =>
        entry.type === "image" && entry.refreshable,
    )
    .map((entry) => entry.cadenceMinutes);
  if (cadences.length === 0) return "Auto-refresh";
  const min = Math.min(...cadences);
  const max = Math.max(...cadences);
  const frame =
    min === max ? (min === 1 ? "60s" : `${min} min`) : `${min}–${max} min`;
  return `Auto-refresh (${frame})`;
};

/**
 * Curated live sky camera gallery (ADR-0004): one card per verified webcam,
 * the Lights over Lapland Twitch embed (never autoplaying), link rows for
 * video-only or unembeddable sources, and an honest "Looking for more?" note.
 * Freshness is honest by construction – browsers cannot read image timestamps
 * without CORS, so cards show "Loaded HH:MM · operator refreshes every N min".
 */
const Webcams: React.FC<{ entries?: WebcamEntry[] }> = ({
  entries = webcamRegistry,
}) => {
  const [appliedRegions, setAppliedRegions] = useState<WebcamRegion[]>(() =>
    loadFilteredRegions(localStorage),
  );
  const [hiddenSourceIds, setHiddenSourceIds] = useState<string[]>(() =>
    loadHiddenSourceIds(localStorage),
  );
  const [autoRefresh, setAutoRefresh] = useState<boolean>(() =>
    loadAutoRefresh(localStorage),
  );
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [draftRegions, setDraftRegions] = useState<WebcamRegion[]>([]);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const filterDialogRef = useRef<HTMLDialogElement>(null);
  const hiddenButtonRef = useRef<HTMLButtonElement>(null);
  const hiddenDialogRef = useRef<HTMLDialogElement>(null);

  useDialogFocusReturn(filterDialogRef, filterButtonRef);
  useDialogFocusReturn(hiddenDialogRef, hiddenButtonRef);

  // The checklist offers every region present in the registry, in the fixed
  // display order; absent regions don't render, so a removed region disappears
  // from the filter too.
  const presentRegions = WEBCAM_REGION_ORDER.filter((region) =>
    entries.some((entry) => entry.region === region),
  );

  // Zero applied regions shows everything; checking one or more narrows image
  // cards, the Twitch card, and link rows alike. Hidden sources leave the
  // gallery entirely (their images are never fetched) under every filter.
  const visibleEntries = useMemo(() => {
    const filtered = entries.filter(
      (entry) =>
        !hiddenSourceIds.includes(entry.id) &&
        (appliedRegions.length === 0 || appliedRegions.includes(entry.region)),
    );
    return filtered;
  }, [entries, hiddenSourceIds, appliedRegions]);

  const hideSource = (id: string) => {
    const next = [...hiddenSourceIds, id];
    saveHiddenSourceIds(localStorage, next);
    setHiddenSourceIds(next);
  };

  // The hidden set is resolved against the current registry so a cam removed
  // from the config stops counting (its stale id stays inert in storage).
  const hiddenSourceEntries = hiddenSourceIds
    .map((id) => entries.find((entry) => entry.id === id))
    .filter((entry): entry is WebcamEntry => entry !== undefined);

  const restoreSource = (id: string) => {
    const next = hiddenSourceIds.filter((hiddenId) => hiddenId !== id);
    saveHiddenSourceIds(localStorage, next);
    setHiddenSourceIds(next);
  };

  const restoreAllHidden = () => {
    saveHiddenSourceIds(localStorage, []);
    setHiddenSourceIds([]);
  };

  const openFilterDialog = () => {
    setDraftRegions(appliedRegions);
    filterDialogRef.current?.showModal();
  };

  const openHiddenDialog = () => hiddenDialogRef.current?.showModal();

  const toggleDraftRegion = (region: WebcamRegion) => {
    setDraftRegions((draft) =>
      draft.includes(region)
        ? draft.filter((r) => r !== region)
        : [...draft, region],
    );
  };

  const applyFilter = () => {
    saveFilteredRegions(localStorage, draftRegions);
    setAppliedRegions(draftRegions);
    filterDialogRef.current?.close();
  };

  const imagesByRegion = useMemo(
    () => groupByRegion<WebcamImageEntry>(visibleEntries, "image", WEBCAM_REGION_ORDER),
    [visibleEntries],
  );

  const linksByRegion = useMemo(
    () => groupByRegion<WebcamLinkEntry>(visibleEntries, "link", LINK_REGION_ORDER),
    [visibleEntries],
  );

  const twitch = visibleEntries.find((entry) => entry.type === "twitch");
  const live = visibleEntries.find((entry) => entry.type === "live");

  const parent = twitchParent();
  const tabVisible = useTabVisible();

  return (
    <div className="container webcams" id="webcams">
      <div className="webcams__header">
        <h1>Webcams</h1>

        <div className="webcams__toolbar">
          <button
            type="button"
            className="btn--secondary"
            title="Refresh"
            aria-label="Refresh"
            onClick={() => setRefreshNonce((nonce) => nonce + 1)}
          >
            <RefreshIcon fontSize="small" />
            <span className="btn__label">Refresh</span>
          </button>
          <button
            type="button"
            className="btn--secondary"
            title="Filter webcams by region"
            aria-label={
              appliedRegions.length > 0
                ? `Filter (${appliedRegions.length})`
                : "Filter"
            }
            ref={filterButtonRef}
            onClick={openFilterDialog}
          >
            {appliedRegions.length > 0 ? (
              <span className="btn__badge" aria-hidden="true" />
            ) : null}
            <FilterListIcon fontSize="small" />
            <span className="btn__label">
              {appliedRegions.length > 0
                ? `Filter (${appliedRegions.length})`
                : "Filter"}
            </span>
          </button>
          <button
            type="button"
            className="btn--secondary"
            title="Hidden sources"
            aria-label={`Hidden sources (${hiddenSourceEntries.length})`}
            ref={hiddenButtonRef}
            onClick={openHiddenDialog}
          >
            {hiddenSourceEntries.length > 0 ? (
              <span className="btn__badge" aria-hidden="true" />
            ) : null}
            <VisibilityOffIcon fontSize="small" />
            <span className="btn__label">
              Hidden sources ({hiddenSourceEntries.length})
            </span>
          </button>
          <label className="btn--secondary webcams__autorefresh">
            <input
              type="checkbox"
              className="webcams__autorefresh__checkbox"
              title="Reloads each image on its operator's cadence – uses data"
              checked={autoRefresh}
              onChange={() => {
                const next = !autoRefresh;
                saveAutoRefresh(localStorage, next);
                setAutoRefresh(next);
              }}
            />
            <span className="btn__label">{autoRefreshLabel(entries)}</span>
          </label>
        </div>
      </div>

      {visibleEntries.length === 0 ? (
        <p className="webcams__empty">No webcams match your filters</p>
      ) : null}

      {visibleEntries.length > 0 ? (
        <nav className="webcams__jumps" aria-label="Webcams sections">
          <span className="webcams__jumps-label">Jump to:</span>
          {imagesByRegion.map(([region]) => (
            <a
              key={region}
              className="webcams__jump"
              href={`#${sectionId(region)}`}
            >
              {regionLabel(region)}
            </a>
          ))}
          {live ? (
            <a className="webcams__jump" href="#webcams-live">
              Live cam
            </a>
          ) : null}
          {twitch ? (
            <a className="webcams__jump" href="#webcams-twitch">
              Twitch stream
            </a>
          ) : null}
          {linksByRegion.length > 0 ? (
            <a className="webcams__jump" href="#webcams-links">
              Webcam links
            </a>
          ) : null}
        </nav>
      ) : null}

      {imagesByRegion.map(([region, cards]) => (
        <section
          key={region}
          className="webcams__region"
          aria-labelledby={sectionId(region)}
        >
          <div className="webcams__region-heading">
            <h2 id={sectionId(region)}>{regionLabel(region)}</h2>
            <a className="webcams__jump" href="#webcams">
              Jump to top
            </a>
          </div>
          <div className="webcams__cards">
            {orderedCards(cards).map((card) => (
              <WebcamImageCard
                key={card.id}
                card={card}
                autoRefresh={autoRefresh}
                tabVisible={tabVisible}
                refreshNonce={refreshNonce}
                onHide={hideSource}
              />
            ))}
          </div>
        </section>
      ))}

      {live ? (
        <section className="webcams__region" aria-labelledby="webcams-live">
          <div className="webcams__region-heading">
            <h2 id="webcams-live">Live cam</h2>
            <a className="webcams__jump" href="#webcams">
              Jump to top
            </a>
          </div>
          <WebcamLiveCard
            entry={live}
            autoRefresh={autoRefresh}
            tabVisible={tabVisible}
            onHide={hideSource}
          />
        </section>
      ) : null}

      {twitch ? (
        <section className="webcams__region" aria-labelledby="webcams-twitch">
          <div className="webcams__region-heading">
            <h2 id="webcams-twitch">Twitch stream</h2>
            <a className="webcams__jump" href="#webcams">
              Jump to top
            </a>
          </div>
          <div className="webcam-card webcam-card--stream">
            <h3 className="webcam-card__title">{twitch.name}</h3>
            <iframe
              src={`https://player.twitch.tv/?channel=${twitch.twitchChannel}&parent=${parent}&autoplay=false&muted=true`}
              title={`${twitch.name} – live on Twitch`}
              height="360"
              width="640"
              allowFullScreen
              className="webcam-card__twitch"
            />
            <p className="webcam-card__attribution">
              Source:{" "}
              <a
                href={twitch.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {twitch.operator}
              </a>
            </p>
            {twitch.note ? (
              <p className="webcam-card__note">{twitch.note}</p>
            ) : null}
            <WebcamHideButton
              name={twitch.name}
              onHide={() => hideSource(twitch.id)}
            />
          </div>
        </section>
      ) : null}

      {linksByRegion.length > 0 ? (
        <section className="webcams__links" aria-labelledby="webcams-links">
          <div className="webcams__region-heading">
            <h2 id="webcams-links">Webcam links</h2>
            <a className="webcams__jump" href="#webcams">
              Jump to top
            </a>
          </div>
          {linksByRegion.map(([region, rows]) => (
            <div key={region} className="webcams__links-region">
              <h3 className="webcams__links-region-title">{regionLabel(region)}</h3>
              <ul className="webcams__links-list">
                {rows.map((row) => (
                  <li key={row.id} className="webcam-link-row">
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="webcam-link-row__name"
                    >
                      {row.name}
                    </a>
                    <span className="webcam-link-row__meta">
                      {row.region} · {row.operator}
                    </span>
                    <span className="webcam-link-row__kind">
                      {KIND_NOTES[row.kind]}
                    </span>
                    {row.note ? (
                      <span className="webcam-link-row__note">{row.note}</span>
                    ) : null}
                    <WebcamHideButton
                      className="webcam-link-row__hide"
                      name={row.name}
                      onHide={() => hideSource(row.id)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}

      <p className="webcams__more-note">
        Looking for more? The{" "}
        <a
          href="https://www.earthcam.com/mapsearch/"
          target="_blank"
          rel="noopener noreferrer"
        >
          EarthCam world map
        </a>{" "}
        finds webcams from around the world.
      </p>

      <WebcamFilterDialog
        dialogRef={filterDialogRef}
        presentRegions={presentRegions}
        draftRegions={draftRegions}
        onToggleRegion={toggleDraftRegion}
        onShowAll={() => setDraftRegions([])}
        onHideAll={() => setDraftRegions(presentRegions)}
        onApply={applyFilter}
        onCancel={() => filterDialogRef.current?.close()}
      />

      <WebcamHiddenDialog
        dialogRef={hiddenDialogRef}
        hiddenEntries={hiddenSourceEntries}
        onRestore={restoreSource}
        onRestoreAll={restoreAllHidden}
        onClose={() => hiddenDialogRef.current?.close()}
      />
    </div>
  );
};

export default Webcams;
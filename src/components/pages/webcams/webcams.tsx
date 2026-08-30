import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import FilterListIcon from "@mui/icons-material/FilterList";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

import "./webcams.scss";
import CollapsiblePanel from "../../CollapsiblePanel/CollapsiblePanel";
import {
  loadAutoRefresh,
  loadClosedPanels,
  loadFilteredRegions,
  loadHiddenSourceIds,
  saveAutoRefresh,
  saveClosedPanels,
  saveFilteredRegions,
  saveHiddenSourceIds,
} from "../../../data/webcam-storage";
import {
  webcamRegistry,
  WEBCAM_REGION_ORDER,
  type WebcamEntry,
  type WebcamImageEntry,
  type WebcamLinkEntry,
  type WebcamLiveEntry,
  type WebcamRegion,
  type WebcamTwitchEntry,
} from "../../../data/webcams";
import WebcamFilterDialog from "./WebcamFilterDialog";
import WebcamHiddenDialog from "./WebcamHiddenDialog";
import WebcamImageCard from "./WebcamImageCard";
import WebcamLiveCard from "./WebcamLiveCard";
import WebcamTwitchCard from "./WebcamTwitchCard";
import { CountryFlag, regionLabel } from "./webcam-card-parts";

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
  "UK",
  ...WEBCAM_REGION_ORDER.filter((region) => region !== "UK"),
];

const sectionId = (region: WebcamRegion): string => `webcams-region-${region}`;

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
    if (entry.type === type)
      map.get(entry.region as WebcamRegion)?.push(entry as T);
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
  const [closedPanels, setClosedPanels] = useState<string[]>(() =>
    loadClosedPanels(localStorage),
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

  // Collapsed section ids persist across visits, so a visitor's layout
  // survives a reload. Toggling is the only mutation, and a stale id of a
  // region removed from the registry stays inert in storage.
  const togglePanel = (panelId: string) => {
    const next = closedPanels.includes(panelId)
      ? closedPanels.filter((id) => id !== panelId)
      : [...closedPanels, panelId];
    saveClosedPanels(localStorage, next);
    setClosedPanels(next);
  };

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
    () =>
      groupByRegion<WebcamImageEntry>(
        visibleEntries,
        "image",
        WEBCAM_REGION_ORDER,
      ),
    [visibleEntries],
  );

  // One section per region holding any media – image cards plus the live cam
  // and the Twitch stream when they belong to the region. A region stays
  // alive while any of its media is visible, so hiding every image card of a
  // region doesn't silently drop its live cam.
  const mediaByRegion = useMemo(() => {
    const map = new Map<
      WebcamRegion,
      {
        cards: WebcamImageEntry[];
        live: WebcamLiveEntry | null;
        twitch: WebcamTwitchEntry | null;
      }
    >();
    for (const region of WEBCAM_REGION_ORDER) {
      map.set(region, { cards: [], live: null, twitch: null });
    }
    for (const entry of visibleEntries) {
      if (entry.type === "image") {
        map.get(entry.region)!.cards.push(entry);
      } else if (entry.type === "live") {
        map.get(entry.region)!.live = entry;
      } else if (entry.type === "twitch") {
        map.get(entry.region)!.twitch = entry;
      }
    }
    return [...map.entries()].filter(
      ([, media]) =>
        media.cards.length > 0 || media.live !== null || media.twitch !== null,
    );
  }, [visibleEntries]);

  const linksByRegion = useMemo(
    () =>
      groupByRegion<WebcamLinkEntry>(visibleEntries, "link", LINK_REGION_ORDER),
    [visibleEntries],
  );

  const parent = twitchParent();
  const tabVisible = useTabVisible();

  return (
    <div className="container webcams" id="webcams">
      <div className="webcams__header">
        <h1>Webcams</h1>

        <div className="webcams__toolbar">
          <button
            type="button"
            className="btn--icon"
            title="Refresh"
            aria-label="Refresh"
            onClick={() => setRefreshNonce((nonce) => nonce + 1)}
          >
            <RefreshIcon fontSize="small" />
            <span className="btn__label">Refresh</span>
          </button>
          <button
            type="button"
            className="btn--icon"
            title="Filter webcams by region"
            aria-label={
              appliedRegions.length > 0
                ? `Filter (${appliedRegions.length})`
                : "Filter"
            }
            ref={filterButtonRef}
            onClick={openFilterDialog}
          >
            <FilterListIcon fontSize="small" />
            <span className="btn__label">
              {appliedRegions.length > 0
                ? `Filter (${appliedRegions.length})`
                : "Filter"}
            </span>
          </button>
          <button
            type="button"
            className="btn--icon"
            title="Hidden sources"
            aria-label={`Hidden sources (${hiddenSourceEntries.length})`}
            ref={hiddenButtonRef}
            onClick={openHiddenDialog}
          >
            <VisibilityOffIcon fontSize="small" />
            <span className="btn__label">
              Hidden sources ({hiddenSourceEntries.length})
            </span>
          </button>
          <label className="btn--icon webcams__autorefresh">
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
          {mediaByRegion.map(([region]) => (
            <a
              key={region}
              className="webcams__jump"
              href={`#${sectionId(region)}`}
            >
              {regionLabel(region)}
            </a>
          ))}
          {linksByRegion.length > 0 ? (
            <a className="webcams__jump" href="#webcams-links">
              Webcam links
            </a>
          ) : null}
        </nav>
      ) : null}

      {mediaByRegion.map(([region, media]) => {
        return (
          <section
            key={region}
            className="webcams__region"
            aria-labelledby={sectionId(region)}
          >
            <CollapsiblePanel
              heading={<h2 id={sectionId(region)}>{regionLabel(region)}</h2>}
              bodyId={`${sectionId(region)}-body`}
              adornment={
                <a className="webcams__jump" href="#webcams">
                  Jump to top
                </a>
              }
              open={!closedPanels.includes(sectionId(region))}
              onToggle={() => togglePanel(sectionId(region))}
            >
              <div className="webcams__cards">
                {orderedCards(media.cards).map((card) => (
                  <WebcamImageCard
                    key={card.id}
                    card={card}
                    autoRefresh={autoRefresh}
                    tabVisible={tabVisible}
                    refreshNonce={refreshNonce}
                    onHide={hideSource}
                  />
                ))}
                {media.live ? (
                  <WebcamLiveCard
                    entry={media.live}
                    autoRefresh={autoRefresh}
                    tabVisible={tabVisible}
                    onHide={hideSource}
                  />
                ) : null}
                {media.twitch ? (
                  <WebcamTwitchCard
                    entry={media.twitch}
                    parent={parent}
                    onHide={hideSource}
                  />
                ) : null}
              </div>
            </CollapsiblePanel>
          </section>
        );
      })}

      {linksByRegion.length > 0 ? (
        <section className="webcams__links" aria-labelledby="webcams-links">
          <CollapsiblePanel
            heading={<h2 id="webcams-links">Webcam links</h2>}
            bodyId="webcams-links-body"
            adornment={
              <a className="webcams__jump" href="#webcams">
                Jump to top
              </a>
            }
            open={!closedPanels.includes("webcams-links")}
            onToggle={() => togglePanel("webcams-links")}
          >
            {linksByRegion.map(([region, rows]) => {
              // One flag on the group heading when every row shares a country
              // (e.g. UK); mixed groups like Nordic and Other regions show a
              // flag per row instead.
              const uniformCountry = rows.every(
                (row) => row.country === rows[0].country,
              );
              return (
                <div key={region} className="webcams__links-region">
                  <h3 className="webcams__links-region-title">
                    {uniformCountry ? (
                      <CountryFlag
                        country={rows[0].country}
                        className="webcam-links-region__flag"
                      />
                    ) : null}{" "}
                    {regionLabel(region)}
                  </h3>
                  <ul className="webcams__links-list">
                    {rows.map((row) => (
                      <li key={row.id} className="webcam-link-row">
                        {!uniformCountry ? (
                          <CountryFlag
                            country={row.country}
                            className="webcam-link-row__flag"
                          />
                        ) : null}
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="webcam-link-row__name"
                        >
                          {row.name}
                        </a>
                        <span className="webcam-link-row__meta">
                          {row.country} · {row.operator}
                        </span>
                        <span className="webcam-link-row__kind">
                          {KIND_NOTES[row.kind]}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </CollapsiblePanel>
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
        onSelectAll={() => setDraftRegions(presentRegions)}
        onDeselectAll={() => setDraftRegions([])}
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

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from "react";
import FilterListIcon from "@mui/icons-material/FilterList";
import PushPinIcon from "@mui/icons-material/PushPin";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

import "./webcams.scss";
import CollapsiblePanel from "../../CollapsiblePanel/CollapsiblePanel";
import { isSunBelowHorizon } from "../../../data/sun";
import {
  loadAutoRefresh,
  loadClosedPanels,
  loadFilteredRegions,
  loadHiddenSourceIds,
  loadPinnedIds,
  loadViewMode,
  saveAutoRefresh,
  saveClosedPanels,
  saveFilteredRegions,
  saveHiddenSourceIds,
  savePinnedIds,
  saveViewMode,
  type WebcamView,
} from "../../../data/webcam-storage";
import {
  webcamRegistry,
  CURATED_WEBCAM_IDS,
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

// Space-free id (North America → North-America): idrefs in aria-labelledby
// and aria-controls split on whitespace, so a raw region name would parse as
// two ids and leave the section and its disclosure unnamed.
const sectionId = (region: WebcamRegion): string =>
  `webcams-region-${region.replace(/\s+/g, "-")}`;

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

/** The three viewing modes in fixed tab order; "Relevant now" is the default. */
const VIEW_ORDER: readonly WebcamView[] = ["curated", "selection", "all"];

const VIEW_LABELS: Record<WebcamView, string> = {
  curated: "Relevant now",
  selection: "My selection",
  all: "All cameras",
};

const VIEW_DESCRIPTIONS: Record<WebcamView, string> = {
  curated:
    "Handpicked for reliability, image quality and maintenance. Each cam shows while it's dark at its location, between sunset and sunrise.",
  selection:
    "This is your personal gallery. The region filter and hidden sources apply here. Your device settings persist across visits.",
  all: "The complete gallery. Hiding and filtering do not apply here.",
};

/**
 * Curated live sky camera gallery (ADR-0004): one card per verified webcam,
 * the Lights over Lapland Twitch embed (never autoplaying), link rows for
 * video-only or unembeddable sources, and an honest "Looking for more?" note.
 * Freshness is honest by construction – browsers cannot read image timestamps
 * without CORS, so cards show "Loaded HH:MM · operator refreshes every N min".
 *
 * The three viewing modes share one gallery: "Relevant now" (the curated
 * list, dark-adapted per station and deaf to the user's filter/hidden
 * settings), "My selection" (the user's filter + hidden settings apply), and
 * "All cameras" (nothing filtered or hidden, ever). Switching tabs never
 * touches the persisted settings; the selected tab itself persists.
 */
const Webcams: React.FC<{
  entries?: WebcamEntry[];
  curatedIds?: readonly string[];
  now?: Date;
}> = ({
  entries = webcamRegistry,
  curatedIds = CURATED_WEBCAM_IDS,
  now: nowProp,
}) => {
  const [view, setView] = useState<WebcamView>(() =>
    loadViewMode(localStorage),
  );
  // The curated darkness gate re-evaluates every minute so sunrise and
  // sunset transitions apply without a manual refresh; tests pin `now`.
  const [now, setNow] = useState(() => nowProp ?? new Date());
  const [appliedRegions, setAppliedRegions] = useState<WebcamRegion[]>(() =>
    loadFilteredRegions(localStorage),
  );
  const [hiddenSourceIds, setHiddenSourceIds] = useState<string[]>(() =>
    loadHiddenSourceIds(localStorage),
  );
  const [autoRefresh, setAutoRefresh] = useState<boolean>(() =>
    loadAutoRefresh(localStorage),
  );
  const [pinnedIds, setPinnedIds] = useState<string[]>(() =>
    loadPinnedIds(localStorage),
  );
  const [pinMode, setPinMode] = useState(false);
  const [draftPins, setDraftPins] = useState<string[]>([]);
  const [closedPanels, setClosedPanels] = useState<string[]>(() =>
    loadClosedPanels(localStorage),
  );
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [draftRegions, setDraftRegions] = useState<WebcamRegion[]>([]);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const filterDialogRef = useRef<HTMLDialogElement>(null);
  const hiddenButtonRef = useRef<HTMLButtonElement>(null);
  const hiddenDialogRef = useRef<HTMLDialogElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useDialogFocusReturn(filterDialogRef, filterButtonRef);
  useDialogFocusReturn(hiddenDialogRef, hiddenButtonRef);

  useEffect(() => {
    setNow(nowProp ?? new Date());
    if (nowProp) return;
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, [nowProp]);

  const selectView = (next: WebcamView) => {
    saveViewMode(localStorage, next);
    setView(next);
  };

  // Automatic-activation tabs: arrow keys and Home/End move focus and switch
  // the view in one stroke; the inactive tabs stay out of the tab order.
  const onTablistKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const index = VIEW_ORDER.indexOf(view);
    let next = -1;
    if (event.key === "ArrowRight") next = (index + 1) % VIEW_ORDER.length;
    else if (event.key === "ArrowLeft")
      next = (index - 1 + VIEW_ORDER.length) % VIEW_ORDER.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = VIEW_ORDER.length - 1;
    if (next < 0) return;
    event.preventDefault();
    selectView(VIEW_ORDER[next]);
    tabRefs.current[next]?.focus();
  };

  // The checklist offers every region present in the registry, in the fixed
  // display order; absent regions don't render, so a removed region disappears
  // from the filter too.
  const presentRegions = WEBCAM_REGION_ORDER.filter((region) =>
    entries.some((entry) => entry.region === region),
  );

  // The curated gallery: handpicked image cards in their fixed order, each
  // shown only while the sun is below its station's horizon (twilight counts
  // as dark), plus the Lights over Lapland Twitch stream. The user's filter
  // and hidden settings are deliberately ignored here.
  const curatedEntries = useMemo(() => {
    const curated: WebcamEntry[] = curatedIds
      .map((id) => entries.find((entry) => entry.id === id))
      .filter((entry): entry is WebcamImageEntry => entry?.type === "image")
      .filter(
        (entry) =>
          entry.longitude === undefined ||
          isSunBelowHorizon(entry.latitude, entry.longitude, now),
      );
    const twitch = entries.find((entry) => entry.type === "twitch");
    return twitch ? [...curated, twitch] : curated;
  }, [curatedIds, entries, now]);

  // The curated gallery renders as one flat card grid – no region groupings –
  // so the image cards and the Twitch stream are split out for that layout.
  const curatedCards = useMemo(
    () => ({
      images: curatedEntries.filter(
        (entry): entry is WebcamImageEntry => entry.type === "image",
      ),
      twitch:
        curatedEntries.find(
          (entry): entry is WebcamTwitchEntry => entry.type === "twitch",
        ) ?? null,
    }),
    [curatedEntries],
  );

  // Hidden sources leave the gallery entirely (their images are never
  // fetched) and the region filter narrows cards, the Twitch card and link
  // rows alike – but only in "My selection". "All cameras" shows everything,
  // "Relevant now" shows the curated set.
  const visibleEntries = useMemo(() => {
    if (view === "curated") return curatedEntries;
    if (view === "all") return entries;
    return entries.filter(
      (entry) =>
        !hiddenSourceIds.includes(entry.id) &&
        (appliedRegions.length === 0 || appliedRegions.includes(entry.region)),
    );
  }, [view, curatedEntries, entries, hiddenSourceIds, appliedRegions]);

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

  // Pinning mode drafts 1-2 ids and only commits them on Apply, so Cancel
  // leaves the persisted pins untouched; the draft starts from the applied
  // pins so toggling the mode is never destructive.
  const togglePinMode = () => {
    if (pinMode) {
      setPinMode(false);
    } else {
      setDraftPins(loadPinnedIds(localStorage));
      setPinMode(true);
    }
  };

  const toggleDraftPin = (id: string) => {
    setDraftPins((draft) =>
      draft.includes(id)
        ? draft.filter((pinnedId) => pinnedId !== id)
        : [...draft, id].slice(0, 2),
    );
  };

  const applyPins = () => {
    savePinnedIds(localStorage, draftPins);
    setPinnedIds(draftPins);
    setPinMode(false);
  };

  const cancelPins = () => setPinMode(false);

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

  // A pinned cam can sit outside the current view (a hidden source, a cam
  // the region filter excludes, a live cam absent from the curated list…).
  // Those pins are invisible as card checkboxes, so pinning mode lists them
  // in the strip with their own Unpin toggles – otherwise two off-screen pins
  // would lock every visible checkbox with no way to free a slot.
  const visibleEntryIds = useMemo(
    () => new Set(visibleEntries.map((entry) => entry.id)),
    [visibleEntries],
  );
  const pinnedOffscreen = useMemo(
    () =>
      pinnedIds
        .map((id) => entries.find((entry) => entry.id === id))
        .filter((entry): entry is WebcamEntry => entry !== undefined)
        .filter((entry) => !visibleEntryIds.has(entry.id)),
    [pinnedIds, entries, visibleEntryIds],
  );

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
  // The UI contract is 1 or 2 pins – further unchecked boxes lock once the
  // draft holds two, so the user can't over-commit before Apply.
  const pinDisabled = draftPins.length >= 2;
  // Hiding is a "My selection" preference: the curated list ignores it and
  // "All cameras" has no hiding, so the per-card Hide buttons only render in
  // the selection view, as do the Filter and Hidden sources toolbar buttons.
  const canHide = view === "selection";

  return (
    <div className="container webcams" id="webcams">
      <div className="webcams__header">
        <h1>Webcams</h1>
        <div
          className="webcams__tablist"
          role="tablist"
          aria-label="Webcam views"
          onKeyDown={onTablistKeyDown}
        >
          {VIEW_ORDER.map((viewKey, index) => (
            <button
              key={viewKey}
              type="button"
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              role="tab"
              id={`webcams-view-tab-${viewKey}`}
              aria-selected={view === viewKey}
              aria-controls="webcams-view-panel"
              tabIndex={view === viewKey ? 0 : -1}
              className={`webcams__tablist__tab${
                view === viewKey ? " webcams__tablist__tab--active" : ""
              }`}
              onClick={() => selectView(viewKey)}
            >
              {VIEW_LABELS[viewKey]}
            </button>
          ))}
        </div>
      </div>

      <div
        role="tabpanel"
        id="webcams-view-panel"
        aria-labelledby={`webcams-view-tab-${view}`}
        className="webcams__view-panel"
      >
        <p className="webcams__view-desc">{VIEW_DESCRIPTIONS[view]}</p>

        <div className="webcams__toolbar">
          <button
            type="button"
            className="btn--secondary"
            title="Refresh"
            onClick={() => setRefreshNonce((nonce) => nonce + 1)}
          >
            <RefreshIcon fontSize="small" />
            <span className="btn__label">Refresh</span>
          </button>
          {canHide ? (
            <button
              type="button"
              className="btn--secondary"
              ref={filterButtonRef}
              onClick={openFilterDialog}
              title={`Filter by region (${appliedRegions.length})`}
            >
              <FilterListIcon fontSize="small" />
              <span className="btn__label">
                {appliedRegions.length > 0
                  ? `Filter (${appliedRegions.length})`
                  : "Filter"}
              </span>
            </button>
          ) : null}
          {canHide ? (
            <button
              type="button"
              className="btn--secondary"
              ref={hiddenButtonRef}
              onClick={openHiddenDialog}
              title={`Hidden sources (${hiddenSourceEntries.length})`}
            >
              <VisibilityOffIcon fontSize="small" />
              <span className="btn__label">
                Hidden sources ({hiddenSourceEntries.length})
              </span>
            </button>
          ) : null}
          <button
            type="button"
            className="btn--secondary webcams__pin-toggle"
            title="Pin webcam to dashboard"
            aria-expanded={pinMode}
            aria-controls="webcams-pin-strip"
            onClick={togglePinMode}
          >
            <PushPinIcon fontSize="small" />
            <span className="btn__label">Pin webcam to dashboard</span>
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

        {pinMode ? (
          <div className="webcams__pin-strip" id="webcams-pin-strip">
            <p className="webcams__pin-strip__note">
              Pin 1 or 2 webcams that you would like to include in your
              Dashboard.
            </p>
            {pinnedOffscreen.length > 0 ? (
              <div className="webcams__pin-strip__offscreen">
                <p className="webcams__pin-strip__offscreen-note">
                  Pinned but not shown in this view – uncheck to unpin:
                </p>
                {pinnedOffscreen.map((entry) => (
                  <label
                    key={entry.id}
                    className="btn--secondary webcams__pin-strip__offscreen-row"
                  >
                    <input
                      type="checkbox"
                      className="webcams__pin-strip__offscreen-row__checkbox"
                      title={`Unpin ${entry.name}`}
                      checked={draftPins.includes(entry.id)}
                      onChange={() => toggleDraftPin(entry.id)}
                    />
                    <span className="btn__label">
                      <PushPinIcon
                        className="webcams__pin-strip__offscreen-icon"
                        aria-hidden="true"
                        fontSize="inherit"
                      />{" "}
                      Unpin {entry.name}
                    </span>
                  </label>
                ))}
              </div>
            ) : null}
            <div className="webcams__pin-strip__actions">
              <button
                type="button"
                className="btn--secondary"
                onClick={cancelPins}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn--primary"
                onClick={applyPins}
              >
                Apply
              </button>
            </div>
          </div>
        ) : null}

        {view === "selection" && visibleEntries.length === 0 ? (
          <p className="webcams__empty">No webcams match your filters</p>
        ) : null}

        {view === "curated" ? (
          // The curated gallery is one flat card grid: no region groupings,
          // no collapsible sections – every dark-side cam in one row.
          <div className="webcams__cards">
            {orderedCards(curatedCards.images).map((card) => (
              <WebcamImageCard
                key={card.id}
                card={card}
                autoRefresh={autoRefresh}
                tabVisible={tabVisible}
                canHide={canHide}
                refreshNonce={refreshNonce}
                onHide={hideSource}
                pinMode={pinMode}
                pinned={draftPins.includes(card.id)}
                pinDisabled={pinDisabled}
                onTogglePin={toggleDraftPin}
              />
            ))}
            {curatedCards.twitch ? (
              <WebcamTwitchCard
                entry={curatedCards.twitch}
                parent={parent}
                canHide={canHide}
                onHide={hideSource}
                pinMode={pinMode}
                pinned={draftPins.includes(curatedCards.twitch.id)}
                pinDisabled={pinDisabled}
                onTogglePin={toggleDraftPin}
              />
            ) : null}
          </div>
        ) : (
          <>
            {visibleEntries.length > 0 ? (
              <nav
                className="webcams__jumps"
                aria-labelledby="webcams-sections-label"
              >
                <span className="sr-only" id="webcams-sections-label">
                  Webcams sections
                </span>
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
                    heading={
                      <h2 id={sectionId(region)}>{regionLabel(region)}</h2>
                    }
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
                          canHide={canHide}
                          refreshNonce={refreshNonce}
                          onHide={hideSource}
                          pinMode={pinMode}
                          pinned={draftPins.includes(card.id)}
                          pinDisabled={pinDisabled}
                          onTogglePin={toggleDraftPin}
                        />
                      ))}
                      {media.live ? (
                        <WebcamLiveCard
                          entry={media.live}
                          autoRefresh={autoRefresh}
                          tabVisible={tabVisible}
                          canHide={canHide}
                          onHide={hideSource}
                          pinMode={pinMode}
                          pinned={draftPins.includes(media.live.id)}
                          pinDisabled={pinDisabled}
                          onTogglePin={toggleDraftPin}
                        />
                      ) : null}
                      {media.twitch ? (
                        <WebcamTwitchCard
                          entry={media.twitch}
                          parent={parent}
                          canHide={canHide}
                          onHide={hideSource}
                          pinMode={pinMode}
                          pinned={draftPins.includes(media.twitch.id)}
                          pinDisabled={pinDisabled}
                          onTogglePin={toggleDraftPin}
                        />
                      ) : null}
                    </div>
                  </CollapsiblePanel>
                </section>
              );
            })}

            {linksByRegion.length > 0 ? (
              <section
                className="webcams__links"
                aria-labelledby="webcams-links"
              >
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
                    // One flag on the group heading when every row shares a
                    // country (e.g. UK); mixed groups like Nordic and Other
                    // regions show a flag per row instead.
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
                              <span className="webcam-link-row__kind">
                                {KIND_NOTES[row.kind]}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
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
                </CollapsiblePanel>
              </section>
            ) : null}
          </>
        )}
      </div>

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

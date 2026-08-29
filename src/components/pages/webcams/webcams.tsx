import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";

import "./webcams.scss";
import FullSizeModal from "../../FullSizeModal";
import {
  loadFilteredRegions,
  loadHiddenSourceIds,
  saveFilteredRegions,
  saveHiddenSourceIds,
} from "../../../data/webcam-storage";
import {
  webcamRegistry,
  webcamCountryCode,
  WEBCAM_REGION_ORDER,
  type WebcamEntry,
  type WebcamImageEntry,
  type WebcamLinkEntry,
  type WebcamRegion,
} from "../../../data/webcams";

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
  "http-only": "HTTP-only still",
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

const regionLabel = (region: WebcamRegion): string =>
  region === "rest" ? "Other regions" : region;

const formatLatitude = (latitude: number): string =>
  `${Math.abs(latitude).toFixed(1)}°${latitude < 0 ? "S" : "N"}`;

const sectionId = (region: WebcamRegion): string =>
  `webcams-region-${region}`;

/** Flagcdn.com flag URLs per flagpedia's download API (16×12 base, 2x/3x retina). */
const flagSrc = (code: string, size: "16x12" | "32x24" | "48x36"): string =>
  `https://flagcdn.com/${size}/${code}.png`;

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
  const loadedAt = useMemo(
    () =>
      new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    [],
  );

  const parent = twitchParent();

  return (
    <div className="container webcams" id="webcams">
      <h1>Webcams</h1>

      <div className="webcams__toolbar">
        <button
          type="button"
          className="webcams__button"
          ref={filterButtonRef}
          onClick={openFilterDialog}
        >
          {appliedRegions.length > 0
            ? `Filter (${appliedRegions.length})`
            : "Filter"}
        </button>
        <button
          type="button"
          className="webcams__button"
          ref={hiddenButtonRef}
          onClick={openHiddenDialog}
        >
          Hidden sources ({hiddenSourceEntries.length})
        </button>
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
            <a className="webcams__top" href="#webcams">
              Jump to top
            </a>
          </div>
          <div className="webcams__cards">
            {orderedCards(cards).map((card) => {
              const code = webcamCountryCode(card.country);
              return (
                <article
                  key={card.id}
                  className={`webcam-card${
                    card.panoramic ? " webcam-card--panoramic" : ""
                  }`}
                >
                  <h3 className="webcam-card__title">
                    <img
                      className="webcam-card__flag"
                      src={flagSrc(code, "16x12")}
                      srcSet={`${flagSrc(code, "32x24")} 2x, ${flagSrc(
                        code,
                        "48x36",
                      )} 3x`}
                      width={16}
                      height={12}
                      alt={card.country}
                      title={card.country}
                      loading="lazy"
                    />{" "}
                    {card.name} · {formatLatitude(card.latitude)}
                  </h3>
                <FullSizeModal
                  label={`${card.name}, full size`}
                  trigger={
                    <img
                      src={card.imageUrl}
                      alt={card.alt}
                      className="webcam-card__img"
                    />
                  }
                  triggerClassName="webcam-card__trigger"
                >
                  <img src={card.imageUrl} alt={card.alt} />
                </FullSizeModal>
                <p className="webcam-card__freshness">
                  Loaded {loadedAt} · operator refreshes every {card.cadenceMinutes}{" "}
                  min
                </p>
                {card.note ? (
                  <p className="webcam-card__note">{card.note}</p>
                ) : null}
                <p className="webcam-card__attribution">
                  Source:{" "}
                  <a
                    href={card.siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {card.operator}
                  </a>
                </p>
                <button
                  type="button"
                  className="webcam-card__hide webcams__button webcams__button--small"
                  aria-label={`Hide ${card.name}`}
                  onClick={() => hideSource(card.id)}
                >
                  Hide
                </button>
              </article>
              );
            })}
          </div>
        </section>
      ))}

      {twitch ? (
        <section className="webcams__region" aria-labelledby="webcams-twitch">
          <div className="webcams__region-heading">
            <h2 id="webcams-twitch">Twitch stream</h2>
            <a className="webcams__top" href="#webcams">
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
            <button
              type="button"
              className="webcam-card__hide webcams__button webcams__button--small"
              aria-label={`Hide ${twitch.name}`}
              onClick={() => hideSource(twitch.id)}
            >
              Hide
            </button>
          </div>
        </section>
      ) : null}

      {linksByRegion.length > 0 ? (
        <section className="webcams__links" aria-labelledby="webcams-links">
          <div className="webcams__region-heading">
            <h2 id="webcams-links">Webcam links</h2>
            <a className="webcams__top" href="#webcams">
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
                    <button
                      type="button"
                      className="webcam-link-row__hide webcams__button webcams__button--small"
                      aria-label={`Hide ${row.name}`}
                      onClick={() => hideSource(row.id)}
                    >
                      Hide
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}

      <p className="webcams__more-note">
        Looking for more? No verified embeddable cams exist yet in
        NZ/Tasmania, Siberia, the UK, or Iceland – the link rows above are what
        those operators offer. For anything else, the{" "}
        <a
          href="https://www.earthcam.com/mapsearch/"
          target="_blank"
          rel="noopener noreferrer"
        >
          EarthCam world map
        </a>{" "}
        finds webcams everywhere.
      </p>

      <dialog
        ref={filterDialogRef}
        className="webcams__dialog webcams__filter-dialog"
        aria-labelledby="webcams-filter-title"
      >
        <h2 id="webcams-filter-title" className="webcams__dialog-title">Filter webcams by region</h2>
        <p className="webcams__dialog-hint">
          Check the regions to keep; leave every box unchecked to show all
          webcams.
        </p>
        <ul className="webcams__filter-list">
          {presentRegions.map((region) => (
            <li key={region} className="webcams__filter-option">
              <label className="webcams__filter-option__label">
                <input
                  type="checkbox"
                  className="webcams__filter-option__checkbox"
                  name={region}
                  checked={draftRegions.includes(region)}
                  onChange={() => toggleDraftRegion(region)}
                />
                {regionLabel(region)}
              </label>
            </li>
          ))}
        </ul>
        <div className="webcams__dialog-actions">
          <button
            type="button"
            className="webcams__button"
            onClick={() => setDraftRegions([])}
          >
            Show all
          </button>
          <button
            type="button"
            className="webcams__button"
            onClick={() => setDraftRegions(presentRegions)}
          >
            Hide all
          </button>
          <button
            type="button"
            className="webcams__button"
            onClick={() => filterDialogRef.current?.close()}
          >
            Cancel
          </button>
          <button type="button" className="webcams__button" onClick={applyFilter}>
            Apply
          </button>
        </div>
      </dialog>

      <dialog
        ref={hiddenDialogRef}
        className="webcams__dialog webcams__hidden-dialog"
        aria-labelledby="webcams-hidden-title"
      >
        <h2 id="webcams-hidden-title" className="webcams__dialog-title">Hidden sources</h2>
        {hiddenSourceEntries.length === 0 ? (
          <p className="webcams__dialog-note">No hidden sources.</p>
        ) : (
          <ul className="webcams__hidden-list">
            {hiddenSourceEntries.map((entry) => (
              <li key={entry.id} className="webcams__hidden-row">
                <span className="webcams__hidden-name">
                  {entry.name}{" "}
                  <span className="webcams__hidden-meta">
                    {regionLabel(entry.region)}
                  </span>
                </span>
                <button
                  type="button"
                  className="webcams__button webcams__button--small"
                  aria-label={`Show ${entry.name}`}
                  onClick={() => restoreSource(entry.id)}
                >
                  Show
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="webcams__dialog-actions">
          <button
            type="button"
            className="webcams__button"
            onClick={restoreAllHidden}
            disabled={hiddenSourceEntries.length === 0}
          >
            Show all
          </button>
          <button
            type="button"
            className="webcams__button"
            onClick={() => hiddenDialogRef.current?.close()}
          >
            Close
          </button>
        </div>
      </dialog>
    </div>
  );
};

export default Webcams;
import { useMemo } from "react";

import "./webcams.scss";
import FullSizeModal from "../../FullSizeModal";
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
  const imagesByRegion = useMemo(
    () => groupByRegion<WebcamImageEntry>(entries, "image", WEBCAM_REGION_ORDER),
    [entries],
  );

  const linksByRegion = useMemo(
    () => groupByRegion<WebcamLinkEntry>(entries, "link", LINK_REGION_ORDER),
    [entries],
  );

  const twitch = entries.find((entry) => entry.type === "twitch");
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

      <nav className="webcams__jumps" aria-label="Webcams sections">
        <span className="webcams__jumps-label">Jump to:</span>
        {imagesByRegion.map(([region]) => (
          <a key={region} className="webcams__jump" href={`#${sectionId(region)}`}>
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
    </div>
  );
};

export default Webcams;
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import PushPinIcon from "@mui/icons-material/PushPin";

import FullSizeModal from "../../FullSizeModal";
import { webcamCountryCode, type WebcamRegion } from "../../../data/webcams";

/** Flag + "Station · 69.6°N" title shared by the image and live cards. */
export const WebcamCardTitle: React.FC<{
  country: string;
  name: string;
  latitude: number;
}> = ({ country, name, latitude }) => (
  <h3 className="webcam-card__title">
    <CountryFlag country={country} className="webcam-card__flag" /> {name} ·{" "}
    {formatLatitude(latitude)}
  </h3>
);

/** Small country flag (flagcdn 16×12 base, 2x/3x retina) with the country as alt/title. */
export const CountryFlag: React.FC<{
  country: string;
  className?: string;
}> = ({ country, className = "" }) => (
  <img
    className={className}
    src={flagSrc(webcamCountryCode(country), "16x12")}
    srcSet={`${flagSrc(webcamCountryCode(country), "32x24")} 2x, ${flagSrc(
      webcamCountryCode(country),
      "48x36",
    )} 3x`}
    width={16}
    height={12}
    alt={country}
    title={country}
    loading="lazy"
  />
);

/** Full-size view wrapper shared by the image and live cards. */
export const WebcamCardImage: React.FC<{
  label: string;
  src: string;
  alt: string;
}> = ({ label, src, alt }) => (
  <FullSizeModal
    label={label}
    // The button is named by sr-only text inside FullSizeModal, so the img
    // alt stays a plain image description without joining the button name
    trigger={<img src={src} alt={alt} className="webcam-card__img" />}
    triggerClassName="webcam-card__trigger"
  >
    <img src={src} alt={alt} />
  </FullSizeModal>
);

/** "Source: {operator}" attribution link shared by the image and live cards. */
export const WebcamCardAttribution: React.FC<{
  operator: string;
  siteUrl: string;
}> = ({ operator, siteUrl }) => (
  <p className="webcam-card__attribution">
    Source:{" "}
    <a href={siteUrl} target="_blank" rel="noopener noreferrer">
      {operator}
    </a>
  </p>
);

/**
 * Icon Hide control shared by every gallery item (image card, live card,
 * Twitch card): a crossed-out-eye glyph in the card title row, with the
 * station in the tooltip and the accessible name. Never shows visible text –
 * the sr-only span carries the same name as the title attribute.
 */
export const WebcamHideButton: React.FC<{
  name: string;
  onHide: () => void;
  className?: string;
}> = ({ name, onHide, className = "" }) => {
  const label = `Hide ${name}`;
  return (
    <button
      type="button"
      className={`btn--icon webcam-card__hide${className ? ` ${className}` : ""}`}
      title={label}
      onClick={onHide}
    >
      <VisibilityOffIcon fontSize="small" />
      <span className="sr-only">{label}</span>
    </button>
  );
};

/** Props every gallery card (image or live) needs from the page. */
export interface WebcamCardBaseProps {
  autoRefresh: boolean;
  tabVisible: boolean;
  /** Hiding is a "My selection" preference – the Hide button renders only in that view. */
  canHide: boolean;
  onHide: (id: string) => void;
}

/** Pin-mode props: a card renders its "Pin {name} webcam" checkbox while the page's pinning mode is active. */
export interface WebcamPinProps {
  pinMode: boolean;
  pinned: boolean;
  /** Disabled once two pins are drafted – the UI contract is 1 or 2. */
  pinDisabled: boolean;
  onTogglePin: (id: string) => void;
}

/**
 * "Pin {name} webcam" checkbox shown on a card while the webcams page is in
 * pinning mode. A plain <label> with the visible text at every screen size –
 * never collapsed, unlike button labels. The 📌 glyph leads the text and is
 * aria-hidden, so the accessible name stays the plain text.
 */
export const WebcamPinToggle: React.FC<{
  id: string;
  name: string;
  pinMode: boolean;
  pinned: boolean;
  pinDisabled: boolean;
  onTogglePin: (id: string) => void;
}> = ({ id, name, pinMode, pinned, pinDisabled, onTogglePin }) => {
  if (!pinMode) return null;
  return (
    <label className="webcam-card__pin">
      <input
        type="checkbox"
        className="webcam-card__pin__checkbox"
        checked={pinned}
        disabled={pinDisabled && !pinned}
        onChange={() => onTogglePin(id)}
      />
      <span>
        <PushPinIcon
          className="webcam-card__pin__checkbox__pin-icon"
          aria-hidden="true"
          fontSize="inherit"
        />{" "}
        Pin {name} webcam
      </span>
    </label>
  );
};

export const regionLabel = (region: WebcamRegion): string =>
  region === "rest" ? "Other regions" : region;

export const formatLatitude = (latitude: number): string =>
  `${Math.abs(latitude).toFixed(1)}°${latitude < 0 ? "S" : "N"}`;

/** Flagcdn.com flag URLs per flagpedia's download API (16×12 base, 2x/3x retina). */
export const flagSrc = (
  code: string,
  size: "16x12" | "32x24" | "48x36",
): string => `https://flagcdn.com/${size}/${code}.png`;

export const formatLoadedTime = (): string =>
  new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

/** Cache-busts a still so the browser can't serve a stale frame. */
export const cacheBustedSrc = (url: string): string => `${url}?t=${Date.now()}`;

/**
 * Extracts the current frame path from the operator's SSE data line, which is
 * a JSON object of cameras (`{ "0": "PKR/tagged_cam/PKR_260829140029.jpg", … }`);
 * returns null when the payload isn't that shape.
 */
export const parseSseFramePath = (raw: string): string | null => {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const first = Object.values(parsed)[0];
    return typeof first === "string" && first.length > 0 ? first : null;
  } catch {
    return null;
  }
};

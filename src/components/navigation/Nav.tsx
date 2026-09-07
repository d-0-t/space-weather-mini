import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SettingsIcon from "@mui/icons-material/Settings";

import "./Nav.scss";
import TimeModal from "./TimeModal";
import { useDisplayTimezone } from "../DisplayTimezone/DisplayTimezoneContext";

const ASTRO_MODE_KEY = "astro-mode";
const ASTRO_FILTER =
  "sepia(1) saturate(5) hue-rotate(-39deg) contrast(1.1) brightness(0.9)";

interface DropdownItem {
  to: string;
  label: string;
}

/** The Details submenu destinations: the six forecast products. */
const FORECAST_ITEMS: readonly DropdownItem[] = [
  { to: "/forecasts/daily", label: "Daily Data" },
  { to: "/forecasts/3days", label: "3-Day Forecast" },
  { to: "/forecasts/27days", label: "27 Day Outlook" },
  { to: "/forecasts/weekly", label: "Weekly Report" },
  { to: "/forecasts/geoalert", label: "Geophysical Alert" },
  { to: "/forecasts/discussion", label: "Forecast Discussion" },
];

/** The About submenu (ticket 01): This site / Sources / Explainers. */
const ABOUT_ITEMS: readonly DropdownItem[] = [
  { to: "/about", label: "This site" },
  { to: "/about/sources", label: "Sources" },
  { to: "/explainers", label: "Explainers" },
];

/**
 * Closes the primary-menu disclosures – all of them, or all but one. The
 * exclusive accordion and the panel-close share this walk.
 */
const closeDisclosures = (except?: HTMLDetailsElement): void => {
  document
    .querySelectorAll<HTMLDetailsElement>(".header__menu details")
    .forEach((details) => {
      if (details !== except) details.open = false;
    });
};

interface NavDisclosureProps {
  /** Stable id of the details element, the seam the e2e journeys target. */
  id: string;
  /** The visible label of the summary trigger. */
  triggerLabel: string;
  /** The sr-only label of the submenu list, announced instead of aria-label. */
  submenuLabel: string;
  submenuId: string;
  items: readonly DropdownItem[];
  /** Escape handler from Nav: closes and refocuses outside the mobile panel. */
  onEscape: (event: React.KeyboardEvent<HTMLDetailsElement>) => void;
  /** Focusout handler from Nav: closes the disclosure on wide screens. */
  onFocusOut: (event: React.FocusEvent<HTMLDetailsElement>) => void;
}

/**
 * One collapsible disclosure of the primary menu, built on the native
 * details/summary element: the browser owns the open/close toggle and the
 * collapsed/expanded announcement, so no aria-expanded bookkeeping or open
 * state lives here. The handlers add what the native element lacks: Enter
 * and Space activation parity (the keyboard shim), Esc-to-close with focus
 * return, focusout-close, and the exclusive accordion – opening one submenu
 * closes the other.
 */
const NavDisclosure: React.FC<NavDisclosureProps> = ({
  id,
  triggerLabel,
  submenuLabel,
  submenuId,
  items,
  onEscape,
  onFocusOut,
}) => (
  <li className="dropdown">
    <details id={id} onKeyDown={onEscape} onBlur={onFocusOut}>
      <summary
        className="nava dropdown__trigger"
        onClick={(event) => {
          // Activation toggles natively; opening one closes the other
          const details = event.currentTarget.closest("details")!;
          if (!details.open) closeDisclosures(details);
        }}
        onKeyDown={(event) => {
          // jsdom never runs the summary's native Enter/Space toggle, so the
          // shim keeps activation identical in every environment
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          const details = event.currentTarget.closest("details")!;
          details.open = !details.open;
          if (details.open) closeDisclosures(details);
        }}
      >
        {triggerLabel}
        <ExpandMoreIcon
          className="dropdown__chevron"
          fontSize="small"
          aria-hidden="true"
        />
      </summary>
      <ul
        className="dropdown-content"
        id={submenuId}
        aria-labelledby={`${submenuId}-label`}
      >
        <li className="sr-only" id={`${submenuId}-label`}>
          {submenuLabel}
        </li>
        {items.map((item) => (
          <li key={item.to}>
            <Link to={item.to}>{item.label}</Link>
          </li>
        ))}
      </ul>
    </details>
  </li>
);

/**
 * Primary navigation – header banner with nav landmark. The logo and title
 * link back to the dashboard. On wide screens the links sit in a horizontal
 * bar; on narrow screens a hamburger button (aria-expanded/aria-controls)
 * reveals the same list as a full-screen panel over a dimmed backdrop –
 * tapping the backdrop closes the panel, while panel controls (submenus,
 * links) do not.
 * The Forecasts & Discussion and About items are native details/summary
 * disclosures that open on activation only – no hover. Escape closes them
 * and returns focus to their trigger (or to the hamburger inside the panel).
 */
const Nav: React.FC = () => {
  const { displayTimezone } = useDisplayTimezone();
  const [menuOpen, setMenuOpen] = useState(false);
  const [timeModalOpen, setTimeModalOpen] = useState(false);
  const [isAstro, setIsAstro] = useState(
    () => localStorage.getItem(ASTRO_MODE_KEY) === "on",
  );
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const timeButtonRef = useRef<HTMLButtonElement>(null);
  const menuId = "primary-menu";
  const closeTimeModal = () => setTimeModalOpen(false);
  // The label carries the current setting ("Time (local)" / "Time (UTC)") and
  // is the button's only name: no tooltip title, and the label stays visible
  // at every width (it opts out of the icon-only collapse below 1000px).
  const timeLabel = `Time (${displayTimezone === "utc" ? "UTC" : "local"})`;

  useEffect(() => {
    document.body.style.filter = isAstro ? ASTRO_FILTER : "";
    document.body.style.overflow = menuOpen ? "hidden" : "";
  }, [isAstro, menuOpen]);

  const toggleAstro = () => {
    const next = !isAstro;
    setIsAstro(next);
    localStorage.setItem(ASTRO_MODE_KEY, next ? "on" : "off");
  };

  const closeMenu = () => {
    // Closing the panel also closes any open submenu disclosure
    closeDisclosures();
    setMenuOpen(false);
  };

  const toggleMenu = () => {
    if (menuOpen) {
      closeMenu();
    } else {
      setMenuOpen(true);
    }
  };

  // Wide bar: one Escape closes the submenu and returns focus to its trigger.
  // Inside the mobile panel the event falls through to the nav-level Escape,
  // which closes the panel (and every submenu) and refocuses the hamburger.
  const handleDisclosureKeyDown = (
    event: React.KeyboardEvent<HTMLDetailsElement>,
  ) => {
    const details = event.currentTarget;
    if (event.key !== "Escape" || !details.open) return;
    if (menuOpen) return;
    details.open = false;
    details.querySelector("summary")?.focus();
  };

  // Wide bar: focus leaving the disclosure tree closes it. Inside the mobile
  // panel focusout-close is skipped: closing here collapses the inline
  // submenu before the click that moved focus completes, the shift moves the
  // next trigger out from under the pointer, and the mis-aimed click hits the
  // panel surface – closing the whole menu (the glitch the user reported).
  // In-panel switches close the old submenu inside the click instead, via
  // the exclusive accordion.
  const handleDisclosureFocusOut = (
    event: React.FocusEvent<HTMLDetailsElement>,
  ) => {
    if (menuOpen) return;
    // Close when focus leaves the entire disclosure tree
    const next = event.relatedTarget as HTMLElement | null;
    if (!next || !event.currentTarget.contains(next)) {
      event.currentTarget.open = false;
    }
  };

  const handleNavKeyDown: React.KeyboardEventHandler<HTMLElement> = (event) => {
    if (event.key === "Escape" && menuOpen) {
      closeMenu();
      hamburgerRef.current?.focus();
    }
  };

  const handleMenuClick: React.MouseEventHandler<HTMLUListElement> = (
    event,
  ) => {
    const target = event.target as HTMLElement;
    // Navigation links close the panel (and navigate)
    if (target.closest("a")) {
      closeMenu();
      return;
    }
    // Controls (submenu summaries, astro toggle) keep the panel open
    if (target.closest("summary, button")) return;
    // Any other tap on the panel surface closes it
    closeMenu();
  };

  return (
    <header className="header">
      <Link to="/" className="header__left">
        <img
          src="/assets/icon-192.png"
          className="header__left__logo"
          alt="App logo with aurora bird"
        />
        <div className="header__left__title">Space Weather Mini</div>
      </Link>
      <nav
        aria-labelledby="primary-nav-label"
        className={`header__nav${menuOpen ? " header__nav--open" : ""}`}
        onKeyDown={handleNavKeyDown}
      >
        <span className="sr-only" id="primary-nav-label">
          Primary navigation
        </span>
        {menuOpen ? (
          <div
            className="header__menu-backdrop"
            aria-hidden="true"
            onClick={closeMenu}
          />
        ) : null}
        <button
          ref={hamburgerRef}
          type="button"
          className="header__hamburger"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          title={menuOpen ? "Close menu" : "Open menu"}
          onClick={toggleMenu}
        >
          <span className="header__hamburger__bar" aria-hidden="true" />
          <span className="sr-only">
            {menuOpen ? "Close menu" : "Open menu"}
          </span>
        </button>
        <ul id={menuId} className="header__menu" onClick={handleMenuClick}>
          <li>
            <Link to={"/"} className="nava" id="forecasts-url">
              Dashboard
            </Link>
          </li>
          <li>
            <Link to={"/webcams"} className="nava">
              Webcams
            </Link>
          </li>
          <li>
            <Link to={"/conditions"} className="nava">
              Local conditions
            </Link>
          </li>
          <NavDisclosure
            id="forecasts-disclosure"
            triggerLabel="Details"
            submenuLabel="Details submenu"
            submenuId="forecasts-submenu"
            items={FORECAST_ITEMS}
            onEscape={handleDisclosureKeyDown}
            onFocusOut={handleDisclosureFocusOut}
          />
          <NavDisclosure
            id="about-disclosure"
            triggerLabel="About"
            submenuLabel="About submenu"
            submenuId="about-submenu"
            items={ABOUT_ITEMS}
            onEscape={handleDisclosureKeyDown}
            onFocusOut={handleDisclosureFocusOut}
          />
          <li>
            <button
              type="button"
              ref={timeButtonRef}
              className="btn--secondary header__time"
              onClick={() => setTimeModalOpen(true)}
            >
              <SettingsIcon fontSize="medium" />
              <span className="btn__label">{timeLabel}</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              className="btn--secondary header__astro"
              title="Astro mode"
              aria-pressed={isAstro}
              onClick={toggleAstro}
            >
              <DarkModeIcon fontSize="medium" />
              <span className="btn__label">Astro mode</span>
            </button>
          </li>
        </ul>
      </nav>
      {timeModalOpen ? (
        <TimeModal triggerRef={timeButtonRef} onClose={closeTimeModal} />
      ) : null}
    </header>
  );
};

export default Nav;

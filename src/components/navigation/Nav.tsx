import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import DarkModeIcon from "@mui/icons-material/DarkMode";

import "./Nav.scss";

const ASTRO_MODE_KEY = "astro-mode";
const ASTRO_FILTER =
  "sepia(1) saturate(5) hue-rotate(-39deg) contrast(1.1) brightness(0.9)";

/**
 * Primary navigation – header banner with nav landmark. The logo and title
 * link back to the dashboard. On wide screens the links sit in a horizontal
 * bar; on narrow screens a hamburger button (aria-expanded/aria-controls)
 * reveals the same list as a full-screen panel over a dimmed backdrop –
 * tapping the backdrop closes the panel, while panel controls (Details,
 * links) do not.
 * The Forecasts & Discussion item is a collapsible disclosure
 * (aria-expanded) that opens on activation only – no hover.
 * Escape closes it and returns focus to the trigger.
 */
const Nav: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isAstro, setIsAstro] = useState(
    () => localStorage.getItem(ASTRO_MODE_KEY) === "on",
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const menuId = "primary-menu";
  const submenuId = "forecasts-submenu";

  useEffect(() => {
    document.body.style.filter = isAstro ? ASTRO_FILTER : "";
    document.body.style.overflow = menuOpen ? "hidden" : "";
  }, [isAstro, menuOpen]);

  const toggleAstro = () => {
    const next = !isAstro;
    setIsAstro(next);
    localStorage.setItem(ASTRO_MODE_KEY, next ? "on" : "off");
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLLIElement> = (event) => {
    if (event.key === "Escape" && isOpen) {
      event.stopPropagation();
      if (menuOpen) {
        // Inside the mobile panel: one Escape closes everything
        closeMenu();
        hamburgerRef.current?.focus();
      } else {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }
  };

  const handleBlur: React.FocusEventHandler<HTMLLIElement> = (event) => {
    // Close when focus leaves the entire dropdown tree
    const next = event.relatedTarget as HTMLElement | null;
    if (!next || !event.currentTarget.contains(next)) {
      setIsOpen(false);
    }
  };

  const handleNavKeyDown: React.KeyboardEventHandler<HTMLElement> = (event) => {
    if (event.key === "Escape" && menuOpen) {
      closeMenu();
      hamburgerRef.current?.focus();
    }
  };

  const closeMenu = () => {
    setIsOpen(false);
    setMenuOpen(false);
  };

  const toggleMenu = () => {
    if (menuOpen) {
      closeMenu();
    } else {
      setMenuOpen(true);
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
    // Controls (Details trigger, astro toggle) keep the panel open
    if (target.closest("button")) return;
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
          <li
            className={`forecasts dropdown${isOpen ? " dropdown--open" : ""}`}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          >
            <button
              ref={triggerRef}
              type="button"
              className="nava dropdown__trigger"
              aria-expanded={isOpen}
              aria-haspopup="true"
              aria-controls={submenuId}
              onClick={() => setIsOpen((value) => !value)}
            >
              Details
            </button>
            <ul
              className="dropdown-content"
              id={submenuId}
              aria-labelledby="forecasts-submenu-label"
            >
              <li className="sr-only" id="forecasts-submenu-label">
                Details submenu
              </li>
              <li>
                <Link to={"/forecasts/daily"}>Daily Data</Link>
              </li>
              <li>
                <Link to={"/forecasts/3days"}>3-Day Forecast</Link>
              </li>
              <li>
                <Link to={"/forecasts/27days"}>27 Day Outlook</Link>
              </li>
              <li>
                <Link to={"/forecasts/weekly"}>Weekly Report</Link>
              </li>
              <li>
                <Link to={"/forecasts/geoalert"}>Geophysical Alert</Link>
              </li>
              <li>
                <Link to={"/forecasts/discussion"}>Forecast Discussion</Link>
              </li>
            </ul>
          </li>
          <li>
            <Link to={"/about"} className="nava">
              About
            </Link>
          </li>
          <li>
            <Link to={"/explainers"} className="nava">
              Explainers
            </Link>
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
    </header>
  );
};

export default Nav;

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import "./Nav.scss";

const ASTRO_MODE_KEY = "astro-mode";
const ASTRO_FILTER =
  "sepia(1) saturate(5) hue-rotate(-39deg) contrast(1.1) brightness(0.9)";

/**
 * Primary navigation – header banner with nav landmark.
 * On wide screens the links sit in a horizontal bar; on narrow
 * screens a hamburger button (aria-expanded/aria-controls) reveals
 * the same list as a full-screen panel.
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
      setIsOpen(false);
      event.stopPropagation();
      if (menuOpen) {
        // Inside the mobile panel: one Escape closes everything
        setMenuOpen(false);
        hamburgerRef.current?.focus();
      } else {
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
      setMenuOpen(false);
      hamburgerRef.current?.focus();
    }
  };

  const handleMenuClick: React.MouseEventHandler<HTMLUListElement> = (
    event,
  ) => {
    // Navigation links close the mobile panel; the Details trigger keeps it open
    if ((event.target as HTMLElement).closest("a")) {
      setMenuOpen(false);
    }
  };

  return (
    <header className="header">
      <div className="header__left">
        <img
          src="/assets/aurora.png"
          className="header__left__logo"
          alt="App logo with aurora bird"
        />
        <div className="header__left__title">Space Weather Mini</div>
      </div>
      <nav
        aria-label="Primary"
        className={`header__nav${menuOpen ? " header__nav--open" : ""}`}
        onKeyDown={handleNavKeyDown}
      >
        <button
          ref={hamburgerRef}
          type="button"
          className="header__hamburger"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          title={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((value) => !value)}
        >
          <span className="header__hamburger__bar" aria-hidden="true" />
          <span className="sr-only">
            {menuOpen ? "Close menu" : "Open menu"}
          </span>
        </button>
        <ul id={menuId} className="header__menu" onClick={handleMenuClick}>
          <li>
            <Link to={"/"} className="nava" id="forecasts-url">
              Home
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
              aria-label="Details submenu"
            >
              <li>
                <Link to={"/forecasts/geoalert"}>Geophysical Alert</Link>
              </li>
              <li>
                <Link to={"/forecasts/daily"}>Daily Data</Link>
              </li>
              <li>
                <Link to={"/forecasts/3days"}>3-Day Forecast</Link>
              </li>
              <li>
                <Link to={"/forecasts/weekly"}>Weekly Report</Link>
              </li>
              <li>
                <Link to={"/forecasts/27days"}>27 Day Outlook</Link>
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
              className="btn--astro-toggle"
              title="Astro mode"
              aria-pressed={isAstro}
              onClick={toggleAstro}
            >
              <span aria-hidden="true">🌙</span>
              <span className="sr-only">Astro mode</span>
            </button>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Nav;

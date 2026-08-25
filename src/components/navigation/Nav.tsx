import { useRef, useState } from "react";
import { Link } from "react-router-dom";

import "./Nav.scss";

/**
 * Primary navigation – header banner with nav landmark.
 * The Forecasts & Discussion item is a disclosure button that
 * controls the submenu via aria-expanded; the submenu opens
 * on hover, on focus-within, and when the button is activated
 * (Enter/Space). Escape closes it and returns focus to the trigger.
 */
const Nav: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const submenuId = "forecasts-submenu";

  const handleKeyDown: React.KeyboardEventHandler<HTMLLIElement> = (event) => {
    if (event.key === "Escape" && isOpen) {
      setIsOpen(false);
      event.stopPropagation();
      triggerRef.current?.focus();
    }
  };

  const handleBlur: React.FocusEventHandler<HTMLLIElement> = (event) => {
    // Close when focus leaves the entire dropdown tree
    const next = event.relatedTarget as HTMLElement | null;
    if (!next || !event.currentTarget.contains(next)) {
      setIsOpen(false);
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
      <nav aria-label="Primary">
        <ul>
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
        </ul>
      </nav>
    </header>
  );
};

export default Nav;

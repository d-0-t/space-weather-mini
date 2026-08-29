import { useState, type KeyboardEvent, type ReactNode } from "react";

import "./CollapsiblePanel.scss";

interface CollapsiblePanelProps {
  /** Panel heading, rendered inside the toggle button (an h2) */
  heading: ReactNode;
  /** Unique id for the collapsible body, referenced by aria-controls */
  bodyId: string;
  /** Extra controls rendered after the toggle (e.g. the moon phase badge) */
  adornment?: ReactNode;
  children: ReactNode;
}

/**
 * Collapsible panel – a disclosure with a chevron on the left of the header.
 * Open by default; activation toggles via aria-expanded, Escape collapses and
 * keeps focus on the toggle. Adornments live outside the toggle so clicking
 * them never collapses the panel.
 */
const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({
  heading,
  bodyId,
  adornment,
  children,
}) => {
  const [open, setOpen] = useState(true);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className="collapsible-panel">
      <div className="collapsible-panel__head">
        <button
          type="button"
          className="collapsible-panel__toggle"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((value) => !value)}
          onKeyDown={handleKeyDown}
        >
          <span className="collapsible-panel__chevron" aria-hidden="true">
            ▸
          </span>
          {heading}
        </button>
        {adornment}
      </div>
      {open ? (
        <div className="collapsible-panel__body" id={bodyId}>
          {children}
        </div>
      ) : null}
    </div>
  );
};

export default CollapsiblePanel;
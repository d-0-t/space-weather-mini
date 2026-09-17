import { useState } from "react";
import CompressIcon from "@mui/icons-material/Compress";

import "./CompactToggle.scss";
import {
  loadCompactPanel,
  saveCompactPanel,
  type CompactPanelId,
} from "../../../../../products/compact";

interface CompactToggleProps {
  /** Whether the owning panel renders dense. */
  checked: boolean;
  /** Called with the next checked value; the owner persists it. */
  onChange: (next: boolean) => void;
}

/**
 * One panel's Compact state (dashboard layout ticket 05): read once on
 * mount, written on every toggle, versioned per panel in localStorage. One
 * hook for the three v1 panels so the load/save shape lives in one place.
 */
export function useCompactPanel(
  panel: CompactPanelId,
): [boolean, (next: boolean) => void] {
  const [compact, setCompact] = useState(() =>
    loadCompactPanel(localStorage, panel),
  );
  const handleChange = (next: boolean): void => {
    // The write rides the change event, not the state updater: it is a side
    // effect, and React may invoke updaters more than once.
    saveCompactPanel(localStorage, panel, next);
    setCompact(next);
  };
  return [compact, handleChange];
}

/**
 * Compact – the per-panel dense-mode checkbox (dashboard layout ticket 05,
 * CONTEXT.md "Compact"): compress icon left of the "Compact" label, native
 * checkbox semantics, pill chrome from the shared button system. The owner
 * renders it as its CollapsiblePanel adornment so it sits right-aligned in
 * the panel heading and never collapses the panel.
 */
const CompactToggle: React.FC<CompactToggleProps> = ({ checked, onChange }) => {
  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    onChange(event.target.checked);
  };

  return (
    <label className="btn--secondary compact-toggle">
      <input type="checkbox" checked={checked} onChange={handleChange} />
      <span className="btn__label">Compact</span>
      <CompressIcon aria-hidden="true" fontSize="small" />
    </label>
  );
};

export default CompactToggle;

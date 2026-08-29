import type { RefObject } from "react";

import "./webcams.scss";
import type { WebcamRegion } from "../../../data/webcams";
import { regionLabel } from "./webcam-card-parts";

/** Popup region checklist – the draft only commits on Apply (ticket 02). */
const WebcamFilterDialog: React.FC<{
  dialogRef: RefObject<HTMLDialogElement | null>;
  presentRegions: WebcamRegion[];
  draftRegions: WebcamRegion[];
  onToggleRegion: (region: WebcamRegion) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  onApply: () => void;
  onCancel: () => void;
}> = ({
  dialogRef,
  presentRegions,
  draftRegions,
  onToggleRegion,
  onShowAll,
  onHideAll,
  onApply,
  onCancel,
}) => (
  <dialog
    ref={dialogRef}
    className="webcams__dialog webcams__filter-dialog"
    aria-labelledby="webcams-filter-title"
  >
    <h2 id="webcams-filter-title" className="webcams__dialog-title">
      Filter webcams by region
    </h2>
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
              onChange={() => onToggleRegion(region)}
            />
            {regionLabel(region)}
          </label>
        </li>
      ))}
    </ul>
    <div className="webcams__dialog-actions">
      <button type="button" className="btn--secondary" onClick={onShowAll}>
        Show all
      </button>
      <button type="button" className="btn--secondary" onClick={onHideAll}>
        Hide all
      </button>
      <button type="button" className="btn--secondary" onClick={onCancel}>
        Cancel
      </button>
      <button type="button" className="btn--primary" onClick={onApply}>
        Apply
      </button>
    </div>
  </dialog>
);

export default WebcamFilterDialog;
import type { RefObject } from "react";

import "./webcams.scss";
import type { WebcamEntry } from "../../../data/webcams";
import { regionLabel } from "./webcam-card-parts";

/** Hidden sources list with one-tap restore and a show-all affordance (ticket 02). */
const WebcamHiddenDialog: React.FC<{
  dialogRef: RefObject<HTMLDialogElement | null>;
  hiddenEntries: WebcamEntry[];
  onRestore: (id: string) => void;
  onRestoreAll: () => void;
  onClose: () => void;
}> = ({ dialogRef, hiddenEntries, onRestore, onRestoreAll, onClose }) => (
  <dialog
    ref={dialogRef}
    className="webcams__dialog webcams__hidden-dialog"
    aria-labelledby="webcams-hidden-title"
  >
    <h2 id="webcams-hidden-title" className="webcams__dialog-title">
      Hidden sources
    </h2>
    {hiddenEntries.length === 0 ? (
      <p className="webcams__dialog-note">No hidden sources.</p>
    ) : (
      <ul className="webcams__hidden-list">
        {hiddenEntries.map((entry) => (
          <li key={entry.id} className="webcams__hidden-row">
            <span className="webcams__hidden-name">
              {entry.name}{" "}
              <span className="webcams__hidden-meta">
                {regionLabel(entry.region)}
              </span>
            </span>
            <button
              type="button"
              className="btn--secondary"
              aria-label={`Show ${entry.name}`}
              onClick={() => onRestore(entry.id)}
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
        className="btn--secondary"
        onClick={onRestoreAll}
        disabled={hiddenEntries.length === 0}
      >
        Show all
      </button>
      <button type="button" className="btn--secondary" onClick={onClose}>
        Close
      </button>
    </div>
  </dialog>
);

export default WebcamHiddenDialog;
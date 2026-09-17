import { useId, useRef, useState, type RefObject } from "react";
import CloseIcon from "@mui/icons-material/Close";

import { useDialogModal } from "../../../../Dialog/useDialogModal";
import Alerts from "./Alerts";
import { useAlerts } from "./AlertsContext";

import "./Alerts.scss";

/**
 * Alert settings modal – the Alerts threshold, browser-alerts permission
 * and newest-match strip live in a native <dialog> opened from the
 * Dashboard header's Alerts button. Mounted only while open (the Time modal
 * pattern), so the threshold draft reseeds from storage on every open:
 * Apply persists it, while Cancel, X, Escape and the backdrop discard it.
 * A closed dialog hands focus back to the trigger. Polling and
 * notifications run in AlertsProvider, so closing the modal never stops
 * them. The dialog is named by its visible heading (aria-labelledby), never
 * aria-label.
 */
const AlertsDialog: React.FC<{
  triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}> = ({ triggerRef, onClose }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogLabelId = useId();
  const { threshold, setThreshold } = useAlerts();
  const [draftThreshold, setDraftThreshold] = useState(threshold);

  useDialogModal({
    dialogRef,
    triggerRef,
    onClose,
    openOnMount: true,
    backdropDismiss: true,
  });

  const dismiss = () => dialogRef.current?.close();

  const apply = () => {
    setThreshold(draftThreshold);
    dialogRef.current?.close();
  };

  return (
    <dialog
      ref={dialogRef}
      className="alerts-dialog"
      aria-labelledby={dialogLabelId}
    >
      <Alerts
        headingId={dialogLabelId}
        threshold={draftThreshold}
        setThreshold={setDraftThreshold}
      />
      <div className="alerts-dialog__actions">
        <button type="button" className="btn--secondary" onClick={dismiss}>
          Cancel
        </button>
        <button type="button" className="btn--primary" onClick={apply}>
          Apply
        </button>
      </div>
      <button
        type="button"
        className="btn--secondary alerts-dialog__close"
        title="Close"
        onClick={dismiss}
      >
        <CloseIcon fontSize="small" />
        <span className="sr-only">Close</span>
      </button>
    </dialog>
  );
};

export default AlertsDialog;

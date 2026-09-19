import { useId, useRef, useState, type RefObject } from "react";
import CloseIcon from "@mui/icons-material/Close";

import { useDialogModal } from "../../../../Dialog/useDialogModal";
import Alerts from "./Alerts";
import { useAlerts } from "./AlertsContext";
import type {
  AlertTypeToggles,
  HindranceGates,
} from "../../../../../push/subscription-settings";

import "./Alerts.scss";

/**
 * Alert settings modal – the Kp threshold, the three background alert
 * types, the Live alert's hindrance gates, the browser-alerts permission
 * and the newest-match strip live in a native <dialog> opened from the
 * Dashboard header's Alerts button. Mounted only while open (the Time
 * modal pattern), so every setting draft reseeds from storage on each
 * open: Apply persists them all, while Cancel, X, Escape and the backdrop
 * discard the drafts. A closed dialog hands focus back to the trigger.
 * Polling and notifications run in AlertsProvider, so closing the modal
 * never stops them. The dialog is named by its visible heading
 * (aria-labelledby), never aria-label.
 */
const AlertsDialog: React.FC<{
  triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}> = ({ triggerRef, onClose }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogLabelId = useId();
  const {
    threshold,
    alertTypes,
    gates,
    applySettings,
  } = useAlerts();
  const [draftThreshold, setDraftThreshold] = useState(threshold);
  const [draftAlertTypes, setDraftAlertTypes] = useState(alertTypes);
  const [draftGates, setDraftGates] = useState(gates);

  useDialogModal({
    dialogRef,
    triggerRef,
    onClose,
    openOnMount: true,
    backdropDismiss: true,
  });

  const dismiss = () => dialogRef.current?.close();

  const apply = () => {
    applySettings({
      threshold: draftThreshold,
      alertTypes: draftAlertTypes,
      gates: draftGates,
    });
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
        alertTypes={draftAlertTypes}
        toggleAlertType={(type, on) =>
          setDraftAlertTypes({ ...draftAlertTypes, [type]: on })
        }
        gates={draftGates}
        setGates={setDraftGates}
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

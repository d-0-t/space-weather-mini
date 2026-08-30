import { useEffect, useId, type RefObject } from "react";

import Alerts from "./Alerts";

import "./Alerts.scss";

/**
 * Alert settings modal – the Alerts strip and its controls (threshold slider,
 * browser-alerts permission) live in a native <dialog> opened from the
 * Dashboard header's Alerts icon button. Polling and notifications run in
 * AlertsProvider, so closing the modal never stops them; a closed dialog hands
 * focus back to the trigger button. The dialog is named by sr-only text
 * (aria-labelledby), never aria-label.
 */
const AlertsDialog: React.FC<{
  dialogRef: RefObject<HTMLDialogElement | null>;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}> = ({ dialogRef, triggerRef, onClose }) => {
  const dialogLabelId = useId();

  // A closed dialog hands focus back to its trigger button (the browser does
  // this for native dialogs; the explicit handler covers test environments).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onDialogClose = () => triggerRef.current?.focus();
    dialog.addEventListener("close", onDialogClose);
    return () => dialog.removeEventListener("close", onDialogClose);
  }, [dialogRef, triggerRef]);

  return (
    <dialog
      ref={dialogRef}
      className="alerts-dialog"
      aria-labelledby={dialogLabelId}
    >
      <span className="sr-only" id={dialogLabelId}>
        Alert settings
      </span>
      <Alerts />
      <div className="alerts-dialog__actions">
        <button
          type="button"
          className="btn--secondary"
          title="Close"
          onClick={onClose}
        >
          <span aria-hidden="true">×</span>
          <span className="sr-only">Close</span>
        </button>
      </div>
    </dialog>
  );
};

export default AlertsDialog;
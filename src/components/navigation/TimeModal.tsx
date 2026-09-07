import { useEffect, useId, useRef, useState, type RefObject } from "react";
import CloseIcon from "@mui/icons-material/Close";

import { useDisplayTimezone } from "../DisplayTimezone/DisplayTimezoneContext";

import "./TimeModal.scss";

/**
 * The Time modal (ticket 02): the Display timezone control. Opened from the
 * nav's Time button and mounted only while open, so the checkbox always
 * starts from the stored choice. Apply saves and closes; Cancel, X, Escape
 * and the backdrop dismiss without saving; a closed dialog hands focus back
 * to the trigger button (the alerts modal pattern). The dialog is named by
 * sr-only text (aria-labelledby), never aria-label.
 */
const TimeModal: React.FC<{
  triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}> = ({ triggerRef, onClose }) => {
  const { displayTimezone, setDisplayTimezone } = useDisplayTimezone();
  const [utc, setUtc] = useState(displayTimezone === "utc");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const dialogLabelId = useId();

  // Open on mount. On close – Apply, Cancel, X, Escape or the backdrop –
  // hand focus back to the trigger (the browser does this natively; the
  // explicit handler covers test environments).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const onDialogClose = () => {
      triggerRef.current?.focus();
      onCloseRef.current();
    };
    dialog.addEventListener("close", onDialogClose);
    // A click on the backdrop (outside the dialog box) dismisses without
    // saving. Pointerdown, so keyboard activation of the media controls
    // (which synthesizes clicks at 0,0) never closes it; only the primary
    // button closes.
    const onPointerDown = (event: PointerEvent) => {
      if (!dialog.open || event.button !== 0) return;
      const rect = dialog.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) {
        dialog.close();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      dialog.removeEventListener("close", onDialogClose);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [triggerRef]);

  const dismiss = () => dialogRef.current?.close();

  const apply = () => {
    setDisplayTimezone(utc ? "utc" : "local");
    dialogRef.current?.close();
  };

  return (
    <dialog
      ref={dialogRef}
      className="time-dialog"
      aria-labelledby={dialogLabelId}
    >
      <h3 id={dialogLabelId}>Time Settings</h3>
      <label className="time-dialog__option">
        <input
          type="checkbox"
          checked={utc}
          onChange={(event) => setUtc(event.target.checked)}
        />
        Show times in UTC
      </label>
      <p className="time-dialog__note">
        Times follow your device&apos;s timezone, no matter what location
        you&apos;ve picked.
      </p>
      <p className="time-dialog__note">
        The 27-day outlook and daily geomagnetic indices keep their UTC dates.
      </p>
      <div className="time-dialog__actions">
        <button type="button" className="btn--secondary" onClick={dismiss}>
          Cancel
        </button>
        <button type="button" className="btn--primary" onClick={apply}>
          Apply
        </button>
      </div>
      <button
        type="button"
        className="btn--secondary time-dialog__close"
        title="Close"
        onClick={dismiss}
      >
        <CloseIcon fontSize="small" />
        <span className="sr-only">Close</span>
      </button>
    </dialog>
  );
};

export default TimeModal;

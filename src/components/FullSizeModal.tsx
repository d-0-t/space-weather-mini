import { useEffect, useId, useRef, type ReactNode } from "react";

interface FullSizeModalProps {
  /** Accessible name for the trigger button and the dialog */
  label: string;
  /** Preview content (img/video) inside the trigger button tile */
  trigger: ReactNode;
  /** Class for the trigger button tile */
  triggerClassName?: string;
  /** Full-size content (img/video) shown inside the modal */
  children: ReactNode;
}

/**
 * Full-size viewer built on the native <dialog>: a trigger tile button and a
 * modal that fits the viewport. Escape closes it (native), as does the X
 * button pinned to the viewport's top-right corner so it never covers the
 * media, and a click on the backdrop outside the dialog box. The dialog is
 * named by sr-only text inside them (aria-labelledby).
 */
const FullSizeModal: React.FC<FullSizeModalProps> = ({
  label,
  trigger,
  triggerClassName,
  children,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogLabelId = useId();

  // A click on the backdrop (outside the dialog box) closes the modal. The
  // dialog box is centered with auto margins, so the dimmed area around it is
  // outside its bounding rect. Pointerdown is used so keyboard activation of
  // the media controls (which synthesizes clicks at 0,0) never closes it.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!dialog.open) return;
      // Only the primary (left) button closes – right-clicking the backdrop
      // (e.g. to inspect the close button) must not dismiss the modal
      if (event.button !== 0) return;
      const rect = dialog.getBoundingClientRect();
      const x = event.clientX;
      const y = event.clientY;
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        dialog.close();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <>
      <button
        type="button"
        className={triggerClassName}
        onClick={() => dialogRef.current?.showModal()}
      >
        <span className="sr-only">{label}</span>
        {trigger}
      </button>
      <dialog
        ref={dialogRef}
        className="image-modal"
        aria-labelledby={dialogLabelId}
      >
        <span className="sr-only" id={dialogLabelId}>
          {label}
        </span>
        <button
          type="button"
          className="image-modal__close"
          title="Close"
          onClick={() => dialogRef.current?.close()}
        >
          <span aria-hidden="true">×</span>
          <span className="sr-only">Close</span>
        </button>
        {children}
      </dialog>
    </>
  );
};

export default FullSizeModal;

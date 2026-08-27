import { useRef, type ReactNode } from "react";

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
 * media.
 */
const FullSizeModal: React.FC<FullSizeModalProps> = ({
  label,
  trigger,
  triggerClassName,
  children,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        className={triggerClassName}
        aria-label={label}
        onClick={() => dialogRef.current?.showModal()}
      >
        {trigger}
      </button>
      <dialog ref={dialogRef} className="image-modal" aria-label={label}>
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
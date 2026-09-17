import { useEffect, useRef, type RefObject } from "react";

/**
 * Shared native-dialog choreography (the Time modal pattern), one place for
 * the three app dialogs: an optional showModal on mount for the
 * mounted-while-open modals, focus returned to the trigger button on every
 * close path (the browser does this natively; the explicit handler covers
 * test environments), and an optional backdrop dismissal - a primary-button
 * pointerdown outside the dialog box closes it without saving, so
 * synthesized clicks at 0,0 from keyboard activation never close it.
 */
export function useDialogModal({
  dialogRef,
  triggerRef,
  onClose,
  openOnMount = false,
  backdropDismiss = false,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  triggerRef: RefObject<HTMLElement | null>;
  onClose?: () => void;
  openOnMount?: boolean;
  backdropDismiss?: boolean;
}): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const openOnMountRef = useRef(openOnMount);
  openOnMountRef.current = openOnMount;
  const backdropDismissRef = useRef(backdropDismiss);
  backdropDismissRef.current = backdropDismiss;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (openOnMountRef.current && !dialog.open) dialog.showModal();
    const onDialogClose = () => {
      triggerRef.current?.focus();
      onCloseRef.current?.();
    };
    dialog.addEventListener("close", onDialogClose);
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
    if (backdropDismissRef.current) {
      document.addEventListener("pointerdown", onPointerDown);
    }
    return () => {
      dialog.removeEventListener("close", onDialogClose);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [dialogRef, triggerRef]);
}

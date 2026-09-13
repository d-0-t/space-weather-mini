import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import CloseIcon from "@mui/icons-material/Close";
import InfoIcon from "@mui/icons-material/Info";

import "./HelpPopover.scss";

/** Body copy of a help popover: a compact value → meaning scale and/or prose. */
export interface HelpPopoverContent {
  /** sr-only trigger label, e.g. "About solar wind" */
  label: string;
  /** Compact threshold rows: value → meaning */
  rows?: [string, string][];
  /** Single prose paragraph (magnetograms, moon phase) */
  text?: string;
  /** Several prose paragraphs (oval glow map reading) */
  paragraphs?: string[];
  /** Optional footnote after the prose, e.g. a provenance link */
  footnote?: ReactNode;
}

/** Distance (px) the clamped popover keeps from the viewport edges. */
const VIEWPORT_GUTTER_PX = 8;
/** Gap (px) between the trigger and the popover body. */
const TRIGGER_GAP_PX = 6;

/**
 * Where the popover body mounts: inside the <main> landmark when the shell
 * provides one (so every panel stays within a landmark for axe's region
 * rule), else the document body (unit tests render the component bare).
 */
const portalContainer = (): Element =>
  document.getElementById("main-content") ?? document.body;

/** Elements that can receive keyboard focus inside the popover body. */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Every keyboard-focusable element inside the popover body, in DOM order. */
const focusableIn = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));

/** Fixed viewport coordinates for a popover body. */
export interface PopoverPlacement {
  top: number;
  left: number;
}

/**
 * Fixed-position coordinates for a popover body anchored to its trigger: the
 * body's right edge aligns with the trigger's, it drops below the trigger
 * unless that would overflow the viewport (then it flips above), and it is
 * clamped inside the viewport horizontally. Pure so it is unit-pinned.
 */
export const placePopover = (
  trigger: Pick<DOMRect, "top" | "bottom" | "right">,
  popover: Pick<DOMRect, "width" | "height">,
  viewWidth: number,
  viewHeight: number,
  gutter: number = VIEWPORT_GUTTER_PX,
): PopoverPlacement => {
  const maxLeft = Math.max(gutter, viewWidth - gutter - popover.width);
  const left = Math.min(
    Math.max(trigger.right - popover.width, gutter),
    maxLeft,
  );
  const below = trigger.bottom + TRIGGER_GAP_PX;
  const above = trigger.top - TRIGGER_GAP_PX - popover.height;
  const fitsBelow = below + popover.height <= viewHeight - gutter;
  const top = fitsBelow || above < gutter ? below : above;
  return { top, left };
};

/**
 * The help popover discipline, in one place: a trigger button whose open state
 * is driven from React, closed by Escape (focus returns to the trigger), by a
 * primary click outside, by the trigger again, and by the close X inside the
 * popover body. The trigger is a real <button> so the component stays valid
 * inline (inside a paragraph or heading), and while open the body is portalled
 * to the document and placed against the trigger's viewport rectangle, flipped
 * above it when there is no room below and clamped to the viewport's
 * horizontal edges. Opening moves focus into the body (first focusable
 * element, or the body itself); Tab and Shift+Tab cycle within the body until
 * it closes; every dismissal returns focus to the trigger.
 */
const HelpPopover: React.FC<{
  content: HelpPopoverContent;
  /** Extra class on the root (e.g. the moon badge or glossary-term variant) */
  className?: string;
  /** Class of the popover body (each consuming family differs) */
  popoverClassName?: string;
  /** Custom trigger content (defaults to the "?" badge). When set, the caller must include the accessible name. */
  trigger?: ReactNode;
}> = ({ content, className, popoverClassName = "live-panel__popover", trigger }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // Close and hand focus back to the trigger
  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Escape closes and returns focus to the trigger; Tab cycles within the
  // open body so keyboard focus can never leave it until it is dismissed
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const popover = popoverRef.current;
      if (!popover) return;
      const items = focusableIn(popover);
      if (items.length === 0) {
        event.preventDefault();
        popover.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === first || !popover.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !popover.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  // A click outside the trigger or the (portalled) body closes it and hands
  // focus back to the trigger, the same discipline as Escape and the close X
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent): void => {
      // Only the primary (left) button closes – right-clicking outside the
      // popover (e.g. to inspect its content) must not dismiss it
      if (event.button !== 0) return;
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  // Place the portalled body against the trigger, re-measured on resize and
  // on scroll so it tracks the trigger's viewport position. The body starts
  // hidden so it never flashes at 0,0 before the first measurement lands.
  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger || !popover) return;
    const place = (): void => {
      const { top, left } = placePopover(
        trigger.getBoundingClientRect(),
        popover.getBoundingClientRect(),
        document.documentElement.clientWidth,
        document.documentElement.clientHeight,
      );
      popover.style.top = `${top}px`;
      popover.style.left = `${left}px`;
      popover.style.visibility = "visible";
    };
    place();
    // Capture the scroll so nested scroll containers reposition the body too
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  // Move focus into the body once it is open and placed (declared after the
  // placement effect, so the body is already visible when focused)
  useLayoutEffect(() => {
    if (!open) return;
    const popover = popoverRef.current;
    if (!popover) return;
    (focusableIn(popover)[0] ?? popover).focus();
  }, [open]);

  return (
    <span
      ref={rootRef}
      className={`live-panel__help${className ? ` ${className}` : ""}`}
    >
      <button
        ref={triggerRef}
        type="button"
        className={trigger ? undefined : "btn--icon"}
        title={trigger ? undefined : content.label}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        {trigger ?? (
          <>
            <span aria-hidden="true">
              <InfoIcon fontSize="small" />
            </span>
            <span className="sr-only">{content.label}</span>
          </>
        )}
      </button>
      {open && (content.rows || content.text || content.paragraphs)
        ? createPortal(
            <div
              ref={popoverRef}
              id={panelId}
              className={`help-popover ${popoverClassName}`}
              style={{ visibility: "hidden" }}
              tabIndex={-1}
            >
              <button
                type="button"
                className="help-popover__close"
                title={`Close: ${content.label}`}
                onClick={close}
              >
                <span aria-hidden="true">
                  <CloseIcon fontSize="small" />
                </span>
                {/* The title attribute IS the accessible name here (the accname
                    algorithm falls back to it), so this close X never collides
                    with the "Close" buttons of modals on the same page */}
                <span className="sr-only">{`Close: ${content.label}`}</span>
              </button>
              {content.rows ? (
                <ul className="live-panel__scale">
                  {content.rows.map(([value, meaning]) => (
                    <li key={value}>
                      <b>{value}</b> – {meaning}
                    </li>
                  ))}
                </ul>
              ) : null}
              {content.text ? <p>{content.text}</p> : null}
              {content.paragraphs?.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {content.footnote ? (
                <p className="help-popover__footnote">{content.footnote}</p>
              ) : null}
            </div>,
            portalContainer(),
          )
        : null}
    </span>
  );
};

export default HelpPopover;

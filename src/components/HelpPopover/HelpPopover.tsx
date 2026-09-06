import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import CloseIcon from "@mui/icons-material/Close";
import InfoIcon from "@mui/icons-material/Info";

import "./HelpPopover.scss";

/** Body copy of a help popover: a compact value → meaning scale and/or prose. */
export interface HelpPopoverContent {
  /** sr-only summary label, e.g. "About solar wind" */
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

/**
 * Horizontal shift (px) that keeps a box fully inside the viewport: positive
 * nudges a box clipping the left edge right, negative nudges one clipping the
 * right edge left, 0 means it already fits (or cannot fit at all).
 */
export const clampShift = (
  left: number,
  right: number,
  width: number,
  viewWidth: number,
  gutter: number = VIEWPORT_GUTTER_PX,
): number => {
  if (width >= viewWidth - 2 * gutter) return 0; // cannot fit – leave as is
  if (left < gutter) return gutter - left;
  if (right > viewWidth - gutter) return viewWidth - gutter - right;
  return 0;
};

/**
 * The help popover discipline, in one place: a summary-triggered <details>
 * whose open state is driven from React (so jsdom and browsers agree), closed
 * by Escape (focus returns to the trigger), by a primary click outside, by
 * the trigger again, and by the close X inside the popover body. While open
 * the body is clamped inside the viewport horizontally – the body anchors to
 * the trigger's right edge, so a trigger near the left screen edge would
 * otherwise push it off-screen.
 */
const HelpPopover: React.FC<{
  content: HelpPopoverContent;
  /** Extra class on the <details> root (e.g. the moon badge variant) */
  className?: string;
  /** Class of the popover body (the live-panel and oval-glow families differ) */
  popoverClassName?: string;
  /** Custom summary trigger content (defaults to the "?" badge). When set, the caller must include the sr-only label. */
  summary?: ReactNode;
}> = ({ content, className, popoverClassName = "live-panel__popover", summary }) => {
  const [open, setOpen] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const shiftRef = useRef(0);

  // Escape closes the popover and returns focus to the trigger
  const closeOnEscape: React.KeyboardEventHandler<HTMLElement> = (event) => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      detailsRef.current?.querySelector("summary")?.focus();
    }
  };

  // A click outside the trigger or the popover closes it
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent): void => {
      // Only the primary (left) button closes – right-clicking outside the
      // popover (e.g. to inspect its content) must not dismiss it
      if (event.button !== 0) return;
      const el = detailsRef.current;
      if (el && !el.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Clamp the open popover inside the viewport with a translateX, which
  // leaves the CSS right-edge anchor intact. Every re-check must measure the
  // popover's NATURAL (unshifted) position – getBoundingClientRect includes
  // the applied transform, so re-clamping the raw rect would compound or
  // zero the shift and make the popover jump around whenever the viewport
  // changes under it (scrollbars appearing, rotation, window resize).
  useLayoutEffect(() => {
    const popover = popoverRef.current;
    if (!open || !popover) return;
    const clamp = (): void => {
      const rect = popover.getBoundingClientRect();
      // clientWidth excludes scrollbars; innerWidth includes them, so a
      // popover clamped against innerWidth could hang beneath one
      const viewWidth = document.documentElement.clientWidth;
      const shift = clampShift(
        rect.left - shiftRef.current,
        rect.right - shiftRef.current,
        rect.width,
        viewWidth,
      );
      if (shift === shiftRef.current) return; // already correct – no churn
      shiftRef.current = shift;
      popover.style.transform = shift === 0 ? "" : `translateX(${shift}px)`;
    };
    clamp();
    window.addEventListener("resize", clamp);
    return () => {
      window.removeEventListener("resize", clamp);
      popover.style.transform = "";
      shiftRef.current = 0;
    };
  }, [open]);

  return (
    <details
      ref={detailsRef}
      className={`live-panel__help${className ? ` ${className}` : ""}`}
      open={open}
      onKeyDown={closeOnEscape}
    >
      <summary
        className={summary ? undefined : "btn--icon"}
        title={summary ? undefined : content.label}
        aria-expanded={open}
        onClick={(event) => {
          // Drive the popover from state so jsdom and browsers agree;
          // suppress the native toggle to avoid double-flipping.
          event.preventDefault();
          setOpen((current) => !current);
        }}
      >
        {summary ?? (
          <>
            <span aria-hidden="true">
              <InfoIcon fontSize="small" />
            </span>
            <span className="sr-only">{content.label}</span>
          </>
        )}
      </summary>
      {content.rows || content.text || content.paragraphs ? (
        <div ref={popoverRef} className={popoverClassName}>
          <button
            type="button"
            className="help-popover__close"
            title={`Close: ${content.label}`}
            onClick={() => {
              setOpen(false);
              detailsRef.current?.querySelector("summary")?.focus();
            }}
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
        </div>
      ) : null}
    </details>
  );
};

export default HelpPopover;

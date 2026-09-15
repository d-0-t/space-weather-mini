import { useEffect, useState } from "react";

import "./PageFooter.scss";
import { ArrowUpward } from "@mui/icons-material";

/**
 * True while the page scrolls past the viewport.
 * Re-evaluated on resize and whenever the main content mutates
 * (feeds landing late change the height after mount).
 */
function usePageOverflow(): boolean {
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const check = (): void => {
      setOverflows(document.documentElement.scrollHeight > window.innerHeight);
    };
    check();
    window.addEventListener("resize", check);
    const target = document.getElementById("main-content") ?? document.body;
    const observer = new MutationObserver(check);
    observer.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
    });
    const frame = requestAnimationFrame(check);
    return () => {
      window.removeEventListener("resize", check);
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return overflows;
}

/**
 * The shared page-footer Jump to top control.
 * Hidden unless the page overflows; activation returns scroll to the top
 * and moves focus to the page h1. Named by its visible label.
 */
const PageFooter: React.FC = () => {
  const overflows = usePageOverflow();
  if (!overflows) return null;

  const jumpToTop = (): void => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    const h1 = document.querySelector("main h1") as HTMLElement | null;
    if (!h1) return;
    if (!h1.hasAttribute("tabindex")) h1.setAttribute("tabindex", "-1");
    h1.focus({ preventScroll: true });
  };

  return (
    <footer className="page-footer">
      <button type="button" className="btn--secondary" onClick={jumpToTop}>
        <ArrowUpward aria-hidden="true" />
        Jump to top
      </button>
    </footer>
  );
};

export default PageFooter;

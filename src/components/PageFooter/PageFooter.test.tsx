// TDD RED for ticket 02: shared Jump to top footer.
// Seams (approved): PageFooter overflow visibility + activation focus.
// External behavior only, via roles.
process.env.TZ = "Europe/Stockholm";

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import PageFooter from "./PageFooter";

const renderFooter = () =>
  render(
    <MemoryRouter initialEntries={["/webcams"]}>
      <main id="main-content">
        <h1>Webcams</h1>
        <p>Body copy that makes the page tall.</p>
      </main>
      <PageFooter />
    </MemoryRouter>,
  );

const mockOverflow = (overflows: boolean) => {
  Object.defineProperty(document.documentElement, "scrollHeight", {
    configurable: true,
    value: overflows ? 2000 : 500,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    writable: true,
    value: 800,
  });
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("PageFooter Jump to top (ticket 02)", () => {
  it("stays hidden on short pages without overflow", () => {
    mockOverflow(false);
    renderFooter();
    // No dead control: nothing rendered while the page does not scroll.
    expect(
      screen.queryByRole("button", { name: "Jump to top" }),
    ).toBeNull();
  });

  it("renders only while the page overflows", () => {
    mockOverflow(true);
    renderFooter();
    // Re-evaluated on resize and after feeds load.
    fireEvent(window, new Event("resize"));
    expect(
      screen.getByRole("button", { name: "Jump to top" }),
    ).toBeInTheDocument();
  });

  it("returns scroll to the top and moves focus to the h1", () => {
    mockOverflow(true);
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    // window.scrollTo is the seam the footer activates through.
    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      writable: true,
      value: scrollTo,
    });
    renderFooter();
    fireEvent(window, new Event("resize"));
    const button = screen.getByRole("button", { name: "Jump to top" });
    fireEvent.click(button);
    expect(scrollTo).toHaveBeenCalled();
    expect(document.activeElement?.tagName).toBe("H1");
    expect(document.activeElement?.textContent).toBe("Webcams");
  });
});

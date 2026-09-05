import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import HelpPopover, { clampShift } from "./HelpPopover";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** A fake DOMRect with only the horizontal geometry the clamp reads. */
const rect = (left: number, right: number): DOMRect =>
  ({
    left,
    right,
    width: right - left,
    top: 0,
    bottom: 0,
    height: 0,
    x: left,
    y: 0,
    toJSON: () => ({}),
  }) as DOMRect;

/** jsdom does no layout, so its clientWidth is always 0: pin the viewport. */
const stubViewWidth = (value: number): void => {
  vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(
    value,
  );
};

describe("clampShift", () => {
  it("leaves a box that already fits unshifted", () => {
    expect(clampShift(100, 400, 300, 1024)).toBe(0);
    // Touching the gutter exactly is still fitting
    expect(clampShift(8, 308, 300, 1024)).toBe(0);
    expect(clampShift(300, 1016, 300, 1024)).toBe(0);
  });

  it("nudges a box clipping the left edge back inside", () => {
    expect(clampShift(-50, 250, 300, 1024)).toBe(58);
  });

  it("nudges a box clipping the right edge back inside", () => {
    expect(clampShift(750, 1050, 300, 1024)).toBe(-34);
  });

  it("gives up on a box wider than the usable viewport", () => {
    expect(clampShift(-400, 700, 1100, 1024)).toBe(0);
  });

  it("honors a custom gutter", () => {
    expect(clampShift(0, 10, 10, 100, 4)).toBe(4);
    expect(clampShift(98, 108, 10, 100, 4)).toBe(-12);
  });
});

const renderHelp = () =>
  render(
    <HelpPopover
      content={{
        label: "About the test chart",
        rows: [["0-2", "quiet"]],
        text: "Prose explanation.",
      }}
    />,
  );

describe("HelpPopover", () => {
  it("toggles from the summary trigger and reports aria-expanded", async () => {
    const user = userEvent.setup();
    const { container } = renderHelp();
    const details = container.querySelector("details") as HTMLDetailsElement;
    const summary = details.querySelector("summary")!;
    expect(details.open).toBe(false);
    expect(summary).toHaveAttribute("aria-expanded", "false");
    expect(summary.classList.contains("btn--icon")).toBe(true);
    expect(summary).toHaveAttribute("title", "About the test chart");
    await user.click(summary);
    expect(details.open).toBe(true);
    expect(summary).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByText("About the test chart"),
    ).toBeInTheDocument();
    await user.click(summary);
    expect(details.open).toBe(false);
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    const { container } = renderHelp();
    const details = container.querySelector("details") as HTMLDetailsElement;
    const summary = details.querySelector("summary")!;
    await user.click(summary);
    await user.keyboard("{Escape}");
    expect(details.open).toBe(false);
    expect(summary).toHaveFocus();
  });

  it("closes on a primary click outside but not inside", async () => {
    const user = userEvent.setup();
    const { container } = renderHelp();
    const details = container.querySelector("details") as HTMLDetailsElement;
    await user.click(details.querySelector("summary")!);
    fireEvent.pointerDown(details, { clientX: 0, clientY: 0 });
    expect(details.open).toBe(true);
    fireEvent.pointerDown(document, { clientX: 0, clientY: 0 });
    expect(details.open).toBe(false);
  });

  it("offers a close X that closes and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    const { container } = renderHelp();
    const details = container.querySelector("details") as HTMLDetailsElement;
    const summary = details.querySelector("summary")!;
    await user.click(summary);
    const close = screen.getByRole("button", {
      name: "Close: About the test chart",
    });
    expect(close).toBeInTheDocument();
    await user.click(close);
    expect(details.open).toBe(false);
    expect(summary).toHaveFocus();
  });

  it("shifts a left-clipped popover back inside the viewport", async () => {
    const user = userEvent.setup();
    stubViewWidth(360);
    const { container } = renderHelp();
    const details = container.querySelector("details") as HTMLDetailsElement;
    const popover = container.querySelector(
      ".live-panel__popover",
    ) as HTMLDivElement;
    // jsdom lays everything out at 0,0: fake a popover hanging past the
    // left viewport edge, like a trigger near the left screen edge
    vi.spyOn(popover, "getBoundingClientRect").mockReturnValue(
      rect(-50, 250),
    );
    await user.click(details.querySelector("summary")!);
    expect(popover.style.transform).toBe("translateX(58px)");
  });

  it("shifts a right-clipped popover back inside the viewport", async () => {
    const user = userEvent.setup();
    stubViewWidth(360);
    const { container } = renderHelp();
    const details = container.querySelector("details") as HTMLDetailsElement;
    const popover = container.querySelector(
      ".live-panel__popover",
    ) as HTMLDivElement;
    vi.spyOn(popover, "getBoundingClientRect").mockReturnValue(
      rect(70, 370),
    );
    await user.click(details.querySelector("summary")!);
    expect(popover.style.transform).toBe("translateX(-18px)");
  });

  it("keeps an applied shift stable when a re-clamp re-measures the shifted rect", async () => {
    const user = userEvent.setup();
    stubViewWidth(360);
    const { container } = renderHelp();
    const details = container.querySelector("details") as HTMLDetailsElement;
    const popover = container.querySelector(
      ".live-panel__popover",
    ) as HTMLDivElement;
    const spy = vi
      .spyOn(popover, "getBoundingClientRect")
      .mockReturnValue(rect(-50, 250));
    await user.click(details.querySelector("summary")!);
    expect(popover.style.transform).toBe("translateX(58px)");
    // A resize re-check now measures the SHIFTED rect (left 8): the clamp
    // must recognise its own shift and hold position instead of zeroing it
    // (the popover used to snap back out of the viewport here)
    spy.mockReturnValue(rect(8, 308));
    window.dispatchEvent(new Event("resize"));
    expect(popover.style.transform).toBe("translateX(58px)");
    // Real drift still updates the shift: the rect now reflects the applied
    // shift (gBCR is post-transform), so natural -100 measures as -42
    spy.mockReturnValue(rect(-42, 258));
    window.dispatchEvent(new Event("resize"));
    expect(popover.style.transform).toBe("translateX(108px)");
  });

  it("leaves a fitting popover unshifted, re-clamps on resize, resets on close", async () => {
    const user = userEvent.setup();
    stubViewWidth(1024);
    const { container } = renderHelp();
    const details = container.querySelector("details") as HTMLDetailsElement;
    const popover = container.querySelector(
      ".live-panel__popover",
    ) as HTMLDivElement;
    const spy = vi
      .spyOn(popover, "getBoundingClientRect")
      .mockReturnValue(rect(100, 400));
    await user.click(details.querySelector("summary")!);
    expect(popover.style.transform).toBe("");
    // A resize that makes the same popover clip the left edge re-clamps
    spy.mockReturnValue(rect(-50, 250));
    window.dispatchEvent(new Event("resize"));
    expect(popover.style.transform).toBe("translateX(58px)");
    // Closing clears the shift so the next open re-measures from scratch
    await user.click(details.querySelector("summary")!);
    expect(details.open).toBe(false);
    expect(popover.style.transform).toBe("");
  });

  it("renders several paragraphs for the oval-glow content shape", () => {
    const { container } = render(
      <HelpPopover
        popoverClassName="oval-glow__popover"
        content={{
          label: "About this map",
          paragraphs: ["First.", "Second.", "Third."],
        }}
      />,
    );
    const details = container.querySelector("details")!;
    expect(details.className).toBe("live-panel__help");
    const popover = details.querySelector(".oval-glow__popover")!;
    expect(popover.querySelectorAll("p")).toHaveLength(3);
    expect(popover.querySelector(".help-popover__close")).not.toBeNull();
  });
});

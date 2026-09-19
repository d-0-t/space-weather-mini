import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import HelpPopover, { placePopover } from "./HelpPopover";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** jsdom does no layout, so its clientWidth is always 0: pin the viewport. */
const stubViewWidth = (value: number): void => {
  vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(
    value,
  );
};

describe("placePopover", () => {
  it("right-aligns the body to the trigger and drops it below", () => {
    expect(
      placePopover(
        { top: 100, bottom: 120, right: 500 },
        { width: 300, height: 150 },
        1024,
        768,
      ),
    ).toEqual({ top: 126, left: 200 });
  });

  it("clamps a body hanging past the left viewport edge", () => {
    expect(
      placePopover(
        { top: 100, bottom: 120, right: 200 },
        { width: 300, height: 150 },
        1024,
        768,
      ),
    ).toEqual({ top: 126, left: 8 });
  });

  it("clamps a body hanging past the right viewport edge", () => {
    expect(
      placePopover(
        { top: 100, bottom: 120, right: 1020 },
        { width: 300, height: 150 },
        1024,
        768,
      ),
    ).toEqual({ top: 126, left: 716 });
  });

  it("flips above the trigger when there is no room below", () => {
    expect(
      placePopover(
        { top: 600, bottom: 620, right: 500 },
        { width: 300, height: 200 },
        1024,
        768,
      ),
    ).toEqual({ top: 394, left: 200 });
  });

  it("stays below when neither side has room", () => {
    expect(
      placePopover(
        { top: 5, bottom: 25, right: 500 },
        { width: 300, height: 300 },
        1024,
        300,
      ),
    ).toEqual({ top: 31, left: 200 });
  });

  it("honors a custom gutter", () => {
    expect(
      placePopover(
        { top: 100, bottom: 120, right: 200 },
        { width: 300, height: 150 },
        1024,
        768,
        20,
      ),
    ).toEqual({ top: 126, left: 20 });
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
  it("toggles from a real button trigger and reports aria-expanded", async () => {
    const user = userEvent.setup();
    const { container } = renderHelp();
    const trigger = container.querySelector(
      ".live-panel__help > button",
    ) as HTMLButtonElement;
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger.classList.contains("btn--icon")).toBe(true);
    expect(trigger).toHaveAttribute("title", "About the test chart");
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("About the test chart")).toBeInTheDocument();
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("moves focus into the body when it opens", async () => {
    const user = userEvent.setup();
    renderHelp();
    await user.click(
      document.querySelector(".live-panel__help > button") as HTMLButtonElement,
    );
    // The first focusable in the body (the close X) receives focus
    expect(
      screen.getByRole("button", { name: "Close: About the test chart" }),
    ).toHaveFocus();
  });

  it("keeps Tab cycling inside the body until it closes", async () => {
    const user = userEvent.setup();
    render(
      <HelpPopover
        content={{
          label: "About the test chart",
          text: "Prose.",
          footnote: <a href="/explainers#kp-index">Read the full glossary</a>,
        }}
      />,
    );
    await user.click(
      document.querySelector(".live-panel__help > button") as HTMLButtonElement,
    );
    const close = screen.getByRole("button", {
      name: "Close: About the test chart",
    });
    const link = screen.getByRole("link", { name: "Read the full glossary" });
    expect(close).toHaveFocus();
    await user.tab();
    expect(link).toHaveFocus();
    // Tab off the last focusable wraps to the first
    await user.tab();
    expect(close).toHaveFocus();
    // Shift+Tab off the first wraps to the last
    await user.tab({ shift: true });
    expect(link).toHaveFocus();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    const { container } = renderHelp();
    const trigger = container.querySelector(
      ".live-panel__help > button",
    ) as HTMLButtonElement;
    await user.click(trigger);
    await user.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("closes on a primary click outside but not inside", async () => {
    const user = userEvent.setup();
    const { container } = renderHelp();
    const trigger = container.querySelector(
      ".live-panel__help > button",
    ) as HTMLButtonElement;
    await user.click(trigger);
    const popover = container.ownerDocument.querySelector(
      ".live-panel__popover",
    ) as HTMLDivElement;
    expect(popover).not.toBeNull();
    fireEvent.pointerDown(popover, { clientX: 0, clientY: 0 });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.pointerDown(document.body, { clientX: 0, clientY: 0 });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    // Dismissal hands focus back to the trigger, like Escape and the close X
    expect(trigger).toHaveFocus();
  });

  it("offers a close X that closes and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    const { container } = renderHelp();
    const trigger = container.querySelector(
      ".live-panel__help > button",
    ) as HTMLButtonElement;
    await user.click(trigger);
    const close = screen.getByRole("button", {
      name: "Close: About the test chart",
    });
    expect(close).toBeInTheDocument();
    await user.click(close);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("positions the portalled body against the trigger", async () => {
    const user = userEvent.setup();
    stubViewWidth(1024);
    const { container } = renderHelp();
    const trigger = container.querySelector(
      ".live-panel__help > button",
    ) as HTMLButtonElement;
    await user.click(trigger);
    const popover = container.ownerDocument.querySelector(
      ".live-panel__popover",
    ) as HTMLDivElement;
    // jsdom lays everything out at 0,0: the body is clamped to the gutter
    expect(popover.style.top).toBe("6px");
    expect(popover.style.left).toBe("8px");
    expect(popover.style.visibility).toBe("visible");
  });

  it("renders a custom summary trigger with no info chrome", async () => {
    const user = userEvent.setup();
    render(
      <HelpPopover
        content={{ label: "About Kp index", text: "The planetary index." }}
        trigger={<span>Kp index</span>}
      />,
    );
    const trigger = screen.getByRole("button", { name: "Kp index" });
    expect(trigger.classList.contains("btn--icon")).toBe(false);
    expect(trigger).not.toHaveAttribute("title");
    await user.click(trigger);
    expect(screen.getByText("The planetary index.")).toBeInTheDocument();
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
    const details = container.querySelector(".live-panel__help")!;
    const trigger = details.querySelector("button")!;
    // The closed body is not in the DOM at all
    expect(container.querySelector(".oval-glow__popover")).toBeNull();
    fireEvent.click(trigger);
    const popover = container.ownerDocument.querySelector(
      ".oval-glow__popover",
    )!;
    expect(popover.querySelectorAll("p")).toHaveLength(3);
    expect(popover.querySelector(".help-popover__close")).not.toBeNull();
  });

  it("mounts the body inside a dialog ancestor so a modal dialog can host it", async () => {
    const user = userEvent.setup();
    render(
      <dialog open>
        <HelpPopover
          content={{ label: "About the Kp alert threshold", text: "The scale." }}
        />
      </dialog>,
    );
    await user.click(
      screen.getByRole("button", { name: "About the Kp alert threshold" }),
    );
    const dialog = document.querySelector("dialog")!;
    // A body-portalled popover would paint behind the modal dialog's
    // top layer, so the body mounts inside the dialog element instead.
    expect(dialog.querySelector(".help-popover")).not.toBeNull();
    expect(
      document.body.querySelector(":scope > .help-popover"),
    ).toBeNull();
  });
});

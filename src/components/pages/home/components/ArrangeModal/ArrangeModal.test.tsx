// TDD RED for dashboard-layout ticket 07: Arrange modal editing all three
// buckets. Seams (spec Testing Decisions): tab switching per Layout bucket,
// reorder by buttons + arrow keys + drag inside the dialog only, Apply
// commits all buckets, Cancel and every dismiss path discards, focus returns
// to the trigger, Reset-to-default restores the agreed defaults. External
// behavior only: the dialog DOM and the saved storage shape.
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ArrangeModal from "./ArrangeModal";
import {
  DASHBOARD_LAYOUT_STORAGE_KEY,
  DEFAULT_DASHBOARD_LAYOUT,
  MD_QUERY,
  loadDashboardLayout,
  saveDashboardLayout,
  type DashboardLayout,
} from "../../dashboardLayout";

/**
 * The host the way Home composes it (nav Time modal pattern): the modal
 * mounts only while open, Apply hands the committed layout to the host,
 * closing unmounts it. The router wraps it because the conditional-panel
 * notes link to the app's pages.
 */
const Host: React.FC<{ onApply?: (layout: DashboardLayout) => void }> = ({
  onApply = () => {},
}) => {
  const [open, setOpen] = useState(true);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <MemoryRouter>
      <div>
        <button ref={triggerRef} onClick={() => setOpen(true)}>
          Rearrange
        </button>
        {open ? (
          <ArrangeModal
            triggerRef={triggerRef}
            onClose={() => setOpen(false)}
            onApply={onApply}
          />
        ) : null}
      </div>
    </MemoryRouter>
  );
};

const renderModal = () => render(<Host />);

const openDialog = (): HTMLDialogElement => {
  const dialog = document.querySelector(
    "dialog.arrange-dialog",
  ) as HTMLDialogElement;
  expect(dialog.open).toBe(true);
  return dialog;
};

/** One bucket's rows as panel names, per named list (the row label spans). */
const rowsOf = (container: ParentNode, listName: string): string[] => {
  const list = within(container as HTMLElement).getByRole("list", {
    name: listName,
  });
  return Array.from(
    list.querySelectorAll(".arrange-dialog__row-label"),
  ).map((label) => label.textContent ?? "");
};

/** The row element carrying a panel name. */
const rowByLabel = (
  container: HTMLElement,
  listName: string,
  label: string,
): HTMLElement => {
  const list = within(container).getByRole("list", { name: listName });
  const row = Array.from(list.querySelectorAll("li")).find(
    (li) =>
      li.querySelector(".arrange-dialog__row-label")?.textContent === label,
  );
  expect(row).toBeDefined();
  return row as HTMLElement;
};

beforeEach(() => {
  localStorage.clear();
});

describe("Arrange modal shell (dashboard-layout ticket 07)", () => {
  it("opens mounted-only from the trigger, named by its visible heading", () => {
    renderModal();
    const dialog = openDialog();
    expect(screen.getByRole("dialog", { name: "Rearrange" })).toBe(dialog);
    expect(
      within(dialog).getByRole("heading", { name: "Rearrange" }),
    ).toBeInTheDocument();
  });

  it("shows one tab per Layout bucket and opens on the current bucket's tab", () => {
    renderModal();
    const dialog = openDialog();
    const tablist = within(dialog).getByRole("tablist", {
      name: "Layout buckets",
    });
    const tabs = within(tablist).getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "1-column",
      "2-column",
      "3-column",
    ]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
  });

  it("opens on the tab matching the current Layout bucket when md matches", () => {
    // md matches -> the 2-column bucket is live on the Dashboard.
    const impl = (query: string) => ({
      matches: query === MD_QUERY,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    vi.stubGlobal("matchMedia", impl);
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: impl,
    });
    renderModal();
    const dialog = openDialog();
    const selected = within(dialog).getByRole("tab", {
      name: "2-column",
      selected: true,
    });
    expect(selected).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("lists the 1-column default order top to bottom", () => {
    renderModal();
    const dialog = openDialog();
    expect(
      within(dialog).getByRole("tab", { name: "1-column", selected: true }),
    ).toBeInTheDocument();
    expect(rowsOf(dialog, "Panels")).toEqual([
      "Aurora now",
      "Pinned webcams",
      "Summary",
      "Oval glow",
      "Possible locations",
      "Solar wind",
      "Magnetosphere",
      "Forecast",
    ]);
  });

  it("lists the 2-column defaults as column A and B lists", async () => {
    const user = userEvent.setup();
    renderModal();
    const dialog = openDialog();
    await user.click(within(dialog).getByRole("tab", { name: "2-column" }));
    expect(rowsOf(dialog, "Column A")).toEqual([
      "Aurora now",
      "Summary",
      "Oval glow",
      "Forecast",
    ]);
    expect(rowsOf(dialog, "Column B")).toEqual([
      "Pinned webcams",
      "Possible locations",
      "Solar wind",
      "Magnetosphere",
    ]);
  });

  it("lists the 3-column defaults as columns A, B and C", async () => {
    const user = userEvent.setup();
    renderModal();
    const dialog = openDialog();
    await user.click(within(dialog).getByRole("tab", { name: "3-column" }));
    expect(rowsOf(dialog, "Column A")).toEqual([
      "Aurora now",
      "Summary",
      "Oval glow",
    ]);
    expect(rowsOf(dialog, "Column B")).toEqual(["Solar wind", "Magnetosphere"]);
    expect(rowsOf(dialog, "Column C")).toEqual([
      "Pinned webcams",
      "Possible locations",
      "Forecast",
    ]);
  });

  it("Apply persists the seeded layout under the versioned key, commits to the host and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(<Host onApply={onApply} />);
    const dialog = openDialog();
    await user.click(within(dialog).getByRole("button", { name: "Apply" }));
    expect(dialog.open).toBe(false);
    expect(screen.queryByRole("dialog", { name: "Rearrange" })).toBeNull();
    expect(
      JSON.parse(
        localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY) as string,
      ),
    ).toEqual(DEFAULT_DASHBOARD_LAYOUT);
    expect(onApply).toHaveBeenCalledWith(DEFAULT_DASHBOARD_LAYOUT);
    expect(screen.getByRole("button", { name: "Rearrange" })).toHaveFocus();
  });

  it("Apply saves an edited draft, not the stale storage value", async () => {
    // Seed a custom arrangement: the modal must commit what the dialog
    // shows, seeded from storage at open time.
    const seeded: DashboardLayout = {
      v: 1,
      single: [
        "aurora-now",
        "pinned-webcams",
        "summary",
        "oval-glow",
        "possible-locations",
        "solar-wind",
        "magnetosphere",
        "forecast",
      ],
      double: [
        ["aurora-now", "summary", "oval-glow", "forecast"],
        ["pinned-webcams", "possible-locations", "solar-wind", "magnetosphere"],
      ],
      triple: [
        ["aurora-now", "summary", "oval-glow"],
        ["solar-wind", "magnetosphere"],
        ["pinned-webcams", "possible-locations", "forecast"],
      ],
    };
    saveDashboardLayout(localStorage, seeded);
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(<Host onApply={onApply} />);
    const dialog = openDialog();
    await user.click(within(dialog).getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledWith(seeded);
  });

  it("Cancel discards the draft: storage untouched, host never re-renders", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    saveDashboardLayout(localStorage, {
      v: 1,
      single: ["forecast"],
      double: [["aurora-now"], []],
      triple: [["aurora-now"], [], []],
    });
    render(<Host onApply={onApply} />);
    const dialog = openDialog();
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog", { name: "Rearrange" })).toBeNull();
    expect(onApply).not.toHaveBeenCalled();
    // The custom seed survives untouched.
    expect(
      JSON.parse(
        localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY) as string,
      ),
    ).toEqual({ v: 1, single: ["forecast"], double: [["aurora-now"], []], triple: [["aurora-now"], [], []] });
  });

  it("the close X discards the draft without saving", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(<Host onApply={onApply} />);
    const dialog = openDialog();
    await user.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog", { name: "Rearrange" })).toBeNull();
    expect(onApply).not.toHaveBeenCalled();
    expect(localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY)).toBeNull();
  });

  it("Escape discards the draft without saving", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(<Host onApply={onApply} />);
    openDialog();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Rearrange" })).toBeNull();
    expect(onApply).not.toHaveBeenCalled();
    expect(localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY)).toBeNull();
  });

  it("a backdrop click discards the draft without saving", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(<Host onApply={onApply} />);
    openDialog();
    fireEvent.pointerDown(document, {
      button: 0,
      clientX: 200,
      clientY: 200,
    });
    expect(screen.queryByRole("dialog", { name: "Rearrange" })).toBeNull();
    expect(onApply).not.toHaveBeenCalled();
    expect(localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY)).toBeNull();
  });

  it("reopening after a discard seeds the draft from storage again", async () => {
    const user = userEvent.setup();
    renderModal();
    const dialog = openDialog();
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Rearrange" }));
    const reopened = openDialog();
    expect(rowsOf(reopened, "Panels").indexOf("Pinned webcams")).toBe(1);
  });

  it("Reset-to-default restores the agreed defaults into the draft only until Apply", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    saveDashboardLayout(localStorage, {
      v: 1,
      single: [
        "forecast",
        "aurora-now",
        "pinned-webcams",
        "summary",
        "oval-glow",
        "possible-locations",
        "solar-wind",
        "magnetosphere",
      ],
      double: [
        ["aurora-now", "summary", "oval-glow", "forecast"],
        ["pinned-webcams", "possible-locations", "solar-wind", "magnetosphere"],
      ],
      triple: [
        ["aurora-now", "summary", "oval-glow"],
        ["solar-wind", "magnetosphere"],
        ["pinned-webcams", "possible-locations", "forecast"],
      ],
    });
    render(<Host onApply={onApply} />);
    const dialog = openDialog();
    expect(rowsOf(dialog, "Panels")[0]).toBe("Forecast");
    await user.click(within(dialog).getByRole("button", { name: "Reset to default" }));
    // The draft now matches the agreed defaults...
    expect(rowsOf(dialog, "Panels")[0]).toBe("Aurora now");
    expect(rowsOf(dialog, "Panels").at(-1)).toBe("Forecast");
    // ...but nothing is live or saved yet.
    expect(onApply).not.toHaveBeenCalled();
    expect(
      JSON.parse(
        localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY) as string,
      ).single[0],
    ).toBe("forecast");
    // Apply commits the restored defaults for every bucket.
    await user.click(within(dialog).getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledWith(DEFAULT_DASHBOARD_LAYOUT);
    expect(
      JSON.parse(
        localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY) as string,
      ),
    ).toEqual(DEFAULT_DASHBOARD_LAYOUT);
  });

  it("Reset-to-default also restores every other bucket's defaults after edits", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    // Corrupt-ish storage (normalized by load) with a reshuffled 2-column.
    saveDashboardLayout(localStorage, {
      v: 1,
      single: [
        "aurora-now",
        "pinned-webcams",
        "summary",
        "oval-glow",
        "possible-locations",
        "solar-wind",
        "magnetosphere",
        "forecast",
      ],
      double: [
        ["forecast", "aurora-now", "summary", "oval-glow"],
        ["pinned-webcams", "possible-locations", "solar-wind", "magnetosphere"],
      ],
      triple: [
        ["aurora-now", "summary", "oval-glow"],
        ["solar-wind", "magnetosphere"],
        ["pinned-webcams", "possible-locations", "forecast"],
      ],
    });
    render(<Host onApply={onApply} />);
    const dialog = openDialog();
    await user.click(within(dialog).getByRole("tab", { name: "2-column" }));
    expect(rowsOf(dialog, "Column A")[0]).toBe("Forecast");
    await user.click(within(dialog).getByRole("button", { name: "Reset to default" }));
    expect(rowsOf(dialog, "Column A")).toEqual([
      "Aurora now",
      "Summary",
      "Oval glow",
      "Forecast",
    ]);
    await user.click(within(dialog).getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledWith(DEFAULT_DASHBOARD_LAYOUT);
  });

  it("keeps unknown future panel ids in the lists instead of vanishing them", () => {
    // A foreign future id rides storage (ticket 04 contract); the modal
    // lists it under its raw id and preserves it through edits.
    const withUnknown = {
      v: 1,
      single: [
        "aurora-now",
        "future-panel",
        "pinned-webcams",
        "summary",
        "oval-glow",
        "possible-locations",
        "solar-wind",
        "magnetosphere",
        "forecast",
      ],
      double: [
        ["aurora-now", "summary", "oval-glow", "forecast"],
        [
          "pinned-webcams",
          "possible-locations",
          "solar-wind",
          "magnetosphere",
          "future-panel",
        ],
      ],
      triple: [
        ["aurora-now", "summary", "oval-glow"],
        ["solar-wind", "magnetosphere"],
        ["pinned-webcams", "possible-locations", "forecast"],
      ],
    };
    localStorage.setItem(
      DASHBOARD_LAYOUT_STORAGE_KEY,
      JSON.stringify(withUnknown),
    );
    renderModal();
    const dialog = openDialog();
    expect(rowsOf(dialog, "Panels")).toContain("future-panel");
  });
});

describe("Arrange modal copy (dashboard-layout ticket 07 follow-up)", () => {
  it("explains that the column count follows the screen or window size", () => {
    renderModal();
    const dialog = openDialog();
    expect(
      within(dialog).getByText(/screen or window size/i),
    ).toBeInTheDocument();
  });

  it("notes on the Pinned webcams row why the panel may be absent, linking to the webcams page", () => {
    renderModal();
    const dialog = openDialog();
    const pinnedRow = rowByLabel(dialog, "Panels", "Pinned webcams");
    expect(
      within(pinnedRow).getByText(/Only shown if you have/),
    ).toBeInTheDocument();
    const link = within(pinnedRow).getByRole("link", {
      name: "pinned webcams",
    });
    expect(link).toHaveAttribute("href", "/webcams");
  });

  it("notes on the Possible locations row why the panel may be absent", () => {
    renderModal();
    const dialog = openDialog();
    const reachRow = rowByLabel(dialog, "Panels", "Possible locations");
    expect(
      within(reachRow).getByText(/Only shown when the aurora is strong enough/),
    ).toBeInTheDocument();
  });

  it("leaves the always-shown panels without a note", () => {
    renderModal();
    const dialog = openDialog();
    const summaryRow = rowByLabel(dialog, "Panels", "Summary");
    expect(within(summaryRow).queryByRole("link")).toBeNull();
    expect(summaryRow.querySelector(".arrange-dialog__row-note")).toBeNull();
    const forecastRow = rowByLabel(dialog, "Panels", "Forecast");
    expect(forecastRow.querySelector(".arrange-dialog__row-note")).toBeNull();
  });

  it("carries the active bucket's panel modifier so the columns can mirror the bucket's fractions", async () => {
    const user = userEvent.setup();
    renderModal();
    const dialog = openDialog();
    expect(dialog.querySelector(".arrange-dialog__panel--1-column")).not.toBeNull();
    await user.click(within(dialog).getByRole("tab", { name: "2-column" }));
    expect(dialog.querySelector(".arrange-dialog__panel--2-column")).not.toBeNull();
    expect(dialog.querySelector(".arrange-dialog__panel--1-column")).toBeNull();
    await user.click(within(dialog).getByRole("tab", { name: "3-column" }));
    expect(dialog.querySelector(".arrange-dialog__panel--3-column")).not.toBeNull();
  });
});

describe("Arrange modal reorder (dashboard-layout ticket 07)", () => {
  it("the up button moves a panel one row up inside the dialog only", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(<Host onApply={onApply} />);
    const dialog = openDialog();
    const summaryRow = rowByLabel(dialog, "Panels", "Summary");
    await user.click(
      within(summaryRow).getByRole("button", { name: "Move Summary up" }),
    );
    expect(rowsOf(dialog, "Panels")).toEqual([
      "Aurora now",
      "Summary",
      "Pinned webcams",
      "Oval glow",
      "Possible locations",
      "Solar wind",
      "Magnetosphere",
      "Forecast",
    ]);
    // Dialog-only: nothing saved, host untouched.
    expect(onApply).not.toHaveBeenCalled();
    expect(localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY)).toBeNull();
  });

  it("the down button moves a panel one row down inside the dialog only", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(<Host onApply={onApply} />);
    const dialog = openDialog();
    const auroraRow = rowByLabel(dialog, "Panels", "Aurora now");
    await user.click(
      within(auroraRow).getByRole("button", { name: "Move Aurora now down" }),
    );
    expect(rowsOf(dialog, "Panels")[0]).toBe("Pinned webcams");
    expect(rowsOf(dialog, "Panels")[1]).toBe("Aurora now");
    expect(onApply).not.toHaveBeenCalled();
  });

  it("ArrowUp and ArrowDown on a focused row move the panel inside the dialog only", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(<Host onApply={onApply} />);
    const dialog = openDialog();
    const summaryRow = rowByLabel(dialog, "Panels", "Summary");
    summaryRow.focus();
    await user.keyboard("{ArrowUp}");
    expect(rowsOf(dialog, "Panels")[1]).toBe("Summary");
    expect(rowByLabel(dialog, "Panels", "Summary")).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(rowsOf(dialog, "Panels")[2]).toBe("Summary");
    expect(onApply).not.toHaveBeenCalled();
    expect(localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY)).toBeNull();
  });

  it("ArrowUp on the first row is a no-op and keeps focus", async () => {
    const user = userEvent.setup();
    renderModal();
    const dialog = openDialog();
    const firstRow = rowByLabel(dialog, "Panels", "Aurora now");
    firstRow.focus();
    await user.keyboard("{ArrowUp}");
    expect(rowsOf(dialog, "Panels")[0]).toBe("Aurora now");
  });

  it("the right button moves a panel to the next column in the 2-column tab", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    saveDashboardLayout(localStorage, loadDashboardLayout(localStorage));
    render(<Host onApply={onApply} />);
    const dialog = openDialog();
    await user.click(within(dialog).getByRole("tab", { name: "2-column" }));
    const summaryRow = rowByLabel(dialog, "Column A", "Summary");
    await user.click(
      within(summaryRow).getByRole("button", { name: "Move Summary right" }),
    );
    expect(rowsOf(dialog, "Column A")).toEqual(["Aurora now", "Oval glow", "Forecast"]);
    // Buttons append to the target column; dropping on a row places it.
    expect(rowsOf(dialog, "Column B")).toEqual([
      "Pinned webcams",
      "Possible locations",
      "Solar wind",
      "Magnetosphere",
      "Summary",
    ]);
    expect(onApply).not.toHaveBeenCalled();
  });

  it("the left button moves a panel to the previous column in the 3-column tab", async () => {
    const user = userEvent.setup();
    saveDashboardLayout(localStorage, loadDashboardLayout(localStorage));
    renderModal();
    const dialog = openDialog();
    await user.click(within(dialog).getByRole("tab", { name: "3-column" }));
    const magnetosphereRow = rowByLabel(dialog, "Column B", "Magnetosphere");
    await user.click(
      within(magnetosphereRow).getByRole("button", {
        name: "Move Magnetosphere left",
      }),
    );
    expect(rowsOf(dialog, "Column A")).toEqual([
      "Aurora now",
      "Summary",
      "Oval glow",
      "Magnetosphere",
    ]);
    expect(rowsOf(dialog, "Column B")).toEqual(["Solar wind"]);
    expect(rowsOf(dialog, "Column C")).toEqual([
      "Pinned webcams",
      "Possible locations",
      "Forecast",
    ]);
  });

  it("ArrowRight and ArrowLeft on a focused row move the panel between columns", async () => {
    const user = userEvent.setup();
    saveDashboardLayout(localStorage, loadDashboardLayout(localStorage));
    renderModal();
    const dialog = openDialog();
    await user.click(within(dialog).getByRole("tab", { name: "2-column" }));
    const summaryRow = rowByLabel(dialog, "Column A", "Summary");
    summaryRow.focus();
    await user.keyboard("{ArrowRight}");
    expect(rowsOf(dialog, "Column B")).toContain("Summary");
    expect(rowByLabel(dialog, "Column B", "Summary")).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(rowsOf(dialog, "Column A")).toContain("Summary");
    expect(rowsOf(dialog, "Column B")).not.toContain("Summary");
  });

  it("the 1-column tab has no left or right column moves", () => {
    renderModal();
    const dialog = openDialog();
    const rows = within(dialog).getAllByRole("listitem");
    for (const row of rows) {
      expect(within(row).queryByRole("button", { name: /left$/ })).toBeNull();
      expect(within(row).queryByRole("button", { name: /right$/ })).toBeNull();
    }
  });

  it("Apply after a keyboard reorder persists the new order in the edited bucket only", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(<Host onApply={onApply} />);
    const dialog = openDialog();
    const summaryRow = rowByLabel(dialog, "Panels", "Summary");
    summaryRow.focus();
    await user.keyboard("{ArrowUp}");
    await user.click(within(dialog).getByRole("button", { name: "Apply" }));
    const saved = JSON.parse(
      localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY) as string,
    ) as DashboardLayout;
    expect(saved.single).toEqual([
      "aurora-now",
      "summary",
      "pinned-webcams",
      "oval-glow",
      "possible-locations",
      "solar-wind",
      "magnetosphere",
      "forecast",
    ]);
    // The sibling buckets ride along unchanged.
    expect(saved.double).toEqual(DEFAULT_DASHBOARD_LAYOUT.double);
    expect(saved.triple).toEqual(DEFAULT_DASHBOARD_LAYOUT.triple);
    expect(onApply).toHaveBeenCalledWith(saved);
  });

  it("a row dropped on another row reorders via mouse drag inside the dialog only", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(<Host onApply={onApply} />);
    const dialog = openDialog();
    const source = rowByLabel(dialog, "Panels", "Forecast");
    const target = rowByLabel(dialog, "Panels", "Aurora now");
    fireEvent.dragStart(source, {
      dataTransfer: { setData: vi.fn(), getData: () => "forecast" },
    });
    fireEvent.dragOver(target, {
      dataTransfer: { setData: vi.fn(), getData: () => "forecast" },
    });
    fireEvent.drop(target, {
      dataTransfer: { setData: vi.fn(), getData: () => "forecast" },
    });
    expect(rowsOf(dialog, "Panels")[0]).toBe("Forecast");
    expect(rowsOf(dialog, "Panels")[1]).toBe("Aurora now");
    expect(onApply).not.toHaveBeenCalled();
    expect(localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY)).toBeNull();
  });

  it("a row dragged downward lands after the hovered row, dragging upward before it", async () => {
    const user = userEvent.setup();
    renderModal();
    const dialog = openDialog();
    // Downward: Summary onto Oval glow (the row below it) lands after it.
    let source = rowByLabel(dialog, "Panels", "Summary");
    const downTarget = rowByLabel(dialog, "Panels", "Oval glow");
    fireEvent.dragStart(source, {
      dataTransfer: { setData: vi.fn(), getData: () => "summary" },
    });
    fireEvent.dragOver(downTarget, {
      dataTransfer: { setData: vi.fn(), getData: () => "summary" },
    });
    fireEvent.drop(downTarget, {
      dataTransfer: { setData: vi.fn(), getData: () => "summary" },
    });
    expect(rowsOf(dialog, "Panels")).toEqual([
      "Aurora now",
      "Pinned webcams",
      "Oval glow",
      "Summary",
      "Possible locations",
      "Solar wind",
      "Magnetosphere",
      "Forecast",
    ]);
    // Upward again: the same drop direction as the row-hover highlight.
    source = rowByLabel(dialog, "Panels", "Summary");
    const upTarget = rowByLabel(dialog, "Panels", "Oval glow");
    fireEvent.dragStart(source, {
      dataTransfer: { setData: vi.fn(), getData: () => "summary" },
    });
    fireEvent.dragOver(upTarget, {
      dataTransfer: { setData: vi.fn(), getData: () => "summary" },
    });
    fireEvent.drop(upTarget, {
      dataTransfer: { setData: vi.fn(), getData: () => "summary" },
    });
    expect(rowsOf(dialog, "Panels")[2]).toBe("Summary");
  });

  it("a row dropped on another column's list moves across columns via mouse drag", async () => {
    const user = userEvent.setup();
    saveDashboardLayout(localStorage, loadDashboardLayout(localStorage));
    renderModal();
    const dialog = openDialog();
    await user.click(within(dialog).getByRole("tab", { name: "2-column" }));
    const summaryRow = rowByLabel(dialog, "Column A", "Summary");
    const columnB = within(dialog).getByRole("list", { name: "Column B" });
    fireEvent.dragStart(summaryRow, {
      dataTransfer: { setData: vi.fn(), getData: () => "summary" },
    });
    fireEvent.dragOver(columnB, {
      dataTransfer: { setData: vi.fn(), getData: () => "summary" },
    });
    fireEvent.drop(columnB, {
      dataTransfer: { setData: vi.fn(), getData: () => "summary" },
    });
    expect(rowsOf(dialog, "Column B").at(-1)).toBe("Summary");
    expect(rowsOf(dialog, "Column A")).not.toContain("Summary");
  });

  it("drag leaves the draft unchanged when dropped outside any list", async () => {
    const user = userEvent.setup();
    renderModal();
    const dialog = openDialog();
    const source = rowByLabel(dialog, "Panels", "Aurora now");
    fireEvent.dragStart(source, {
      dataTransfer: { setData: vi.fn(), getData: () => "aurora-now" },
    });
    // Dropping outside the dialog's lists (the dialog heading area).
    const heading = within(dialog).getByRole("heading", { name: "Rearrange" });
    fireEvent.drop(heading, {
      dataTransfer: { setData: vi.fn(), getData: () => "aurora-now" },
    });
    expect(rowsOf(dialog, "Panels")[0]).toBe("Aurora now");
  });

  it("reopening after Apply shows the committed order, after Cancel the stored order", async () => {
    const user = userEvent.setup();
    renderModal();
    let dialog = openDialog();
    const summaryRow = rowByLabel(dialog, "Panels", "Summary");
    await user.click(
      within(summaryRow).getByRole("button", { name: "Move Summary up" }),
    );
    // Cancel: nothing sticks.
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Rearrange" }));
    dialog = openDialog();
    expect(rowsOf(dialog, "Panels")[1]).toBe("Pinned webcams");
    // Redo and Apply: it sticks.
    const redoRow = rowByLabel(dialog, "Panels", "Summary");
    await user.click(
      within(redoRow).getByRole("button", { name: "Move Summary up" }),
    );
    await user.click(within(dialog).getByRole("button", { name: "Apply" }));
    await user.click(screen.getByRole("button", { name: "Rearrange" }));
    dialog = openDialog();
    expect(rowsOf(dialog, "Panels")).toEqual([
      "Aurora now",
      "Summary",
      "Pinned webcams",
      "Oval glow",
      "Possible locations",
      "Solar wind",
      "Magnetosphere",
      "Forecast",
    ]);
    expect(loadDashboardLayout(localStorage).single).toEqual([
      "aurora-now",
      "summary",
      "pinned-webcams",
      "oval-glow",
      "possible-locations",
      "solar-wind",
      "magnetosphere",
      "forecast",
    ]);
  });
});

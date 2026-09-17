// TDD RED for dashboard-layout ticket 07 composition: the Dashboard header
// hosts the Rearrange trigger, Apply commits the draft to the live page and
// Cancel leaves it untouched.
process.env.TZ = "Europe/Stockholm";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import threeDayFixture from "../../../products/fixtures/3-day-forecast.txt?raw";
import kpObservedFixture from "../../../products/fixtures/noaa-planetary-k-index.json?raw";
import kpForecastFixture from "../../../products/fixtures/noaa-planetary-k-index-forecast.json?raw";
import rtswWindFixture from "../../../products/fixtures/rtsw-wind-1m.json?raw";
import rtswMagFixture from "../../../products/fixtures/rtsw-mag-1m.json?raw";
import { ovationJson } from "../../../test/ovation-test-utils";
import { DisplayTimezoneProvider } from "../../DisplayTimezone/DisplayTimezoneContext";
import Home from "./Home";
import { DASHBOARD_LAYOUT_STORAGE_KEY } from "./dashboardLayout";

const queryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const mockFetch = vi.fn();

beforeEach(() => {
  localStorage.clear();
  mockFetch.mockReset();
  mockFetch.mockImplementation((url: string) => {
    if (typeof url === "string" && url.includes("3-day-forecast.txt")) {
      return Promise.resolve({ ok: true, text: async () => threeDayFixture });
    }
    if (typeof url === "string" && url.includes("noaa-planetary-k-index-forecast.json")) {
      return Promise.resolve({ ok: true, text: async () => kpForecastFixture });
    }
    if (typeof url === "string" && url.includes("noaa-planetary-k-index.json")) {
      return Promise.resolve({ ok: true, text: async () => kpObservedFixture });
    }
    if (typeof url === "string" && url.includes("ovation_aurora_latest.json")) {
      return Promise.resolve({
        ok: true,
        text: async () => ovationJson([[0, 70, 3], [10, 65, 8]]),
      });
    }
    if (typeof url === "string" && url.includes("rtsw_wind_1m.json"))
      return Promise.resolve({ ok: true, text: async () => rtswWindFixture });
    if (typeof url === "string" && url.includes("rtsw_mag_1m.json"))
      return Promise.resolve({ ok: true, text: async () => rtswMagFixture });
    return Promise.resolve({ ok: true, text: async () => "" });
  });
  vi.stubGlobal("fetch", mockFetch);
});

const renderHome = () =>
  render(
    <QueryClientProvider client={queryClient()}>
      <MemoryRouter>
        <DisplayTimezoneProvider>
          <Home />
        </DisplayTimezoneProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );

/** The Dashboard panel h2s in DOM order, filtered to the eight known names. */
const panelOrder = (): string[] => {
  const known = new Set([
    "Aurora now",
    "Pinned webcams",
    "Summary",
    "Oval glow",
    "Possible locations",
    "Solar wind",
    "Magnetosphere",
    "Forecast",
  ]);
  return Array.from(document.querySelectorAll(".home__flow h2"))
    .map((h) => h.textContent?.trim() ?? "")
    .filter((name) => known.has(name));
};

/** Which panels render is data-dependent; relative order is the contract. */
const orderOf = (name: string): number => panelOrder().indexOf(name);

const expectOrder = (before: string, after: string): void => {
  expect(orderOf(before)).toBeLessThan(orderOf(after));
};

describe("Home Arrange composition (dashboard-layout ticket 07)", () => {
  it("opens the Arrange modal from the Dashboard header", async () => {
    const user = userEvent.setup();
    renderHome();
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /^Aurora now$/i })).toBeInTheDocument(),
    );
    const trigger = screen.getByRole("button", { name: "Rearrange" });
    expect(trigger.closest(".home__header")).not.toBeNull();
    expect(document.querySelector("dialog.arrange-dialog")).toBeNull();
    await user.click(trigger);
    const dialog = document.querySelector(
      "dialog.arrange-dialog",
    ) as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(screen.getByRole("dialog", { name: "Rearrange" })).toBe(dialog);
  });

  it("keeps the live Dashboard untouched until Apply, then re-renders and persists", async () => {
    const user = userEvent.setup();
    renderHome();
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /^Aurora now$/i })).toBeInTheDocument(),
    );
    expectOrder("Solar wind", "Magnetosphere");
    expectOrder("Magnetosphere", "Forecast");

    await user.click(screen.getByRole("button", { name: "Rearrange" }));
    const dialog = document.querySelector(
      "dialog.arrange-dialog",
    ) as HTMLDialogElement;
    const forecastRow = Array.from(dialog.querySelectorAll("li")).find(
      (row) =>
        row.querySelector(".arrange-dialog__row-label")?.textContent ===
        "Forecast",
    ) as HTMLElement;
    await user.click(
      within(forecastRow).getByRole("button", { name: "Move Forecast up" }),
    );
    // Mid-edit: the live page still shows the old order, storage untouched.
    expectOrder("Solar wind", "Magnetosphere");
    expectOrder("Magnetosphere", "Forecast");
    expect(localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY)).toBeNull();

    await user.click(
      document.querySelector("dialog.arrange-dialog")!.querySelector<HTMLElement>(
        "button.btn--primary",
      )!,
    );
    expect(document.querySelector("dialog.arrange-dialog")).toBeNull();
    expectOrder("Solar wind", "Forecast");
    expectOrder("Forecast", "Magnetosphere");
    expect(
      JSON.parse(localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY) as string)
        .single,
    ).toEqual([
      "aurora-now",
      "pinned-webcams",
      "summary",
      "oval-glow",
      "possible-locations",
      "solar-wind",
      "forecast",
      "magnetosphere",
    ]);
  });

  it("Cancel discards the draft and the live Dashboard keeps its order", async () => {
    const user = userEvent.setup();
    renderHome();
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /^Aurora now$/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Rearrange" }));
    const dialog = document.querySelector(
      "dialog.arrange-dialog",
    ) as HTMLDialogElement;
    const summaryRow = Array.from(dialog.querySelectorAll("li")).find(
      (row) =>
        row.querySelector(".arrange-dialog__row-label")?.textContent ===
        "Summary",
    ) as HTMLElement;
    await user.click(
      within(summaryRow).getByRole("button", { name: "Move Summary up" }),
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Cancel" }),
    );
    expect(document.querySelector("dialog.arrange-dialog")).toBeNull();
    expectOrder("Solar wind", "Magnetosphere");
    expectOrder("Magnetosphere", "Forecast");
    expectOrder("Aurora now", "Summary");
    expect(localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY)).toBeNull();
  });

  it("applies survive a remount (the next visit's order)", async () => {
    const user = userEvent.setup();
    const first = renderHome();
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /^Aurora now$/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Rearrange" }));
    let dialog = document.querySelector(
      "dialog.arrange-dialog",
    ) as HTMLDialogElement;
    const forecastRow = Array.from(dialog.querySelectorAll("li")).find(
      (row) =>
        row.querySelector(".arrange-dialog__row-label")?.textContent ===
        "Forecast",
    ) as HTMLElement;
    await user.click(
      within(forecastRow).getByRole("button", { name: "Move Forecast up" }),
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Apply" }),
    );
    first.unmount();

    renderHome();
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /^Aurora now$/i })).toBeInTheDocument(),
    );
    expectOrder("Solar wind", "Forecast");
    expectOrder("Forecast", "Magnetosphere");
  });
});


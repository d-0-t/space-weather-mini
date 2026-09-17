// TDD RED for dashboard layout ticket 05: per-panel Compact.
// Seams: panel UI (Solar wind / Magnetosphere / Pinned webcams each own an
// icon-led Compact checkbox as their CollapsiblePanel adornment, densifying
// only their own panel + persisting), Home composition (global toggle gone,
// no other panel shows Compact).
process.env.TZ = "Europe/Stockholm";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import threeDayFixture from "../../../products/fixtures/3-day-forecast.txt?raw";
import kpObservedFixture from "../../../products/fixtures/noaa-planetary-k-index.json?raw";
import kpForecastFixture from "../../../products/fixtures/noaa-planetary-k-index-forecast.json?raw";
import rtswWindFixture from "../../../products/fixtures/rtsw-wind-1m.json?raw";
import rtswMagFixture from "../../../products/fixtures/rtsw-mag-1m.json?raw";
import hemiFixture from "../../../products/fixtures/hemi-power.txt?raw";
import dstFixture from "../../../products/fixtures/kyoto-dst.json?raw";
import boulderFixture from "../../../products/fixtures/boulder-k-index-1m.json?raw";
import { ovationJson } from "../../../test/ovation-test-utils";
import { DisplayTimezoneProvider } from "../../DisplayTimezone/DisplayTimezoneContext";
import Home from "./Home";
import { PINNED_WEBCAMS_STORAGE_KEY } from "../../../data/webcam-storage";
import {
  LEGACY_COMPACT_VIEW_KEY,
  compactStorageKey,
} from "../../../products/compact";

const queryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const mockFetch = vi.fn();

beforeEach(() => {
  localStorage.clear();
  mockFetch.mockReset();
  mockFetch.mockImplementation((url: string) => {
    const u = typeof url === "string" ? url : "";
    if (u.includes("3-day-forecast.txt"))
      return Promise.resolve({ ok: true, text: async () => threeDayFixture });
    if (u.includes("noaa-planetary-k-index-forecast.json"))
      return Promise.resolve({ ok: true, text: async () => kpForecastFixture });
    if (u.includes("noaa-planetary-k-index.json"))
      return Promise.resolve({ ok: true, text: async () => kpObservedFixture });
    if (u.includes("ovation_aurora_latest.json"))
      return Promise.resolve({
        ok: true,
        text: async () => ovationJson([[0, 70, 3], [10, 65, 8]]),
      });
    if (u.includes("rtsw_wind_1m.json"))
      return Promise.resolve({ ok: true, text: async () => rtswWindFixture });
    if (u.includes("rtsw_mag_1m.json"))
      return Promise.resolve({ ok: true, text: async () => rtswMagFixture });
    if (u.includes("aurora-nowcast-hemi-power.txt"))
      return Promise.resolve({ ok: true, text: async () => hemiFixture });
    if (u.includes("kyoto-dst.json"))
      return Promise.resolve({ ok: true, text: async () => dstFixture });
    if (u.includes("boulder_k_index_1m.json"))
      return Promise.resolve({ ok: true, text: async () => boulderFixture });
    return Promise.resolve({ ok: true, text: async () => "" });
  });
  vi.stubGlobal("fetch", mockFetch);
  // One pinned cam so the Pinned webcams Dashboard panel renders.
  localStorage.setItem(
    PINNED_WEBCAMS_STORAGE_KEY,
    JSON.stringify({ v: 1, pins: ["irf-kiruna"] }),
  );
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

/** The Compact checkbox belonging to one panel's heading. */
const compactInPanel = (headingName: RegExp): HTMLElement => {
  const heading = screen.getByRole("heading", { name: headingName });
  const panelHead = heading.closest(".collapsible-panel__head")!;
  const toggle = panelHead.querySelector(
    'input[type="checkbox"]',
  ) as HTMLElement;
  expect(toggle).not.toBeNull();
  return toggle;
};

describe("Per-panel Compact (ticket 05)", () => {
  it("shows an icon-led Compact checkbox in the Solar wind, Magnetosphere and Pinned webcams headings only", async () => {
    renderHome();
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /^Solar wind$/ }),
      ).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /Magnetosphere/ }),
      ).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /Pinned webcams/ }),
      ).toBeInTheDocument(),
    );

    for (const heading of [/^Solar wind$/, /Magnetosphere/, /Pinned webcams/]) {
      const toggle = compactInPanel(heading);
      // Named "Compact" by its visible label, with the compress icon left of
      // the text and the checkbox on the right (adornment, never the toggle).
      const label = toggle.closest("label")!;
      expect(label.textContent).toContain("Compact");
      expect(label.querySelector("svg[aria-hidden='true']")).not.toBeNull();
      expect(toggle.closest("button")).toBeNull();
    }

    // No other Dashboard panel owns a Compact toggle.
    for (const heading of [
      /^Aurora now$/,
      /^Summary$/,
      /^Oval glow$/,
      /^Possible locations$/,
      /^Forecast$/,
    ]) {
      const el = screen.queryByRole("heading", { name: heading });
      if (!el) continue;
      const head = el.closest(".collapsible-panel__head")!;
      expect(
        head.querySelector('input[type="checkbox"]'),
      ).toBeNull();
    }
  });

  it("removes the legacy global Compact view header toggle", async () => {
    renderHome();
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /^Solar wind$/ }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("checkbox", { name: "Compact view" }),
    ).toBeNull();
  });

  it("densifies only its own panel and persists across visits default off", async () => {
    const user = userEvent.setup();
    renderHome();
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /^Solar wind$/ }),
      ).toBeInTheDocument(),
    );

    const solarToggle = screen
      .getByRole("heading", { name: /^Solar wind$/ })
      .closest(".collapsible-panel__head")!
      .querySelector('input[type="checkbox"]')! as HTMLInputElement;
    expect(solarToggle).not.toBeChecked();

    await user.click(solarToggle);
    expect(solarToggle).toBeChecked();
    expect(localStorage.getItem(compactStorageKey("solar-wind"))).toContain(
      '"compact":true',
    );
    // Only the Solar wind article densifies; Magnetosphere stays roomy.
    const solarArticle = screen
      .getByRole("heading", { name: /^Solar wind$/ })
      .closest("article")!;
    const magArticle = screen
      .getByRole("heading", { name: /Magnetosphere/ })
      .closest("article")!;
    expect(solarArticle.className).toMatch(/compact/);
    expect(magArticle.className).not.toMatch(/compact/);
  });

  it("persists Magnetosphere and Pinned webcams independently through their own headings", async () => {
    const user = userEvent.setup();
    renderHome();
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /Magnetosphere/ }),
      ).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /Pinned webcams/ }),
      ).toBeInTheDocument(),
    );

    const magToggle = screen
      .getByRole("heading", { name: /Magnetosphere/ })
      .closest(".collapsible-panel__head")!
      .querySelector('input[type="checkbox"]')! as HTMLInputElement;
    const pinnedToggle = screen
      .getByRole("heading", { name: /Pinned webcams/ })
      .closest(".collapsible-panel__head")!
      .querySelector('input[type="checkbox"]')! as HTMLInputElement;
    expect(magToggle).not.toBeChecked();
    expect(pinnedToggle).not.toBeChecked();

    await user.click(magToggle);
    expect(magToggle).toBeChecked();
    expect(localStorage.getItem(compactStorageKey("magnetosphere"))).toContain(
      '"compact":true',
    );
    // Solar wind stays roomy while Magnetosphere densifies.
    expect(
      screen
        .getByRole("heading", { name: /^Solar wind$/ })
        .closest("article")!.className,
    ).not.toMatch(/compact/);
    expect(
      screen
        .getByRole("heading", { name: /Magnetosphere/ })
        .closest("article")!.className,
    ).toMatch(/compact/);

    await user.click(pinnedToggle);
    expect(pinnedToggle).toBeChecked();
    expect(
      localStorage.getItem(compactStorageKey("pinned-webcams")),
    ).toContain('"compact":true');
    expect(
      screen
        .getByRole("heading", { name: /Pinned webcams/ })
        .closest("article")!.className,
    ).toMatch(/compact/);
  });

  it("migrates the legacy global on to all three panels on once", async () => {
    localStorage.setItem(LEGACY_COMPACT_VIEW_KEY, "on");
    renderHome();
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /^Solar wind$/ }),
      ).toBeInTheDocument(),
    );
    for (const panel of [
      "solar-wind",
      "magnetosphere",
      "pinned-webcams",
    ] as const) {
      expect(localStorage.getItem(compactStorageKey(panel))).toContain(
        '"compact":true',
      );
    }
    expect(localStorage.getItem(LEGACY_COMPACT_VIEW_KEY)).toBeNull();
  });
});

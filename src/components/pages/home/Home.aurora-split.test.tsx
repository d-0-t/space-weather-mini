// TDD RED for ticket 01: Aurora split into four Dashboard panels.
// Seams (approved): Dashboard composition + preserved content + anchors.
// External behavior only, via roles/headings.
process.env.TZ = "Europe/Stockholm";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
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
    if (
      typeof url === "string" &&
      url.includes("noaa-planetary-k-index-forecast.json")
    ) {
      return Promise.resolve({ ok: true, text: async () => kpForecastFixture });
    }
    if (typeof url === "string" && url.includes("noaa-planetary-k-index.json")) {
      return Promise.resolve({ ok: true, text: async () => kpObservedFixture });
    }
    if (typeof url === "string" && url.includes("ovation_aurora_latest.json")) {
      return Promise.resolve({
        ok: true,
        text: async () =>
          ovationJson([
            [0, 70, 3],
            [10, 65, 8],
          ]),
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

describe("Dashboard Aurora split (ticket 01)", () => {
  it("shows Aurora now, Summary, Oval glow intensity and Possible locations as separate h2 panels in default order", async () => {
    renderHome();
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /^Aurora now$/i }),
      ).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /^Summary$/i }),
      ).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /^Oval glow intensity$/i }),
      ).toBeInTheDocument(),
    );

    // The agreed 1-column default order (spec:53). Pinned webcams renders
    // nothing while nothing is pinned and Possible locations renders nothing
    // when no town qualifies (the honesty rule), so assert the subsequence
    // of the panels that are present.
    const expected = [
      "Aurora now",
      "Pinned webcams",
      "Summary",
      "Oval glow intensity",
      "Possible locations",
      "Solar wind",
      "Magnetosphere",
      "Forecast",
    ];
    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent?.trim())
      .filter((t) => t && expected.includes(t));
    const sorted = [...headings].sort(
      (a, b) => expected.indexOf(a!) - expected.indexOf(b!),
    );
    expect(headings).toEqual(sorted);
    // The split's own four keep their relative order.
    const auroraIdx = headings.findIndex((t) => t === "Aurora now");
    const summaryIdx = headings.findIndex((t) => t === "Summary");
    const ovalIdx = headings.findIndex((t) => t === "Oval glow intensity");
    expect(auroraIdx).toBeGreaterThanOrEqual(0);
    expect(summaryIdx).toBeGreaterThan(auroraIdx);
    expect(ovalIdx).toBeGreaterThan(summaryIdx);
    const possibleIdx = headings.findIndex((t) => t === "Possible locations");
    if (possibleIdx >= 0) {
      expect(possibleIdx).toBeGreaterThan(ovalIdx);
    }
  });

  it("keeps Summary content: selector, As-of line and Aurora guide link", async () => {
    renderHome();
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /^Summary$/i }),
      ).toBeInTheDocument(),
    );
    // Time-ahead selector is named Time via its label.
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: /^Time$/i }),
      ).toBeInTheDocument(),
    );
    expect(screen.getAllByText(/^As of /).length).toBeGreaterThanOrEqual(1);
    const guide = screen.getByRole("link", { name: /read aurora guide/i });
    expect(guide).toHaveAttribute("href", "/about/guide");
  });

  it("keeps Oval content: forecast time, glow table, color-blind toggle, canvas and legend", async () => {
    renderHome();
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /^Oval glow intensity$/i }),
      ).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(screen.getByText(/Forecast Time/i)).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(screen.getByText("Glow intensity table")).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("checkbox", { name: "Color-blind" }),
      ).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        screen.getAllByRole("img", { name: /oval glow/i }).length,
      ).toBeGreaterThan(0),
    );
    expect(
      document.querySelector(".oval-glow__legend"),
    ).not.toBeNull();
    // Full-size view travels with the Oval panel.
    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "Oval glow intensity, full size",
        }),
      ).toBeInTheDocument(),
    );
    // Moon caveat, reach sentence and Possible/Likely/Very likely ranking
    // ride their own suites: AuroraSummary.test.tsx (Moon, reach) and
    // ReachTowns.test.tsx plus products/reach-towns.test.ts (ranking).
  });

  it("keeps Aurora now content: Kp numbers, View distance anchor, attribution and Moon badge", async () => {
    renderHome();
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /^Aurora now$/i }),
      ).toBeInTheDocument(),
    );
    // Kp numbers (wait for the live Kp feed).
    await waitFor(() =>
      expect(document.querySelector(".kp-bar")).not.toBeNull(),
    );
    expect(document.querySelector(".aurora-now__current")).not.toBeNull();
    // View distance anchor travels with Aurora now (needs the Oval grid).
    await waitFor(() =>
      expect(document.getElementById("view-distance")).not.toBeNull(),
    );
    // Attribution to the NOAA aurora product page.
    const sources = screen.getAllByRole("link", { name: /^NOAA\/SWPC$/ });
    expect(
      sources.some(
        (link) =>
          link.getAttribute("href") ===
          "https://www.swpc.noaa.gov/products/aurora-30-minute-forecast",
      ),
    ).toBe(true);
    // Moon badge.
    expect(
      screen.getByText(/Current Moon phase:/i),
    ).toBeInTheDocument();
  });

  it("keeps the Oval and View distance anchors landable for Guide deep-links", async () => {
    renderHome();
    await waitFor(() =>
      expect(document.getElementById("oval-glow")).not.toBeNull(),
    );
    await waitFor(() =>
      expect(document.getElementById("view-distance")).not.toBeNull(),
    );
  });
});

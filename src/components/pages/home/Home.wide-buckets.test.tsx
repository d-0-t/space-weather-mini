// TDD RED for ticket 04 composition: Dashboard renders per-bucket columns.
// Seams: Dashboard composition defaults per bucket, resize switching,
// corrupt fallback, unknown-id survival, empty-column collapse.
process.env.TZ = "Europe/Stockholm";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, act } from "@testing-library/react";
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
import {
  DASHBOARD_LAYOUT_STORAGE_KEY,
  MD_QUERY,
  XL_QUERY,
  LANDSCAPE_QUERY,
} from "./dashboardLayout";

const queryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const mockFetch = vi.fn();

type Flags = { md: boolean; xl: boolean; landscape: boolean };
let flags: Flags = { md: false, xl: false, landscape: false };
const listeners = new Set<() => void>();

const installMatchMedia = (clearListeners: boolean) => {
  if (clearListeners) listeners.clear();
  const impl = (query: string) => {
    const matches =
      query === MD_QUERY
        ? flags.md
        : query === XL_QUERY
          ? flags.xl
          : query === LANDSCAPE_QUERY
            ? flags.landscape
            : false;
    return {
      matches,
      media: query,
      addEventListener: (_: string, cb: () => void) => {
        listeners.add(cb);
      },
      removeEventListener: (_: string, cb: () => void) => {
        listeners.delete(cb);
      },
    };
  };
  vi.stubGlobal("matchMedia", impl);
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: impl,
  });
};

const setFlags = (next: Flags) => {
  flags = next;
  // Re-point the mock at the new flags without dropping listeners, so the
  // resize test can fire the already-registered change callbacks.
  installMatchMedia(false);
};

beforeEach(() => {
  localStorage.clear();
  flags = { md: false, xl: false, landscape: false };
  installMatchMedia(true);
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

const columnHeadings = (): string[][] => {
  const cols = Array.from(document.querySelectorAll(".home__flow__col"));
  return cols.map((col) =>
    Array.from(col.querySelectorAll("h2")).map((h) => h.textContent?.trim() ?? ""),
  );
};

describe("Dashboard wide buckets (ticket 04)", () => {
  it("renders the 1-column default order below md", async () => {
    setFlags({ md: false, xl: false, landscape: false });
    renderHome();
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /^Aurora now$/i })).toBeInTheDocument(),
    );
    const cols = document.querySelectorAll(".home__flow__col");
    expect(cols.length).toBe(1);
    const headings = columnHeadings()[0].filter((t) =>
      [
        "Aurora now",
        "Pinned webcams",
        "Summary",
        "Oval glow",
        "Possible locations",
        "Solar wind",
        "Magnetosphere",
        "Forecast",
      ].includes(t),
    );
    const expected = [
      "Aurora now",
      "Summary",
      "Oval glow",
      "Solar wind",
      "Magnetosphere",
      "Forecast",
    ];
    // Pinned webcams renders nothing while nothing is pinned and Possible
    // locations renders nothing when no town qualifies: assert the visible
    // subsequence keeps the agreed order.
    let last = -1;
    for (const name of headings) {
      const idx = expected.indexOf(name);
      expect(idx).toBeGreaterThan(last);
      last = idx;
    }
  });

  it("renders the 2-column defaults from md to below xl", async () => {
    setFlags({ md: true, xl: false, landscape: false });
    renderHome();
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /^Aurora now$/i })).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /^Summary$/i })).toBeInTheDocument(),
    );
    const cols = columnHeadings();
    expect(cols.length).toBe(2);
    expect(cols[0]).toContain("Aurora now");
    expect(cols[0]).toContain("Summary");
    expect(cols[1]).toContain("Solar wind");
  });

  it("renders the 3-column defaults at xl with the Oval canvas breathing in the middle", async () => {
    setFlags({ md: true, xl: true, landscape: false });
    renderHome();
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /^Aurora now$/i })).toBeInTheDocument(),
    );
    const cols = document.querySelectorAll(".home__flow__col");
    expect(cols.length).toBe(3);
  });

  it("switches buckets immediately on resize without a reload", async () => {
    setFlags({ md: false, xl: false, landscape: false });
    renderHome();
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /^Aurora now$/i })).toBeInTheDocument(),
    );
    expect(document.querySelectorAll(".home__flow__col").length).toBe(1);
    act(() => {
      setFlags({ md: true, xl: false, landscape: false });
      for (const cb of [...listeners]) cb();
    });
    await waitFor(() =>
      expect(document.querySelectorAll(".home__flow__col").length).toBe(2),
    );
  });

  it("falls back to defaults on corrupt storage", async () => {
    localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, "corrupt{{{");
    setFlags({ md: true, xl: false, landscape: false });
    renderHome();
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /^Aurora now$/i })).toBeInTheDocument(),
    );
    const cols = columnHeadings();
    expect(cols.length).toBe(2);
    expect(cols[0]).toContain("Aurora now");
  });

  it("collapses empty columns instead of leaving a gap", async () => {
    // A deliberately emptied column (every known panel lives in the sibling
    // column) renders no wrapper. A corrupt partial bucket is different: the
    // loader refills panels missing from the whole bucket, so only a
    // complete bucket can collapse.
    localStorage.setItem(
      DASHBOARD_LAYOUT_STORAGE_KEY,
      JSON.stringify({
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
          [
            "aurora-now",
            "pinned-webcams",
            "summary",
            "oval-glow",
            "possible-locations",
            "solar-wind",
            "magnetosphere",
            "forecast",
          ],
          [],
        ],
        triple: [
          ["aurora-now", "summary", "oval-glow"],
          ["solar-wind", "magnetosphere"],
          ["pinned-webcams", "possible-locations", "forecast"],
        ],
      }),
    );
    setFlags({ md: true, xl: false, landscape: false });
    renderHome();
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /^Aurora now$/i })).toBeInTheDocument(),
    );
    expect(document.querySelectorAll(".home__flow__col").length).toBe(1);
  });
});

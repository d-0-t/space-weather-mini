import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { OVATION_URL } from "../../../../../products/ovation";
import OvalGlow, { ovalTileUrls, projectOvalCell } from "./OvalGlow";
import {
  COULDNT_LOAD_COPY,
  STALE_DATA_NOTICE,
} from "../offline/offline";

const queryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const mockFetch = vi.fn();

/** Minimal OVATION payload with every glow level in the north. */
function makeGrid(cells: Array<[number, number, number]>): string {
  return JSON.stringify({
    "Observation Time": "2026-09-04T13:20:00Z",
    "Forecast Time": "2026-09-04T14:33:00Z",
    "Data Format": "[Longitude, Latitude, Aurora]",
    coordinates: cells,
  });
}

const mixedGrid = () =>
  makeGrid([
    [0, 70, 0],
    [10, 70, 3],
    [20, 65, 8],
    [30, 60, 12],
    [40, 55, 20],
    [0, -70, 2],
    [10, -65, 9],
  ]);

beforeEach(() => {
  vi.stubEnv("VITE_STADIA_API_KEY", "test-key-123");
  mockFetch.mockReset();
  mockFetch.mockImplementation((url: string) => {
    const u = typeof url === "string" ? url : "";
    if (u.includes("ovation_aurora_latest.json"))
      return Promise.resolve({ ok: true, text: async () => mixedGrid() });
    return Promise.resolve({ ok: true, text: async () => "" });
  });
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const renderGlow = () =>
  render(
    <QueryClientProvider client={queryClient()}>
      <MemoryRouter>
        <OvalGlow />
      </MemoryRouter>
    </QueryClientProvider>,
  );

const canvases = async () =>
  await screen.findAllByRole("img", { name: /oval glow/i });

describe("OvalGlow", () => {
  it("fetches the OVATION grid once from the NOAA URL", async () => {
    renderGlow();
    await canvases();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe(OVATION_URL);
  });

  it("shows both hemispheres at once with no hemisphere toggle", async () => {
    renderGlow();
    const maps = await canvases();
    expect(maps).toHaveLength(2);
    expect(maps[0].getAttribute("aria-label")).toMatch(/northern hemisphere/i);
    expect(maps[1].getAttribute("aria-label")).toMatch(/southern hemisphere/i);
    expect(screen.getByText("Northern hemisphere")).toBeInTheDocument();
    expect(screen.getByText("Southern hemisphere")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^North$/ }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /^South$/ }),
    ).toBeNull();
  });

  it("names each canvas with its glow levels and never a number range", async () => {
    renderGlow();
    const maps = await canvases();
    for (const canvas of maps) {
      const name = canvas.getAttribute("aria-label") ?? "";
      for (const level of ["faint", "moderate", "strong", "intense"]) {
        expect(name).toContain(level);
      }
      expect(name).not.toMatch(/\d+\s*(to|–|-)\s*\d+/);
      expect(name).not.toMatch(/16\s*\+/);
    }
  });

  it("heads the section as local glow intensity, not Kp or storm", async () => {
    renderGlow();
    await canvases();
    const heading = screen.getByRole("heading", { level: 3, name: /oval glow intensity/i });
    expect(heading).toBeInTheDocument();
    expect(screen.queryByText(/Kp1/i)).toBeNull();
  });

  it("shows Forecast Time, lead and age on one line with no repeated date", async () => {
    renderGlow();
    await canvases();
    expect(
      screen.getByText(/Forecast Time Sep 4 14:33 UTC – 30–90 min lead • Updated/),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Sep 4 14:33 UTC/)).toHaveLength(1);
    expect(screen.queryByText(/Observation Time/)).toBeNull();
  });

  it("legends every glow level with its color and a gray None, with no numbers", async () => {
    const { container } = renderGlow();
    await canvases();
    const legend = container.querySelector(".oval-glow__legend") as HTMLElement;
    expect(legend).not.toBeNull();
    expect(legend.textContent).toMatch(/None/);
    for (const level of ["Faint", "Moderate", "Strong", "Intense"]) {
      expect(legend.textContent).toContain(level);
    }
    expect(legend.textContent).not.toMatch(/\d+\s*–\s*\d+/);
    expect(legend.textContent).not.toMatch(/16\+/);
    for (const cls of ["kp34", "kp45", "kp67", "kp89"]) {
      expect(legend.querySelector(`.${cls}`)).not.toBeNull();
    }
    expect(
      legend.querySelector(".oval-glow__swatch--none"),
    ).not.toBeNull();
    expect(container.querySelector(".oval-glow__hatch")).toBeNull();
  });

  it("pairs the canvases with a hidden table carrying the same levels", async () => {
    const { container } = renderGlow();
    await canvases();
    const table = container.querySelector("table.oval-glow__table") as HTMLTableElement;
    expect(table).not.toBeNull();
    const text = table.textContent ?? "";
    for (const level of ["None", "Faint", "Moderate", "Strong", "Intense"]) {
      expect(text).toContain(level);
    }
  });

  it("keys its Stadia tiles and serves them over the real map", async () => {
    renderGlow();
    await canvases();
    const tiles = document.querySelectorAll(".oval-glow__tiles img");
    expect(tiles.length).toBe(4);
    for (const tile of tiles) {
      const src = tile.getAttribute("src") ?? "";
      expect(src).toContain("tiles.stadiamaps.com/tiles/alidade_smooth_dark/1/");
      expect(src).toContain("api_key=test-key-123");
    }
    expect(screen.getByText(/Stadia Maps/)).toBeInTheDocument();
    expect(screen.getByText(/OpenStreetMap/)).toBeInTheDocument();
    expect(mockFetch.mock.calls.flat().join(" ")).not.toContain("nominatim");
  });

  it("omits the tile layer when no Stadia key is configured", async () => {
    vi.stubEnv("VITE_STADIA_API_KEY", "");
    renderGlow();
    await canvases();
    expect(document.querySelector(".oval-glow__tiles")).toBeNull();
    expect(document.querySelector("canvas.oval-glow__canvas")).not.toBeNull();
  });

  it("projects every grid column and row with no float gaps", () => {
    // Regression: Math.floor on float division dropped 20 columns
    // (lon 5, 16, 27, …) leaving true 1px gaps that scaling up widens.
    const xs = new Set<number>();
    for (let longitude = 0; longitude < 360; longitude += 1) {
      const point = projectOvalCell(longitude, 70, "north");
      expect(point).not.toBeNull();
      xs.add(point!.x);
      expect(projectOvalCell(longitude, 70, "south")).toBeNull();
    }
    expect(xs.size).toBe(360);
    expect(Math.min(...xs)).toBe(0);
    expect(Math.max(...xs)).toBe(359);
    const ys = new Set<number>();
    for (let latitude = 0; latitude <= 90; latitude += 1) {
      const point = projectOvalCell(0, latitude, "north");
      expect(point).not.toBeNull();
      ys.add(point!.y);
    }
    expect(ys.size).toBe(91);
    expect(projectOvalCell(5, 70, "north")).toEqual({ x: 185, y: 20 });
    expect(projectOvalCell(0, -70, "south")).toEqual({ x: 180, y: 70 });
  });

  it("serves its keyed tiles from the stadia CacheFirst route in vite.config", async () => {
    const { PWA_OPTIONS } = await import("../../../../../../vite.config");
    const stadia = PWA_OPTIONS.workbox.runtimeCaching.find((entry) =>
      String(entry.urlPattern).includes("stadiamaps"),
    );
    expect(stadia?.handler).toBe("CacheFirst");
    const pattern = stadia?.urlPattern as RegExp;
    expect(pattern).toBeInstanceOf(RegExp);
    for (const hemisphere of ["north", "south"] as const) {
      for (const url of ovalTileUrls(hemisphere, "test-key-123")) {
        expect(url).toContain("tiles.stadiamaps.com/tiles/alidade_smooth_dark/1/");
        expect(pattern.test(url)).toBe(true);
      }
    }
  });

  it("keeps the visibility note behind an info icon next to the heading", async () => {
    const user = userEvent.setup();
    renderGlow();
    await canvases();
    const note = () =>
      screen.queryByText(/Cloud coverage, moon phase and light pollution affect visibility/i);
    expect(note()).not.toBeVisible();
    const info = screen.getByRole("button", { name: /about this map/i });
    expect(info.classList.contains("btn--icon")).toBe(true);
    await user.click(info);
    expect(note()).toBeVisible();
  });

  it("never claims the glow is a photo", async () => {
    renderGlow();
    await canvases();
    expect(screen.queryByText(/not a photo/i)).toBeNull();
  });

  it("shows the stale notice with saved data when the browser goes offline", async () => {
    const { container } = renderGlow();
    await canvases();
    const { act } = await import("@testing-library/react");
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByText(STALE_DATA_NOTICE)).toBeInTheDocument();
    expect(container.querySelectorAll("canvas")).toHaveLength(2);
  });

  it("shows the plain never-cached error when the OVATION feed never loaded", async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({ ok: false, status: 500, text: async () => "" }),
    );
    renderGlow();
    await waitFor(() =>
      expect(screen.getByText(COULDNT_LOAD_COPY)).toBeInTheDocument(),
    );
  });
});

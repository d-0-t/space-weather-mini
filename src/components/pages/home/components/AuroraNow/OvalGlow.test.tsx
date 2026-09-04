import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { OVATION_URL } from "../../../../../products/ovation";
import { WORLD_LAND_URL } from "../../../../../products/world-land";
import OvalGlow, {
  isBoundaryRow,
  ovalCellPoint,
  ovalLegendGradientCss,
  rampColor,
  projectRing,
  blurGlowFrame,
  OVAL_CANVAS_WIDTH,
  OVAL_LAND_FILL,
} from "./OvalGlow";
import { COULDNT_LOAD_COPY, STALE_DATA_NOTICE } from "../offline/offline";

const queryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const mockFetch = vi.fn();

/** Minimal OVATION payload with every glow level plus boundary-row noise. */
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
    // Boundary rows (equator ring, pole points) – never painted or counted.
    [0, 0, 5],
    [5, -1, 1],
    [10, 90, 2],
    [15, -90, 4],
  ]);

/** Minimal Natural Earth land fixture: one two-point-enough polygon ring. */
const landFixture = () =>
  JSON.stringify({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [10, 0],
              [10, 10],
              [0, 10],
              [0, 0],
            ],
          ],
        },
      },
    ],
  });

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockImplementation((url: string) => {
    const u = typeof url === "string" ? url : "";
    if (u.includes("ovation_aurora_latest.json"))
      return Promise.resolve({ ok: true, text: async () => mixedGrid() });
    if (u.includes(WORLD_LAND_URL))
      return Promise.resolve({ ok: true, text: async () => landFixture() });
    return Promise.resolve({ ok: true, text: async () => "" });
  });
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
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
  it("fetches the OVATION grid from the NOAA URL and the land asset once", async () => {
    renderGlow();
    await canvases();
    const ovationCalls = mockFetch.mock.calls.filter(
      (call) => call[0] === OVATION_URL,
    );
    expect(ovationCalls).toHaveLength(1);
    const landCalls = mockFetch.mock.calls.filter(
      (call) => call[0] === WORLD_LAND_URL,
    );
    expect(landCalls).toHaveLength(1);
  });

  it("paints one pole-to-pole world map with no hemisphere toggle", async () => {
    renderGlow();
    const maps = await canvases();
    expect(maps).toHaveLength(1);
    expect(maps[0].getAttribute("aria-label")).toMatch(
      /north pole to south pole/i,
    );
    expect(screen.queryByText("Northern hemisphere")).toBeNull();
    expect(screen.queryByText("Southern hemisphere")).toBeNull();
    expect(
      screen.queryByText("North pole (top) to south pole (bottom)"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^North$/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^South$/ })).toBeNull();
  });

  it("names the canvas with its glow levels and never a number range", async () => {
    renderGlow();
    const maps = await canvases();
    const name = maps[0].getAttribute("aria-label") ?? "";
    for (const level of ["faint", "moderate", "strong", "intense"]) {
      expect(name).toContain(level);
    }
    expect(name).toMatch(/transparent means no glow forecast/i);
    expect(name).not.toMatch(/\d+\s*(to|–|-)\s*\d+/);
    expect(name).not.toMatch(/16\s*\+/);
  });

  it("heads the section as local glow intensity, not Kp or storm", async () => {
    renderGlow();
    await canvases();
    const heading = screen.getByRole("heading", {
      level: 3,
      name: /oval glow intensity/i,
    });
    expect(heading).toBeInTheDocument();
    expect(screen.queryByText(/Kp1/i)).toBeNull();
  });

  it("shows Forecast Time, lead and age on one line with no repeated date", async () => {
    renderGlow();
    await canvases();
    expect(
      screen.getByText(
        /Forecast Time Sep 4 14:33 UTC – 30–90 min lead • Updated/,
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Sep 4 14:33 UTC/)).toHaveLength(1);
    expect(screen.queryByText(/Observation Time/)).toBeNull();
  });

  it("legends the glow as a continuous gradient with level words, no numbers", async () => {
    const { container } = renderGlow();
    await canvases();
    const legend = container.querySelector(".oval-glow__legend") as HTMLElement;
    expect(legend).not.toBeNull();
    const bar = legend.querySelector(".oval-glow__legend__bar") as HTMLElement;
    expect(bar).not.toBeNull();
    expect(bar.getAttribute("style")).toContain("linear-gradient");
    // jsdom serializes the gradient with spaced rgba() channels.
    expect(bar.getAttribute("style")).toContain("rgba(0, 90, 55, 0.42)");
    const labels = [
      ...legend.querySelectorAll(".oval-glow__legend__label"),
    ].map((el) => el.textContent);
    expect(labels).toEqual(["Faint", "Moderate", "Strong", "Intense"]);
    expect(legend.textContent).not.toMatch(/\d+\s*–\s*\d+/);
    expect(legend.textContent).not.toMatch(/16\+/);
    expect(legend.querySelector(".oval-glow__swatch")).toBeNull();
    expect(container.querySelector(".oval-glow__hatch")).toBeNull();
    // Legend and canvas share the same ramp source.
    expect(ovalLegendGradientCss()).toContain("rgba(0,90,55,0.42) 15%");
  });

  it("pairs the map with a hidden table carrying the same levels", async () => {
    const { container } = renderGlow();
    await canvases();
    const table = container.querySelector(
      "table.oval-glow__table",
    ) as HTMLTableElement;
    expect(table).not.toBeNull();
    const text = table.textContent ?? "";
    for (const level of ["None", "Faint", "Moderate", "Strong", "Intense"]) {
      expect(text).toContain(level);
    }
  });

  it("counts cells per hemisphere with the boundary rows excluded", async () => {
    const { container } = renderGlow();
    await canvases();
    const table = container.querySelector(
      "table.oval-glow__table",
    ) as HTMLTableElement;
    const rowCells = (label: string): string[] => {
      const row = [...table.querySelectorAll("tbody tr")].find(
        (tr) => tr.querySelector("th")?.textContent === label,
      );
      return [...(row?.querySelectorAll("td") ?? [])].map(
        (td) => td.textContent ?? "",
      );
    };
    // Boundary cells (lat 0, -1, 90, -90) never reach the counts.
    expect(rowCells("None")).toEqual(["1", "0"]);
    expect(rowCells("Faint")).toEqual(["1", "1"]);
    expect(rowCells("Moderate")).toEqual(["1", "1"]);
    expect(rowCells("Strong")).toEqual(["1", "0"]);
    expect(rowCells("Intense")).toEqual(["1", "0"]);
  });

  it("paints the land basemap on a decorative canvas beneath the glow", async () => {
    renderGlow();
    await canvases();
    const land = document.querySelector(
      ".oval-glow__land",
    ) as HTMLCanvasElement | null;
    expect(land).not.toBeNull();
    expect(land?.getAttribute("width")).toBe(String(OVAL_CANVAS_WIDTH));
    expect(land?.getAttribute("aria-hidden")).toBe("true");
    // Presentation only: never exposed as an image to assistive tech.
    expect(land?.getAttribute("role")).toBeNull();
    // No third-party tile servers anymore - the land asset is bundled.
    expect(document.querySelectorAll("img.oval-glow__tile")).toHaveLength(0);
    expect(mockFetch.mock.calls.flat().join(" ")).not.toContain("gibs");
  });

  it("projects every grid column and row onto its own pixel", () => {
    const xs = new Set<number>();
    for (let longitude = 0; longitude < OVAL_CANVAS_WIDTH; longitude += 1) {
      xs.add(ovalCellPoint(longitude, 70).x);
    }
    expect(xs.size).toBe(360);
    expect(Math.min(...xs)).toBe(0);
    expect(Math.max(...xs)).toBe(359);
    const ys = new Set<number>();
    for (let latitude = -89; latitude <= 89; latitude += 1) {
      ys.add(ovalCellPoint(0, latitude).y);
    }
    expect(ys.size).toBe(179);
    // x=0 is the date line (tile edge), y=0 the north pole.
    expect(ovalCellPoint(5, 70)).toEqual({ x: 185, y: 20 });
    expect(ovalCellPoint(0, -70)).toEqual({ x: 180, y: 160 });
    expect(ovalCellPoint(180, 0)).toEqual({ x: 0, y: 90 });
  });

  it("clips only the OVATION grid-edge rows", () => {
    for (const latitude of [0, -1, 90, -90]) {
      expect(isBoundaryRow(latitude)).toBe(true);
    }
    for (const latitude of [1, -2, 2, 89, -89, 70, -70]) {
      expect(isBoundaryRow(latitude)).toBe(false);
    }
  });

  it("maps aurora values through an opaque-enough continuous ramp", () => {
    // Regression: alpha stops are stored pre-scaled to bytes – rounding
    // 0-1 floats straight into the Uint8 LUT painted the whole ramp at
    // effectively zero alpha.
    expect(rampColor(0)).toEqual([0, 0, 0, 0]);
    const [, , , faintAlpha] = rampColor(1);
    expect(faintAlpha).toBeGreaterThan(0);
    const [, , , strongAlpha] = rampColor(14);
    expect(strongAlpha).toBeGreaterThan(faintAlpha);
    // Hue boundaries follow intensity: the whole ordinary range (1-15)
    // stays green like NOAA's own render, yellow starts at 16 (storm
    // onset), red and magenta are reserved for extremes.
    const [greenR, greenG] = rampColor(8);
    expect(greenG).toBeGreaterThan(greenR);
    const [topGreenR, topGreenG] = rampColor(14);
    expect(topGreenG).toBeGreaterThan(topGreenR);
    const [stormOnsetR, stormOnsetG, stormOnsetB] = rampColor(16);
    expect(stormOnsetR).toBeGreaterThan(stormOnsetG);
    expect(stormOnsetB).toBeLessThan(stormOnsetG);
    const [redR, redG, redB] = rampColor(45);
    expect(redR).toBeGreaterThan(redG);
    expect(redB).toBeLessThan(redG);
    const [intenseR, intenseG, intenseB] = rampColor(70);
    expect(intenseR).toBeGreaterThan(intenseG);
    expect(intenseB).toBeGreaterThan(intenseG);
    const [stormR, stormG, stormB, stormAlpha] = rampColor(100);
    expect(stormAlpha).toBe(255);
    expect(stormG).toBeLessThan(stormR);
    expect(stormG).toBeLessThan(stormB);
    // The ramp caps at value 100 - rarer extremes clamp to the magenta end
    // instead of stretching the scale.
    expect(rampColor(200)).toEqual(rampColor(100));
    // Every byte stays in range across the full grid value range.
    for (let value = 0; value <= 255; value += 1) {
      for (const channel of rampColor(value)) {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(255);
      }
    }
  });

  it("keeps no gibs route and precaches the land asset in vite.config", async () => {
    const { PWA_OPTIONS } = await import("../../../../../../vite.config");
    const routes = PWA_OPTIONS.workbox.runtimeCaching.map((entry) =>
      String(entry.urlPattern),
    );
    expect(routes.join(" ")).not.toContain("gibs");
    expect(routes.find((route) => route.includes("swpc"))).toBeTruthy();
    expect(routes.find((route) => route.includes("ovation"))).toBeTruthy();
    expect(PWA_OPTIONS.workbox.globPatterns.join(",")).toContain("geojson");
  });

  it("keeps the land fill readable against the black ocean", () => {
    // #444444 on black per user pick; the previous deep-indigo fill
    // measured 1.36:1 and read as a void.
    expect(OVAL_LAND_FILL).toBe("#444444");
    const channel = parseInt(OVAL_LAND_FILL.slice(1, 3), 16) / 255;
    const linear =
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    const luminance = 0.2126 * linear + 0.7152 * linear + 0.0722 * linear;
    expect((luminance + 0.05) / 0.05).toBeGreaterThanOrEqual(3);
  });

  it("unwraps antimeridian-wrapping rings so fills cannot self-intersect", () => {
    // A ring crossing the dateline keeps running past x=360 instead of
    // folding back to x=0 - the fold painted full-width glitch lines (the
    // -17 line) and cancelled the Antarctic bottom edge.
    const points = projectRing([
      [170, -17],
      [178, -17],
      [-178, -17],
      [-172, -17],
    ]);
    for (let i = 1; i < points.length; i += 1) {
      expect(Math.abs(points[i][0] - points[i - 1][0])).toBeLessThan(180);
    }
    // Antarctica's -90 closure: lon 180 and lon -180 project to the same
    // unwrapped longitude, so the bottom edge stays at the map bottom.
    const antarctica = projectRing([
      [-180, -78],
      [0, -70],
      [180, -78],
      [180, -90],
      [-180, -90],
    ]);
    const bottom = antarctica.filter(([, y]) => y >= 180);
    expect(bottom).toHaveLength(2);
  });

  it("softens grid speckle without touching uniform regions", () => {
    const w = 5;
    const frame = new Uint8ClampedArray(w * w * 4);
    const paint = (x: number, y: number, a: number) => {
      const o = (y * w + x) * 4;
      frame[o] = 0;
      frame[o + 1] = 180;
      frame[o + 2] = 90;
      frame[o + 3] = a;
    };
    // A uniform 3x3 block survives the blur untouched; a lone speckle
    // spreads into its neighbors.
    for (let y = 1; y <= 3; y += 1) {
      for (let x = 1; x <= 3; x += 1) paint(x, y, 255);
    }
    paint(0, 0, 255);
    const blurred = blurGlowFrame(frame, w, w);
    const alpha = (x: number, y: number) => blurred[(y * w + x) * 4 + 3];
    expect(alpha(2, 2)).toBe(255);
    expect(alpha(0, 0)).toBeLessThan(255);
    expect(alpha(1, 0)).toBeGreaterThan(0);
    for (let i = 3; i < blurred.length; i += 4) {
      expect(blurred[i]).toBeLessThanOrEqual(255);
    }
  });

  it("keeps the visibility note behind an info icon next to the heading", async () => {
    const user = userEvent.setup();
    renderGlow();
    await canvases();
    const note = () =>
      screen.queryByText(
        /Cloud coverage, moon phase and light pollution affect visibility/i,
      );
    expect(note()).not.toBeVisible();
    const info = screen.getByRole("button", { name: /about this map/i });
    expect(info.classList.contains("btn--icon")).toBe(true);
    await user.click(info);
    expect(note()).toBeVisible();
    expect(
      screen.getByText(
        /dim green spreading beyond the bright ring is diffuse glow/i,
      ),
    ).toBeInTheDocument();
  });

  it("never claims the glow is a photo", async () => {
    renderGlow();
    await canvases();
    expect(screen.queryByText(/not a photo/i)).toBeNull();
  });

  it("shows the stale notice with saved data when the browser goes offline", async () => {
    const { container } = renderGlow();
    await canvases();
    const { act: reactAct } = await import("@testing-library/react");
    reactAct(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByText(STALE_DATA_NOTICE)).toBeInTheDocument();
    // Land basemap canvas + glow canvas.
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

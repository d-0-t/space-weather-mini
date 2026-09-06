// The freshness line shows the device-local time beside the UTC one, so the
// suite pins one zone (Sweden, UTC+1/+2) to keep the expectation
// deterministic (same pin as the conditions suite).
process.env.TZ = "Europe/Stockholm";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

import {
  OVATION_URL,
  isBoundaryRow,
  parseOvation,
} from "../../../../../products/ovation";
import { WORLD_LAND_URL } from "../../../../../products/world-land";
import OvalGlow, {
  ovalCellPoint,
  ovalCanvasLabel,
  ovalLegendGradientCss,
  ovalLegendMarkerPos,
  maxGlowValue,
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
  localStorage.clear();
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

describe("Color-blind (ticket 06)", () => {
  it("ramps Aurora values through pure greyscale: transparent white up, storm cores to black", () => {
    // Value 0 stays fully transparent; the ramp is white at every anchor
    // through the ordinary range.
    expect(rampColor(0, "color-blind")).toEqual([255, 255, 255, 0]);
    // Brightness is the primary cue in this mode: the alpha byte climbs
    // monotonically across the whole scale.
    let previousAlpha = 0;
    for (let value = 1; value <= 100; value += 1) {
      const [, , , alpha] = rampColor(value, "color-blind");
      expect(alpha).toBeGreaterThanOrEqual(previousAlpha);
      previousAlpha = alpha;
    }
    expect(rampColor(1, "color-blind")[3]).toBeGreaterThan(0);
    expect(rampColor(16, "color-blind")[3]).toBeGreaterThan(
      rampColor(8, "color-blind")[3],
    );
    // Re-anchored 2026-09-06 with the default ramp, alphas softened the
    // same day: the faint 0.1 start keeps the quiet range dim while the
    // climb continues through ordinary-night cores (which reach the low
    // 30s), saturating where the default hits full-saturation red.
    expect(rampColor(45, "color-blind")[3]).toBeGreaterThan(
      rampColor(16, "color-blind")[3],
    );
    expect(rampColor(75, "color-blind")[3]).toBe(255);
    expect(rampColor(60, "color-blind")[3]).toBeLessThan(255);
    // No hue anywhere: every painted channel is greyscale (r = g = b) –
    // white through the ordinary range, sweeping to black over the
    // extreme tail (75-100) so the rarest cores read as a dark eye.
    for (let value = 1; value <= 100; value += 1) {
      const [r, g, b] = rampColor(value, "color-blind");
      expect(r).toBe(g);
      expect(g).toBe(b);
      if (value <= 75) {
        expect(r).toBe(255);
      }
    }
    expect(rampColor(100, "color-blind")).toEqual([0, 0, 0, 255]);
    // Extremes clamp to the opaque black end like the default ramp clamps
    // to magenta.
    expect(rampColor(200, "color-blind")).toEqual(
      rampColor(100, "color-blind"),
    );
    // Every byte stays in range across the full grid value range.
    for (let value = 0; value <= 255; value += 1) {
      for (const channel of rampColor(value, "color-blind")) {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(255);
      }
    }
  });

  it("keeps the default ramp when no mode is passed", () => {
    expect(rampColor(8)).toEqual(rampColor(8, "default"));
    expect(rampColor(8, "default")).not.toEqual(rampColor(8, "color-blind"));
    // The default stays the green-dominant NOAA-like ramp (pinned above).
    const [r, g] = rampColor(8, "default");
    expect(g).toBeGreaterThan(r);
  });

  it("swaps the legend bar to the greyscale gradient in color-blind mode", () => {
    const css = ovalLegendGradientCss("color-blind");
    expect(css).toContain("rgba(255,255,255,0) 0%");
    expect(css).toContain("rgba(255,255,255,1) 92%");
    expect(css).toContain("rgba(0,0,0,1) 100%");
    expect(ovalLegendGradientCss()).toBe(ovalLegendGradientCss("default"));
    expect(ovalLegendGradientCss("default")).not.toBe(css);
  });

  it("notes the brightness ramp in the canvas name when the mode is on", () => {
    const on = ovalCanvasLabel("color-blind");
    expect(on).toMatch(/color-blind on/i);
    expect(on).toMatch(/brightness/i);
    expect(on).toMatch(/invert to black/i);
    for (const level of ["faint", "moderate", "strong", "intense"]) {
      expect(on.toLowerCase()).toContain(level);
    }
    expect(ovalCanvasLabel()).toBe(ovalCanvasLabel("default"));
    expect(ovalCanvasLabel("default")).not.toMatch(/color-blind/i);
  });
});

describe("Legend max marker", () => {
  it("positions the tick through the same stops the bar gradient paints", () => {
    // Stop anchors land on their own pos; in-between values interpolate.
    expect(ovalLegendMarkerPos(0)).toBe(0);
    expect(ovalLegendMarkerPos(3)).toBe(15);
    expect(ovalLegendMarkerPos(8)).toBe(32);
    expect(ovalLegendMarkerPos(15)).toBe(48);
    expect(ovalLegendMarkerPos(20)).toBe(52.67);
    expect(ovalLegendMarkerPos(30)).toBe(62);
    expect(ovalLegendMarkerPos(45)).toBe(72);
    expect(ovalLegendMarkerPos(75)).toBe(92);
    expect(ovalLegendMarkerPos(100)).toBe(100);
    // Values past the clamp sit at the bar end like the paint does.
    expect(ovalLegendMarkerPos(200)).toBe(100);
    // Color-blind mode walks its own stops (same layout today).
    expect(ovalLegendMarkerPos(60, "color-blind")).toBe(82);
    expect(ovalLegendMarkerPos(75, "color-blind")).toBe(92);
    expect(ovalLegendMarkerPos(100, "color-blind")).toBe(100);
  });

  it("reads the max from the painted set only: boundary rows and sub-1 cells excluded", () => {
    // The mixed grid's painted max is 20; boundary-row noise (5 at lat 0)
    // and transparent cells never reach it.
    expect(maxGlowValue(parseOvation(mixedGrid()))).toBe(20);
    expect(maxGlowValue(parseOvation(makeGrid([[10, 70, 0]])))).toBeNull();
    // Boundary rows alone paint nothing, so there is no max either.
    expect(
      maxGlowValue(parseOvation(makeGrid([[0, 0, 5], [10, 90, 3]]))),
    ).toBeNull();
  });

  it("pins a legend marker at tonight's max on the map", async () => {
    const { container } = renderGlow();
    await canvases();
    const marker = container.querySelector(
      ".oval-glow__legend__marker",
    ) as HTMLElement | null;
    expect(marker).not.toBeNull();
    // Painted max is 20: between the 15 (pos 48%) and 30 (pos 62%) stops.
    expect(marker?.getAttribute("style")).toContain("left: 52.67%");
    // Native hover affordance: the tooltip names what the line means.
    expect(marker?.getAttribute("title")).toBe("Current maximum");
  });

  it("hides the legend marker when no cell paints", async () => {
    mockFetch.mockImplementation((url: string) => {
      const u = typeof url === "string" ? url : "";
      if (u.includes("ovation_aurora_latest.json"))
        return Promise.resolve({
          ok: true,
          text: async () => makeGrid([[10, 70, 0]]),
        });
      if (u.includes(WORLD_LAND_URL))
        return Promise.resolve({ ok: true, text: async () => landFixture() });
      return Promise.resolve({ ok: true, text: async () => "" });
    });
    const { container } = renderGlow();
    await canvases();
    expect(
      container.querySelector(".oval-glow__legend__marker"),
    ).toBeNull();
  });
});

describe("OvalGlow", () => {
  it("offers the glow table disclosure and the Color-blind checkbox on one row below the lead", async () => {
    const { container } = renderGlow();
    await canvases();
    const fresh = container.querySelector(".oval-glow__fresh");
    const controls = container.querySelector(
      ".oval-glow__controls",
    ) as HTMLElement;
    const map = container.querySelector(".oval-glow__cap");
    // Placement: the row sits between the 30-90 min lead and the map.
    expect(fresh?.nextElementSibling).toBe(controls);
    expect(controls.nextElementSibling).toBe(map);
    // One line: the disclosure first, the checkbox pill last.
    const disclosure = controls.querySelector(
      "details.oval-glow__table-disclosure",
    );
    expect(disclosure).not.toBeNull();
    expect(controls.firstElementChild).toBe(disclosure);
    const checkbox = screen.getByRole("checkbox", { name: "Color-blind" });
    expect(controls.lastElementChild).toBe(checkbox.closest("label"));
    // Off by default: unchecked, the hue gradient, no brightness note.
    expect(checkbox).not.toBeChecked();
    const bar = container.querySelector(
      ".oval-glow__legend__bar",
    ) as HTMLElement;
    expect(bar.getAttribute("style")).toContain("rgba(0, 90, 55, 0.25)");
    expect((await canvases())[0].getAttribute("aria-label")).not.toMatch(
      /color-blind/i,
    );
    // The legend holds no toggle anymore.
    expect(
      container.querySelector(".oval-glow__legend .oval-glow__cb-toggle"),
    ).toBeNull();
  });

  it("toggles the checkbox: persists the versioned key and swaps to the brightness ramp", async () => {
    const user = userEvent.setup();
    const { container } = renderGlow();
    await canvases();
    const checkbox = screen.getByRole("checkbox", { name: "Color-blind" });
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(localStorage.getItem("sw:oval:cb:v1")).toBe(
      JSON.stringify({ colorBlind: true, v: 1 }),
    );
    const bar = container.querySelector(
      ".oval-glow__legend__bar",
    ) as HTMLElement;
    // jsdom's cssstyle collapses alpha-1 rgba() to rgb().
    expect(bar.getAttribute("style")).toContain("rgb(255, 255, 255) 92%");
    expect(bar.getAttribute("style")).toContain("rgb(0, 0, 0) 100%");
    expect((await canvases())[0].getAttribute("aria-label")).toMatch(
      /color-blind on/i,
    );
    // Unchecking turns the mode off and persists the off state.
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
    expect(localStorage.getItem("sw:oval:cb:v1")).toBe(
      JSON.stringify({ colorBlind: false, v: 1 }),
    );
  });

  it("restores the persisted Color-blind on mount", async () => {
    localStorage.setItem(
      "sw:oval:cb:v1",
      JSON.stringify({ colorBlind: true, v: 1 }),
    );
    const { container } = renderGlow();
    await canvases();
    expect(screen.getByRole("checkbox", { name: "Color-blind" })).toBeChecked();
    const bar = container.querySelector(
      ".oval-glow__legend__bar",
    ) as HTMLElement;
    // jsdom's cssstyle collapses alpha-1 rgba() to rgb().
    expect(bar.getAttribute("style")).toContain("rgb(255, 255, 255) 92%");
    expect(bar.getAttribute("style")).toContain("rgb(0, 0, 0) 100%");
    expect((await canvases())[0].getAttribute("aria-label")).toMatch(
      /color-blind on/i,
    );
  });

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
      screen.queryByText("World map with the overlayed aurora rings."),
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

  it("shows Forecast Time in UTC and your time on one line, with the age only on the view-distance line", async () => {
    renderGlow();
    await canvases();
    // 14:33 UTC is 16:33 Stockholm time, same day - the local parenthetical
    // answers "is this time wrong?" without a second freshness line.
    expect(
      screen.getByText(
        /Forecast Time Sep 4 14:33 UTC \(16:33 your time\) – 30–90 min lead\./,
      ),
    ).toBeInTheDocument();
    // The `Updated {age}` lives once, on the View distance As-of line –
    // never twice on the same panel (user review 2026-09-06).
    expect(screen.queryByText(/Updated/)).toBeNull();
    expect(screen.queryByText(/Observation Time/)).toBeNull();
  });

  it("offers the glow counts as an on-demand table below the lead, above the map", async () => {
    const user = userEvent.setup();
    const { container } = renderGlow();
    await canvases();
    const disclosure = container.querySelector(
      "details.oval-glow__table-disclosure",
    ) as HTMLDetailsElement;
    expect(disclosure).not.toBeNull();
    // Placement: right below the 30-90 min lead, above the visual map (the
    // disclosure shares one row with the Color-blind checkbox).
    const fresh = container.querySelector(".oval-glow__fresh");
    const controls = container.querySelector(".oval-glow__controls");
    const map = container.querySelector(".oval-glow__cap");
    expect(fresh?.nextElementSibling).toBe(controls);
    expect(controls?.contains(disclosure)).toBe(true);
    expect(controls?.nextElementSibling).toBe(map);
    // Hidden by default, opened through the ReadMore summary.
    expect(disclosure.open).toBe(false);
    const summary = screen.getByText("Glow intensity table");
    expect(summary.closest("summary")?.querySelector("svg")).not.toBeNull();
    const table = disclosure.querySelector(
      "table.oval-glow__table",
    ) as HTMLTableElement;
    // A visible alternative for everyone - never sr-only.
    expect(table).not.toBeNull();
    expect(table.className).not.toContain("sr-only");
    expect(table).not.toBeVisible();
    await user.click(summary);
    expect(disclosure.open).toBe(true);
    expect(table).toBeVisible();
  });

  it("counts cells per hemisphere in the on-demand table, boundary rows excluded", async () => {
    const user = userEvent.setup();
    const { container } = renderGlow();
    await canvases();
    await user.click(screen.getByText("Glow intensity table"));
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
    // Boundary cells (lat 0, -1, 90, -90) never reach the counts - the
    // numbers match the painted map.
    expect(rowCells("None")).toEqual(["1", "0"]);
    expect(rowCells("Faint")).toEqual(["1", "1"]);
    expect(rowCells("Moderate")).toEqual(["1", "1"]);
    expect(rowCells("Strong")).toEqual(["1", "0"]);
    expect(rowCells("Intense")).toEqual(["1", "0"]);
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
    expect(bar.getAttribute("style")).toContain("rgba(0, 90, 55, 0.25)");
    const labels = [
      ...legend.querySelectorAll(".oval-glow__legend__label"),
    ].map((el) => el.textContent);
    expect(labels).toEqual(["Faint", "Moderate", "Strong", "Intense"]);
    expect(legend.textContent).not.toMatch(/\d+\s*–\s*\d+/);
    expect(legend.textContent).not.toMatch(/16\+/);
    expect(legend.querySelector(".oval-glow__swatch")).toBeNull();
    expect(container.querySelector(".oval-glow__hatch")).toBeNull();
    // Legend and canvas share the same ramp source.
    expect(ovalLegendGradientCss()).toContain("rgba(0,90,55,0.25) 15%");
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
    // Hue anchors follow NOAA's own legend calibration (re-anchored
    // 2026-09-06): the whole ordinary range (1-30) stays green like NOAA's
    // own render – the old ramp turned yellow at 16, ordinary-night core
    // territory – yellow at 45, red at 75, magenta reserved for the
    // extreme end, and the old 15->16 cliff is gone.
    const [greenR, greenG] = rampColor(8);
    expect(greenG).toBeGreaterThan(greenR);
    const [topGreenR, topGreenG] = rampColor(14);
    expect(topGreenG).toBeGreaterThan(topGreenR);
    const [sixteenR, sixteenG] = rampColor(16);
    expect(sixteenG).toBeGreaterThan(sixteenR);
    const [quietMaxR, quietMaxG] = rampColor(30);
    expect(quietMaxG).toBeGreaterThan(quietMaxR);
    const [yellowR, yellowG, yellowB] = rampColor(45);
    expect(yellowR).toBeGreaterThan(yellowG);
    expect(yellowB).toBeLessThan(yellowG);
    const [orangeR, orangeG, orangeB] = rampColor(60);
    expect(orangeR).toBeGreaterThan(orangeG);
    expect(orangeB).toBeLessThan(orangeG);
    const [redR, redG, redB] = rampColor(75);
    expect(redR).toBeGreaterThan(redG);
    expect(redB).toBeLessThan(redG);
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

  it("keeps the user-picked #444444 land fill on the deep-space background", () => {
    // #444444 on the rgb(1, 3, 11) deep-space stage, per user pick: the oval
    // must read at max brightness - a lighter land fill washed the oval out.
    // Recorded as a deliberate legibility decision; it measures 2.16:1
    // against pure black (the once-claimed 3.66:1 was a miscalculation) and
    // is not asserted against the WCAG non-text contrast bar.
    expect(OVAL_LAND_FILL).toBe("#444444");
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
    const info = screen.getByTitle("About this map");
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

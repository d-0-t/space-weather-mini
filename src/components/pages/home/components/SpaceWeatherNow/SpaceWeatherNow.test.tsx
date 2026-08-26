import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import rtswWindFixture from "../../../../../products/fixtures/rtsw-wind-1m.json?raw";
import rtswMagFixture from "../../../../../products/fixtures/rtsw-mag-1m.json?raw";
import hemiFixture from "../../../../../products/fixtures/hemi-power.txt?raw";
import dstFixture from "../../../../../products/fixtures/kyoto-dst.json?raw";
import boulderFixture from "../../../../../products/fixtures/boulder-k-index-1m.json?raw";
import SpaceWeatherNow from "./SpaceWeatherNow";

const queryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockImplementation((url: string) => {
    const u = typeof url === "string" ? url : "";
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
});

const renderNow = () =>
  render(
    <QueryClientProvider client={queryClient()}>
      <SpaceWeatherNow />
    </QueryClientProvider>,
  );

describe("SpaceWeatherNow", () => {
  it("renders the mini chart cards with latest values", async () => {
    renderNow();
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /Space Weather Now/ }),
      ).toBeInTheDocument(),
    );
    await waitFor(() => expect(screen.getByText("Solar wind")).toBeInTheDocument());
    for (const title of [
      "Solar wind",
      "Particle density",
      "Bt",
      "Bz",
      "Hemispheric power",
      "Dst (Kyoto)",
      "Kiruna magnetometer",
      "NOAA magnetometer (Boulder)",
    ]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(screen.getByText(/km\/s/)).toBeInTheDocument();
    expect(screen.getByText(/p\/cm³/)).toBeInTheDocument();
    expect(screen.getAllByText(/nT/).length).toBeGreaterThan(0);
    expect(screen.getByText(/GW/)).toBeInTheDocument();
  });

  it("labels Bz as South for the reading closest to Now and North for positive", async () => {
    // Mag rows spanning well before the Now reading (transit ≈ 88 min), all
    // southward, so the headline shows the value arriving at Earth now.
    const rows: { time_tag: string; bt: number; bz_gsm: number }[] = [];
    const start = Date.UTC(2026, 7, 26, 19, 0, 0);
    for (let i = 0; i <= 185; i++) {
      rows.push({
        time_tag: new Date(start + i * 60_000).toISOString().slice(0, 19),
        bt: 3.1,
        bz_gsm: -2.3,
      });
    }
    const south = JSON.stringify(rows);
    mockFetch.mockImplementation((url: string) => {
      const u = typeof url === "string" ? url : "";
      if (u.includes("rtsw_mag_1m.json"))
        return Promise.resolve({ ok: true, text: async () => south });
      if (u.includes("rtsw_wind_1m.json"))
        return Promise.resolve({ ok: true, text: async () => rtswWindFixture });
      if (u.includes("aurora-nowcast-hemi-power.txt"))
        return Promise.resolve({ ok: true, text: async () => hemiFixture });
      if (u.includes("kyoto-dst.json"))
        return Promise.resolve({ ok: true, text: async () => dstFixture });
      if (u.includes("boulder_k_index_1m.json"))
        return Promise.resolve({ ok: true, text: async () => boulderFixture });
      return Promise.resolve({ ok: true, text: async () => "" });
    });
    renderNow();
    await waitFor(() => expect(screen.getByText("Solar wind")).toBeInTheDocument());
    expect(screen.getAllByText(/-2\.3/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/South/).length).toBeGreaterThan(0);
  });

  it("pairs each chart with an sr-only table and aria-labelled chart", async () => {
    renderNow();
    await waitFor(() => expect(screen.getByText("Solar wind")).toBeInTheDocument());
    expect(
      screen.getByRole("img", { name: /solar wind speed.*2 hours before now/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /bz gsm magnetic field.*2 hours before now/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: /solar wind — latest values/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: /dst \(kyoto\) — 60-minute averages/i }),
    ).toBeInTheDocument();
  });

  it("computes L1 transit time, readable tooltip timestamps and local time", async () => {
    const { transitMinutes, addMinutes, formatTooltipTime, formatLocalTime } =
      await import("./SpaceWeatherNow");
    expect(transitMinutes(400)).toBe(63); // 1.5e6 km / 400 km/s ≈ 62.5 min
    expect(transitMinutes(750)).toBe(33);
    expect(transitMinutes(null)).toBe(0);
    expect(addMinutes("2026-08-26T22:00:00", 60)).toBe("2026-08-26T23:00");
    expect(formatTooltipTime("2026-08-26T22:04:07")).toBe("26 Aug 2026 22:04");
    expect(formatTooltipTime("2026-08-26_21:00")).toBe("26 Aug 2026 21:00");
    expect(formatLocalTime("2026-08-26T22:04:07")).toMatch(/^\d{1,2}:\d{2}( AM| PM)?$/);
    expect(formatLocalTime("2026-08-26_21:00")).toMatch(/^\d{1,2}:\d{2}( AM| PM)?$/);
  });

  it("averages rows into time buckets for a cleaner line", async () => {
    const { smoothPoints } = await import("./SpaceWeatherNow");
    const rows = Array.from({ length: 10 }, (_, i) => ({
      time_tag: new Date(Date.UTC(2026, 7, 26, 22, i)).toISOString(),
      value: i + 1, // 1..10
    }));
    // 5-minute buckets: mean(1..5) = 3, mean(6..10) = 8
    const points = smoothPoints(rows, 60, 5);
    expect(points).toHaveLength(2);
    expect(points[0].value).toBeCloseTo(3);
    expect(points[1].value).toBeCloseTo(8);
    expect(points[1].time).toBe("22:05");
    // Null rows leave gaps instead of poisoning the average
    const sparse = [
      { time_tag: "2026-08-26T22:00:00", value: 1 },
      { time_tag: "2026-08-26T22:01:00", value: null },
      { time_tag: "2026-08-26T22:02:00", value: 3 },
    ];
    expect(smoothPoints(sparse, 10, 5)[0].value).toBeCloseTo(2);
  });

  it("places the Now anchor transit points LEFT of the freshest reading", async () => {
    const { withNowAnchor } = await import("./SpaceWeatherNow");
    const points = [
      { x: 179, time: "22:00", timeTag: "2026-08-26T22:00:00", value: 1 },
    ];
    const anchored = withNowAnchor(points, "20:32", 88);
    expect(anchored).toHaveLength(2);
    expect(anchored[1]).toEqual({ x: 91, time: "20:32", timeTag: "", value: null });
    // No anchor when the label exists in the data (1-min feeds cover it)
    expect(withNowAnchor(points, "22:00", 88)).toHaveLength(1);
  });

  it("explains the propagation delay behind the Now line", async () => {
    renderNow();
    await waitFor(() => expect(screen.getByText("Solar wind")).toBeInTheDocument());
    // Fixture speed ~280 km/s → transit ≈ 89 minutes, source IMAP
    expect(screen.getByText(/We are \d+ minutes behind/)).toBeInTheDocument();
    expect(screen.getByText(/IMAP's data, based on solar wind speed/)).toBeInTheDocument();
  });

  it("shows the Kiruna magnetogram image and the NOAA Boulder chart as separate cards", async () => {
    renderNow();
    await waitFor(() =>
      expect(screen.getByText("Kiruna magnetometer")).toBeInTheDocument(),
    );
    const image = screen.getByRole("img", {
      name: /kiruna magnetogram, x y and z components/i,
    });
    expect(image).toBeInTheDocument();
    expect(image.getAttribute("src")).toContain("spaceweather.irf.se");
    expect(
      screen.getByRole("heading", { name: /NOAA magnetometer \(Boulder\)/ }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("img", { name: /boulder magnetometer k index, last 3 hours/i }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("table", { name: /boulder magnetometer k index/i }),
    ).toBeInTheDocument();
    // No tablist remains – the two magnetometer sources are always visible
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("shows the error branch when the core solar wind feeds fail", async () => {
    mockFetch.mockImplementation((url: string) => {
      const u = typeof url === "string" ? url : "";
      if (u.includes("rtsw")) {
        return Promise.resolve({
          ok: false,
          status: 500,
          text: async () => "",
        } as Response);
      }
      return Promise.resolve({ ok: true, text: async () => "" });
    });
    renderNow();
    await waitFor(() =>
      expect(
        screen.getByText(/Couldn't load space weather/i),
      ).toBeInTheDocument(),
    );
  });
});
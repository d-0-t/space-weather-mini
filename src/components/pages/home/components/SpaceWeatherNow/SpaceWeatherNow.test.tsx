import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    expect(screen.getAllByText(/km\/s/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/p\/cm³/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/nT/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/GW/).length).toBeGreaterThan(0);
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

  it("labels every chart with a descriptive aria-label", async () => {
    renderNow();
    await waitFor(() =>
      expect(
        screen.getByRole("img", { name: /boulder magnetometer k index, last 3 hours/i }),
      ).toBeInTheDocument(),
    );
    for (const label of [
      /solar wind speed.*2 hours before now/i,
      /proton density.*2 hours before now/i,
      /total magnetic field strength bt.*2 hours before now/i,
      /bz gsm magnetic field.*2 hours before now/i,
      /hemispheric power, north and south mirrored around zero, all available data/i,
      /disturbance storm index, last 24 hours/i,
      /boulder magnetometer k index, last 3 hours/i,
    ]) {
      expect(screen.getByRole("img", { name: label })).toBeInTheDocument();
    }
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

  it("explains every chart in a native collapsible help toggle", async () => {
    const user = userEvent.setup();
    renderNow();
    await waitFor(() => expect(screen.getByText("Solar wind")).toBeInTheDocument());
    // One "?" help per card – 8 cards, all collapsible via native <details>
    const helps = document.querySelectorAll(".space-weather-now__help");
    expect(helps.length).toBeGreaterThanOrEqual(8);
    expect(screen.getAllByText("?").length).toBeGreaterThanOrEqual(8);
    // Per-card sr-only labels
    expect(screen.getByText("About solar wind")).toBeInTheDocument();
    expect(screen.getByText("About Dst")).toBeInTheDocument();
    expect(screen.getByText("About the NOAA magnetometer")).toBeInTheDocument();
    for (const details of Array.from(helps)) {
      expect(details).toHaveProperty("open", false);
    }
    // Opening the Solar wind help reveals its compact scale
    const solarHelp = screen.getByText("Solar wind").closest("section")!.querySelector(
      ".space-weather-now__help",
    )! as HTMLDetailsElement;
    await user.click(solarHelp.querySelector("summary")!);
    expect(solarHelp.open).toBe(true);
    expect(solarHelp.querySelector("li b")?.textContent).toBe("< 400 km/s");
    expect(solarHelp.textContent).toMatch(/900 km\/s.*very high/);
    // Escape closes it and returns focus to the "?" trigger
    await user.keyboard("{Escape}");
    expect(solarHelp.open).toBe(false);
    expect(solarHelp.querySelector("summary")).toHaveFocus();
    // Clicking toggles it open and closed again
    await user.click(solarHelp.querySelector("summary")!);
    expect(solarHelp.open).toBe(true);
    await user.click(solarHelp.querySelector("summary")!);
    expect(solarHelp.open).toBe(false);
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
    // A null window plots every row, even ones a window would cut off
    const full = smoothPoints(
      [
        { time_tag: "2026-08-26T20:00:00", value: 1 },
        { time_tag: "2026-08-26T22:00:00", value: 9 },
      ],
      null,
      60,
    );
    expect(full).toHaveLength(2);
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

  it("explains Bt and Bz as the interplanetary magnetic field components", async () => {
    const user = userEvent.setup();
    renderNow();
    await waitFor(() => expect(screen.getByText("Bt")).toBeInTheDocument());
    const btHelp = screen
      .getByText("Bt")
      .closest("section")!
      .querySelector(".space-weather-now__help")! as HTMLDetailsElement;
    await user.click(btHelp.querySelector("summary")!);
    expect(btHelp.textContent).toMatch(
      /Interplanetary magnetic field \(IMF\), Bt component/i,
    );
    expect(btHelp.textContent).toMatch(/strength of the Sun's magnetic field/);
    const bzHelp = screen
      .getByText("Bz")
      .closest("section")!
      .querySelector(".space-weather-now__help")! as HTMLDetailsElement;
    await user.click(bzHelp.querySelector("summary")!);
    expect(bzHelp.textContent).toMatch(
      /Interplanetary magnetic field \(IMF\), Bz \(GSM\) component/i,
    );
    expect(bzHelp.textContent).toMatch(/southward \(negative\) Bz/i);
  });

  it("shows north and south hemispheric power together", async () => {
    renderNow();
    await waitFor(() =>
      expect(screen.getByText("Hemispheric power")).toBeInTheDocument(),
    );
    const hemiCard = screen.getByText("Hemispheric power").closest("section")!;
    // The chart is described as a mirror around zero covering all data
    expect(
      hemiCard
        .querySelector(".space-weather-now__chart")!
        .getAttribute("aria-label"),
    ).toMatch(/north and south mirrored around zero, all available data/i);
    // Headline: one large number per hemisphere, spread across the card
    const hemi = hemiCard.querySelector(".space-weather-now__hemi")!;
    const sides = hemi.querySelectorAll(".space-weather-now__hemi__side");
    expect(sides).toHaveLength(2);
    expect(sides[0]!.textContent).toMatch(/^\d+GWNorth$/);
    expect(sides[1]!.textContent).toMatch(/^\d+GWSouth$/);
  });

  it("rounds the mirrored chart ceiling up symmetrically", async () => {
    const { symmetricCeiling } = await import("./SpaceWeatherNow");
    expect(symmetricCeiling([18, 16])).toBe(20);
    expect(symmetricCeiling([0])).toBe(10);
    expect(symmetricCeiling([53])).toBe(55);
    expect(symmetricCeiling([-12, 0])).toBe(15);
  });

  it("stacks the Boulder help list and description in one popover", async () => {
    const user = userEvent.setup();
    renderNow();
    await waitFor(() =>
      expect(
        screen.getByText("NOAA magnetometer (Boulder)"),
      ).toBeInTheDocument(),
    );
    const boulderHelp = screen
      .getByText("NOAA magnetometer (Boulder)")
      .closest("section")!
      .querySelector(".space-weather-now__help")! as HTMLDetailsElement;
    await user.click(boulderHelp.querySelector("summary")!);
    const popover = boulderHelp.querySelector(".space-weather-now__popover")!;
    // Both the scale list and the description render, stacked, not overlapped
    expect(popover.querySelectorAll("li").length).toBeGreaterThan(3);
    expect(popover.querySelector("li b")?.textContent).toBe("0-2");
    expect(popover.querySelector("p")?.textContent).toMatch(
      /simple local gauge of how disturbed the magnetic field/,
    );
    // The list paints above (before) the description in DOM order
    expect(
      popover.querySelector("ul")!.compareDocumentPosition(popover.querySelector("p")!),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("shows the Kiruna magnetogram image and the NOAA Boulder chart as separate cards", async () => {
    renderNow();
    await waitFor(() =>
      expect(screen.getByText("Kiruna magnetometer")).toBeInTheDocument(),
    );
    const images = screen.getAllByRole("img", {
      name: /kiruna magnetogram, x y and z components/i,
    });
    expect(images.length).toBeGreaterThanOrEqual(1);
    expect(images[0]!.getAttribute("src")).toContain("spaceweather.irf.se");
    // The modal also carries the full-size image
    const dialog = document.querySelector("dialog.image-modal")!;
    expect(dialog.querySelector("img")?.getAttribute("src")).toContain(
      "spaceweather.irf.se",
    );
    expect(
      screen.getByRole("heading", { name: /NOAA magnetometer \(Boulder\)/ }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("img", { name: /boulder magnetometer k index, last 3 hours/i }),
      ).toBeInTheDocument(),
    );
    // No tablist remains – the two magnetometer sources are always visible
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("opens the Kiruna magnetogram in a modal closeable by X and Escape", async () => {
    const user = userEvent.setup();
    renderNow();
    await waitFor(() =>
      expect(screen.getByText("Kiruna magnetometer")).toBeInTheDocument(),
    );
    const dialog = document.querySelector(
      "dialog.image-modal",
    ) as HTMLDialogElement;
    expect(dialog.open).toBe(false);
    const tile = screen.getByRole("button", { name: /kiruna magnetogram/i });
    await user.click(tile);
    expect(dialog.open).toBe(true);
    // Close button: visible × with an sr-only "Close" label and tooltip
    const close = screen.getByRole("button", { name: /^Close$/ });
    expect(close.querySelector("span[aria-hidden]")?.textContent).toBe("×");
    expect(close.querySelector(".sr-only")?.textContent).toBe("Close");
    expect(close.getAttribute("title")).toBe("Close");
    await user.click(close);
    expect(dialog.open).toBe(false);
    // Escape closes it again
    await user.click(tile);
    expect(dialog.open).toBe(true);
    await user.keyboard("{Escape}");
    expect(dialog.open).toBe(false);
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
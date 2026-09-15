// The freshness line renders in the device time zone in Local mode, so the
// suite pins one (Sweden, UTC+2) to keep every expectation deterministic.
process.env.TZ = "Europe/Stockholm";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import kpObservedFixture from "../../../../../products/fixtures/noaa-planetary-k-index.json?raw";
import kirunaFixture from "../../../../../data/fixtures/nominatim-kiruna.json";
import openMeteoKirunaFixture from "../../../../../data/fixtures/open-meteo-kiruna.json";
import AuroraNow from "./AuroraNow";
import PossibleLocationsPanel from "./PossibleLocationsPanel";
import { AlertsProvider } from "../Alerts/AlertsContext";
import { DisplayTimezoneProvider } from "../../../../DisplayTimezone/DisplayTimezoneContext";
import { saveDisplayTimezone } from "../../../../../products/display-timezone";
import { COULDNT_LOAD_COPY, STALE_DATA_NOTICE } from "../offline/offline";
import { PLACE_STORAGE_KEY } from "../../../../../data/place-storage";
import { sunState } from "../../../../../data/sun";
import { saveViewDistanceThreshold } from "../../../../../products/view-distance";
import { jsonResponse } from "../../../../../test/nominatim-test-utils";
import { ovationJson } from "../../../../../test/ovation-test-utils";

const queryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const mockFetch = vi.fn();

/** The observed Kp payload the mock serves; tests can swap in a variant. */
let kpFixtureText = kpObservedFixture;

/** The synthetic Oval grid the OVATION fetch mock serves; tests override it. */
let ovationGrid: Array<[number, number, number]> = [
  [0, 70, 3],
  [10, 65, 8],
];

/** Seeds the stored geocoded place (the one shared key, versioned). */
const seedPlace = (place: Record<string, unknown>): void => {
  localStorage.setItem(PLACE_STORAGE_KEY, JSON.stringify({ v: 1, place }));
};

/** Oslo – far enough from the default grid for a clean Not-in-range. */
const OSLO_PLACE = {
  displayName: "Oslo, Norway",
  shortName: "Oslo",
  latitude: 59.9139,
  longitude: 10.7522,
  fetchedAt: "2026-09-04T12:00:00Z",
};

/** The first 2026-08-26 instant at Oslo whose solar light state matches. */
const findSunState = (state: "day" | "civil-twilight" | "dark"): Date => {
  for (let minutes = 0; minutes < 24 * 60; minutes += 5) {
    const ms = Date.UTC(2026, 7, 26, 0, minutes);
    if (
      sunState(OSLO_PLACE.latitude, OSLO_PLACE.longitude, new Date(ms)) ===
      state
    ) {
      return new Date(ms);
    }
  }
  throw new Error(`No ${state} instant found at Oslo on 2026-08-26`);
};

beforeEach(() => {
  // Fix today to Aug26 2026 (Wednesday) UTC so moon phase is deterministic,
  // at local midnight at the tested places so the View distance line reads a
  // real band (the daytime/twilight labels are exercised by their own tests).
  vi.useFakeTimers({ toFake: ["Date"] } as unknown as Parameters<
    typeof vi.useFakeTimers
  >[0]);
  vi.setSystemTime(new Date("2026-08-26T22:00:00Z"));
  localStorage.clear();
  ovationGrid = [
    [0, 70, 3],
    [10, 65, 8],
  ];
  mockFetch.mockReset();
  kpFixtureText = kpObservedFixture;
  mockFetch.mockImplementation((url: string) => {
    const u = typeof url === "string" ? url : "";
    if (u.includes("noaa-planetary-k-index.json"))
      return Promise.resolve({ ok: true, text: async () => kpFixtureText });
    if (u.includes("ovation_aurora_latest.json"))
      return Promise.resolve({
        ok: true,
        text: async () => ovationJson(ovationGrid),
      });
    if (u.includes("api.open-meteo.com"))
      return Promise.resolve(jsonResponse(openMeteoKirunaFixture));
    return Promise.resolve({ ok: true, text: async () => "" });
  });
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.useRealTimers();
});

const renderAuroraNow = () =>
  render(
    <QueryClientProvider client={queryClient()}>
      <MemoryRouter>
        <DisplayTimezoneProvider>
          <AlertsProvider>
            <AuroraNow />
          </AlertsProvider>
        </DisplayTimezoneProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );

const renderPossibleLocations = () =>
  render(
    <QueryClientProvider client={queryClient()}>
      <MemoryRouter>
        <DisplayTimezoneProvider>
          <AlertsProvider>
            <PossibleLocationsPanel />
          </AlertsProvider>
        </DisplayTimezoneProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("AuroraNow", () => {
  it("renders heading Aurora Now with current Kp and bar; the oval glow lives in its own panel", async () => {
    renderAuroraNow();
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /^Aurora Now$/i }),
      ).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(document.querySelector(".kp-bar")).toBeInTheDocument(),
    );
    expect(document.querySelector(".aurora-now__current")).toBeInTheDocument();
    // Ticket 01 split: the Oval glow intensity panel owns the map now.
    expect(
      screen.queryByRole("img", { name: /oval glow/i }),
    ).toBeNull();
  });

  it("labels the current 3-hour window in the chosen timezone, same slot in both modes", async () => {
    renderAuroraNow();
    await waitFor(() =>
      expect(document.querySelector(".kp-bar")).toBeInTheDocument(),
    );
    // Fixture's latest observed reading is at 12:00 UTC → the 12-15 UT slot,
    // 14:00-17:00 in Local mode's Stockholm clock.
    expect(screen.getByText("14:00 - 17:00")).toBeInTheDocument();
    const kpBadge = () =>
      document.querySelector(".aurora-now__current__kp")?.textContent;
    expect(kpBadge()).toBe("Kp1");
    // UTC mode labels the same (instant-based) slot in UTC clock with suffix;
    // the highlight and the Kp value do not move between modes.
    saveDisplayTimezone(localStorage, "utc");
    cleanup();
    renderAuroraNow();
    await waitFor(() =>
      expect(document.querySelector(".kp-bar")).toBeInTheDocument(),
    );
    expect(screen.getByText("12:00 - 15:00 UTC")).toBeInTheDocument();
    expect(kpBadge()).toBe("Kp1");
  });

  it("mounts the Possible locations panel for the current observed Kp (ticket 01 split)", async () => {
    // Winter-solstice noon UTC: Fairbanks sits at 02:10 local, deep night,
    // and the fixture's latest observed Kp 1 puts it inside the 64° edge.
    vi.setSystemTime(new Date("2026-12-21T12:00:00Z"));
    renderPossibleLocations();
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /^Possible locations$/i }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("Fairbanks")).toBeInTheDocument();
  });

  it("drives the Possible locations from the raw observed Kp, not the rounded badge", async () => {
    // The latest observed reading is fractional: the raw edge is
    // 66 − 2 × 2.33 = 61.34°, so Anchorage (MLAT 61.93) is Possible. The
    // rounded badge (Kp 2 → edge 62°) would have dropped it. 12:00Z on the
    // winter solstice is 02:04 local solar at Anchorage – deep night.
    vi.setSystemTime(new Date("2026-12-21T12:00:00Z"));
    const observed = JSON.parse(kpObservedFixture) as Array<{ Kp: number }>;
    observed[observed.length - 1].Kp = 2.33;
    kpFixtureText = JSON.stringify(observed);
    // The badge (Aurora now panel) shows the fractional reading…
    renderAuroraNow();
    await waitFor(() =>
      expect(document.querySelector(".kp-bar")).toBeInTheDocument(),
    );
    expect(
      document.querySelector(".aurora-now__current__kp")?.textContent,
    ).toBe("Kp2.33");
    cleanup();
    // …and the Possible locations panel lists Anchorage from the raw edge.
    renderPossibleLocations();
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /^Possible locations$/i }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("Anchorage")).toBeInTheDocument();
  });

  it("shows the current moon phase emoji in a help popover with sr-only label", async () => {
    const user = userEvent.setup();
    renderAuroraNow();
    await waitFor(() =>
      expect(document.querySelector(".kp-bar")).toBeInTheDocument(),
    );
    const moon = document.querySelector(".live-panel__help--moon")!;
    expect(moon).not.toBeNull();
    // Fake system time is 2026-08-26T22:00Z → Waxing gibbous
    expect(
      screen.getByText("Current Moon phase: Waxing gibbous"),
    ).toBeInTheDocument();
    expect(moon.querySelector("[aria-hidden='true']")!.textContent).toBe("🌔");
    // The popover explains the phase and why it matters for aurora
    const moonTrigger = moon.querySelector("button")!;
    await user.click(moonTrigger);
    expect(moonTrigger).toHaveAttribute("aria-expanded", "true");
    const moonPopover = document.querySelector(".live-panel__popover")!;
    expect(moonPopover.textContent).toMatch(/Waxing gibbous/);
    expect(moonPopover.textContent).toMatch(
      /darkest skies around the new moon/,
    );
  });

  it("attributes the oval forecast images to the NOAA aurora product page", async () => {
    renderAuroraNow();
    await waitFor(() =>
      expect(document.querySelector(".kp-bar")).toBeInTheDocument(),
    );
    const source = screen.getByRole("link", { name: /^NOAA\/SWPC$/ });
    expect(source.getAttribute("href")).toBe(
      "https://www.swpc.noaa.gov/products/aurora-30-minute-forecast",
    );
  });

  it("shows the stale notice with saved data when the browser goes offline", async () => {
    renderAuroraNow();
    await waitFor(() =>
      expect(document.querySelector(".kp-bar")).toBeInTheDocument(),
    );
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(
      screen.getAllByText(STALE_DATA_NOTICE).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows the plain never-cached error when the Kp feed never loaded", async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({ ok: false, status: 500, text: async () => "" }),
    );
    renderAuroraNow();
    await waitFor(() =>
      expect(screen.getByText(COULDNT_LOAD_COPY)).toBeInTheDocument(),
    );
  });

  it("no longer embeds the Oval glow; Forecast Time lives in its own panel", async () => {
    // Ticket 01 split: the Oval glow intensity panel owns the map now.
    renderAuroraNow();
    await waitFor(() =>
      expect(document.querySelector(".kp-bar")).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("img", { name: /oval glow/i }),
    ).toBeNull();
    expect(screen.queryByText(/Forecast Time/i)).toBeNull();
  });

  it("renders the band line: info, place in text and one Change location button", async () => {
    // Oslo with a qualifying cell half a degree north (~56 km) => likely.
    seedPlace(OSLO_PLACE);
    ovationGrid = [[10.7522, 60.4139, 12]];
    renderAuroraNow();
    await waitFor(() =>
      expect(document.querySelector(".kp-bar")).toBeInTheDocument(),
    );
    await screen.findByText(/Aurora likely/);
    // The probability card: info and place as text, the shared modal behind
    // one Change location button.
    const text = document.querySelector(
      ".view-distance__probability__location__text",
    );
    expect(text?.textContent).toContain("Aurora likely");
    expect(text?.textContent).toContain("Oslo");
    const change = screen.getByRole("button", { name: "Change location" });
    expect(change).toHaveClass("btn--secondary");
    // Icon-only: no visible label, named by title + sr-only span.
    expect(change.querySelector(".btn__label")).toBeNull();
    expect(change.querySelector(".sr-only")?.textContent).toBe(
      "Change location",
    );
    expect(change.getAttribute("title")).toBe("Change location");
    expect(screen.queryByRole("button", { name: /Oslo/ })).toBeNull();
  });

  it("reads Daytime instead of an aurora band when the sun is up", async () => {
    vi.setSystemTime(new Date("2026-08-26T12:00:00Z"));
    // Oslo with a qualifying cell half a degree north (~56 km) => likely.
    seedPlace(OSLO_PLACE);
    ovationGrid = [[10.7522, 60.4139, 12]];
    renderAuroraNow();
    await screen.findByText("Daytime");
    const text = document.querySelector(
      ".view-distance__probability__location__text",
    );
    expect(text?.textContent).toContain("Daytime");
    expect(text?.textContent).not.toContain("Aurora");
    expect(text?.textContent).toContain("Oslo");
  });

  it("reads Civil twilight instead of an aurora band in the twilight window", async () => {
    vi.setSystemTime(findSunState("civil-twilight"));
    seedPlace(OSLO_PLACE);
    ovationGrid = [[10.7522, 60.4139, 12]];
    renderAuroraNow();
    await screen.findByText("Civil twilight");
    const text = document.querySelector(
      ".view-distance__probability__location__text",
    );
    expect(text?.textContent).toContain("Civil twilight");
    expect(text?.textContent).not.toContain("Aurora");
  });

  it("shows the current-weather one-liner with icon, temperature and cloud, plus the Local conditions link", async () => {
    seedPlace(OSLO_PLACE);
    ovationGrid = [[10.7522, 60.4139, 12]];
    renderAuroraNow();
    await waitFor(() =>
      expect(document.querySelector(".kp-bar")).toBeInTheDocument(),
    );
    await screen.findByText(/Aurora likely/);
    // The weather loads on its own query; wait for the one-liner.
    await screen.findByText(/19% cloud\./);
    const line = document.querySelector(".weather-line") as HTMLElement;
    expect(line).not.toBeNull();
    // The sky-condition icon (aria-hidden; the WMO text is visible beside
    // it), the temperature and the total cloud coverage – nothing else
    // (no humidity, no low/mid/high split).
    expect(
      line.querySelector('.weather-icon[title="Clear sky"]'),
    ).not.toBeNull();
    expect(line.textContent).toContain("clear sky,");
    expect(line.textContent).toContain("3°C");
    expect(line.textContent).toContain("19% cloud.");
    expect(line.textContent).not.toMatch(/Humidity|low|mid|high/);
    // The darkest window names the deepest band the day reaches.
    expect(line.textContent).toMatch(/Darkest \(night\):/);
    // The link to the Local conditions page
    const link = within(line).getByRole("link", { name: "Local conditions →" });
    expect(link.getAttribute("href")).toBe("/conditions");
  });

  it("no longer carries the summary; the reach sentence lives in the Summary panel", async () => {
    // Ticket 01 split: AuroraSummary (with its view-distance reach last
    // sentence) is the Summary panel now – see AuroraSummary.test.tsx.
    seedPlace(OSLO_PLACE);
    ovationGrid = [[10.7522, 60.4139, 12]];
    renderAuroraNow();
    await screen.findByText(/Aurora likely/);
    expect(
      document.querySelector(".aurora-now__summary__text"),
    ).toBeNull();
  });

  it("refetches the weather for the place picked in the modal", async () => {
    const user = userEvent.setup();
    seedPlace(OSLO_PLACE);
    // The oval cell sits on Kiruna: Oslo reads not in range before the
    // pick, likely after – the same flip the band test drives.
    ovationGrid = [[20.2253, 68.3558, 12]];
    mockFetch.mockImplementation((input: unknown) => {
      const url = new URL(String(input));
      if (url.host === "api.open-meteo.com")
        return Promise.resolve(jsonResponse(openMeteoKirunaFixture));
      if (url.host === "nominatim.openstreetmap.org")
        return Promise.resolve(jsonResponse(kirunaFixture));
      return Promise.resolve({
        ok: true,
        text: async () =>
          url.href.includes("noaa-planetary-k-index.json")
            ? kpObservedFixture
            : ovationJson(ovationGrid),
      });
    });
    renderAuroraNow();
    await waitFor(() =>
      expect(document.querySelector(".kp-bar")).toBeInTheDocument(),
    );
    await screen.findByText(/Aurora not in range/);
    const weatherCalls = () =>
      mockFetch.mock.calls
        .map(([input]) => String(input))
        .filter((u) => u.includes("api.open-meteo.com"))
        .map((u) => new URL(u));
    // Oslo's coordinates first
    expect(await screen.findByText(/19% cloud\./)).toBeInTheDocument();
    expect(
      weatherCalls().some(
        (url) => url.searchParams.get("latitude") === "59.9139",
      ),
    ).toBe(true);
    // The pick writes Kiruna into the shared place; the weather refetches
    // with the new coordinates alongside the band line.
    await user.click(screen.getByRole("button", { name: "Change location" }));
    await user.type(
      screen.getByRole("searchbox", { name: "Search for a place" }),
      "Kiruna",
    );
    await user.click(screen.getByRole("button", { name: "Search" }));
    await user.click(screen.getAllByRole("radio")[0]);
    await user.click(screen.getByRole("button", { name: "Apply and close" }));
    expect(await screen.findByText(/Aurora likely/)).toBeInTheDocument();
    // The weather refetched with the picked place's coordinates (the
    // Nominatim fixture's Kiruna) alongside the band.
    await waitFor(() =>
      expect(
        weatherCalls().some(
          (url) => url.searchParams.get("latitude") === "67.8496111",
        ),
      ).toBe(true),
    );
  });

  it("reads not in range without a preposition and in lowercase", async () => {
    // Oslo is ~1180 km from the only grid cell: out of range.
    seedPlace(OSLO_PLACE);
    ovationGrid = [[20.2253, 68.3558, 12]];
    renderAuroraNow();
    await waitFor(() =>
      expect(document.querySelector(".kp-bar")).toBeInTheDocument(),
    );
    await screen.findByText(/Aurora not in range/);
    // The card's own text never uses a preposition - `from`/`at` do not
    // work for every band; the place reads below the band, lowercase.
    const text = document.querySelector(
      ".view-distance__probability__location__text",
    );
    expect(text?.textContent).toMatch(/Aurora not in range/);
    expect(text?.textContent).not.toMatch(/from|at /);
    expect(text?.textContent).toContain("Oslo");
  });

  it("opens the shared Change location modal from the Change location button", async () => {
    const user = userEvent.setup();
    seedPlace(OSLO_PLACE);
    renderAuroraNow();
    await waitFor(() =>
      expect(document.querySelector(".kp-bar")).toBeInTheDocument(),
    );
    const change = await screen.findByRole("button", {
      name: "Change location",
    });
    await user.click(change);
    const dialog = document.querySelector(
      "dialog.place-finder__modal",
    ) as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(
      screen.getByRole("heading", { name: "Change location" }),
    ).toBeInTheDocument();
  });

  it("explains the band behind the (i) popover with the band table", async () => {
    const user = userEvent.setup();
    seedPlace(OSLO_PLACE);
    renderAuroraNow();
    await waitFor(() =>
      expect(document.querySelector(".kp-bar")).toBeInTheDocument(),
    );
    const info = await screen.findByTitle("About view distance");
    await user.click(info);
    const popover = document.querySelector(
      ".view-distance__popover",
    ) as HTMLElement;
    expect(popover).not.toBeNull();
    // The full band table with confidence per band.
    expect(popover.textContent).toContain(
      "Overhead / Nearby ~0-100 km – Likely",
    );
    expect(popover.textContent).toContain("Distant ~100-300 km – Possible");
    expect(popover.textContent).toContain("Far ~300-600 km – Unlikely");
    expect(popover.textContent).toContain("Over 600 km – Not in range");
  });

  it("recomputes the band when a place picked in the modal is applied", async () => {
    const user = userEvent.setup();
    // Oslo is ~1180 km from the only grid cell, which sits ~56 km from
    // Kiruna: the line must flip from not in range to likely after the pick.
    seedPlace(OSLO_PLACE);
    ovationGrid = [[20.2253, 68.3558, 12]];
    mockFetch.mockImplementation((input: unknown) => {
      const url = new URL(String(input));
      if (url.host === "nominatim.openstreetmap.org")
        return Promise.resolve(jsonResponse(kirunaFixture));
      return Promise.resolve({
        ok: true,
        text: async () =>
          url.href.includes("noaa-planetary-k-index.json")
            ? kpObservedFixture
            : ovationJson(ovationGrid),
      });
    });
    renderAuroraNow();
    await waitFor(() =>
      expect(document.querySelector(".kp-bar")).toBeInTheDocument(),
    );
    expect(await screen.findByText(/Aurora not in range/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Change location" }));
    await user.type(
      screen.getByRole("searchbox", { name: "Search for a place" }),
      "Kiruna",
    );
    await user.click(screen.getByRole("button", { name: "Search" }));
    await user.click(screen.getAllByRole("radio")[0]);
    await user.click(screen.getByRole("button", { name: "Apply and close" }));
    expect(await screen.findByText(/Aurora likely/)).toBeInTheDocument();
    expect(
      document.querySelector(".view-distance__probability__location__text")
        ?.textContent,
    ).toContain("Kiruna");
  });

  it("carries no Forecast Time itself; the Oval panel owns the one freshness line", async () => {
    // Ticket 01 split: the oval's `Forecast Time ... lead.` lives in the
    // Oval glow intensity panel now. Aurora now keeps no As-of of its own
    // (the Kp freshness line stays commented out).
    seedPlace(OSLO_PLACE);
    ovationGrid = [[10.7522, 60.4139, 12]];
    renderAuroraNow();
    await waitFor(() =>
      expect(document.querySelector(".kp-bar")).toBeInTheDocument(),
    );
    await screen.findByText(/Aurora likely/);
    expect(screen.queryByText(/Forecast Time/i)).toBeNull();
    expect(screen.queryByText(/As of Sep 4 14:33 UTC/)).toBeNull();
    expect(screen.queryByText(/As of 16:33/)).toBeNull();
  });

  it("honors the stored view distance threshold", async () => {
    // Aurora 5 is below the default threshold 6 (not in range); once the
    // versioned stored threshold is 5, the next mount reads likely.
    seedPlace(OSLO_PLACE);
    ovationGrid = [[10.7522, 60.4139, 5]];
    renderAuroraNow();
    await waitFor(() =>
      expect(document.querySelector(".kp-bar")).toBeInTheDocument(),
    );
    expect(await screen.findByText(/Aurora not in range/)).toBeInTheDocument();
    cleanup();
    saveViewDistanceThreshold(localStorage, 5);
    renderAuroraNow();
    expect(await screen.findByText(/Aurora likely/)).toBeInTheDocument();
  });
});

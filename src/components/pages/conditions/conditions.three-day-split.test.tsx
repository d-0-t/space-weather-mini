// Seams (approved): LocalConditions composition + split 3-day weather
// forecast section + wide 2-column mapping. External behavior only.
process.env.TZ = "Europe/Stockholm";

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import LocalConditions from "./conditions";
import { PLACE_STORAGE_KEY } from "../../../data/place-storage";
import type { WeatherData } from "../../../data/weather";
import { saveWeather } from "../../../data/weather-storage";
import openMeteoKirunaFixture from "../../../data/fixtures/open-meteo-kiruna.json";
import { DisplayTimezoneProvider } from "../../DisplayTimezone/DisplayTimezoneContext";
import { jsonResponse } from "../../../test/nominatim-test-utils";

const testQueryClient = (): QueryClient =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderPage = (): ReturnType<typeof render> =>
  render(
    <QueryClientProvider client={testQueryClient()}>
      <DisplayTimezoneProvider>
        <LocalConditions />
      </DisplayTimezoneProvider>
    </QueryClientProvider>,
  );

const seedKiruna = (): void => {
  localStorage.setItem(
    PLACE_STORAGE_KEY,
    JSON.stringify({
      v: 1,
      place: {
        displayName: "Kiruna, Norrbotten County, Sweden",
        shortName: "Kiruna, Norrbotten County",
        latitude: 67.8558,
        longitude: 20.2253,
        fetchedAt: "2026-06-01T10:00:00.000Z",
      },
    }),
  );
};

const atNoon = (iso: string): void => {
  vi.useFakeTimers({ toFake: ["Date"] } as unknown as Parameters<
    typeof vi.useFakeTimers
  >[0]);
  vi.setSystemTime(new Date(iso));
};

/** A mapped WeatherData as if Kiruna was fetched two months ago. */
const savedWeather = (): WeatherData => ({
  utcOffsetSeconds: 3600,
  timezone: "Europe/Stockholm",
  fetchedAt: "2026-06-01T18:00:00.000Z",
  current: {
    observedAt: "2026-09-09T20:15",
    temperatureC: 3,
    humidityPercent: 78,
    cloudCoverPercent: 12,
    cloudLowPercent: 0,
    cloudMidPercent: 10,
    cloudHighPercent: 2,
    weatherCode: 1,
    windSpeedKmh: 11,
    precipitationMm: 0,
  },
  hourly: [
    {
      time: "2026-09-09T20:00",
      temperatureC: 2.5,
      humidityPercent: 80,
      cloudCoverPercent: 9,
      cloudLowPercent: 0,
      cloudMidPercent: 8,
      cloudHighPercent: 1,
      weatherCode: 1,
    },
  ],
  daily: [
    {
      date: "2026-09-09",
      weatherCode: 1,
      temperatureMaxC: 9.5,
      temperatureMinC: 2.1,
      sunrise: "2026-09-09T05:42",
      sunset: "2026-09-09T19:10",
    },
  ],
});

describe("Local conditions 3-day split (dashboard-layout ticket 03)", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
    atNoon("2026-09-01T12:00:00Z");
    seedKiruna();
    mockFetch.mockResolvedValue(jsonResponse(openMeteoKirunaFixture));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("renders the Three-day weather forecast as its own collapsible h2 section owning the daily table", async () => {
    renderPage();

    const toggle = await screen.findByRole("button", {
      name: "Three-day weather forecast",
    });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const controls = toggle.getAttribute("aria-controls");
    expect(controls).toBe("conditions-3day-body");
    expect(document.getElementById("conditions-3day-body")).not.toBeNull();

    const table = await screen.findByRole("table");
    expect(table.querySelector("caption")?.textContent).toMatch(
      /Three-day weather forecast/,
    );
    expect(
      document.getElementById("conditions-3day-body")?.contains(table),
    ).toBe(true);
    expect(within(table).getAllByRole("row")).toHaveLength(4);
    // Both sections share one Open-Meteo query: a single fetch serves the
    // Weather and Three-day weather forecast sections together.
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("keeps the daily table out of Weather: Weather owns current, hourly, fetched-at and attribution only", async () => {
    renderPage();

    const table = await screen.findByRole("table");
    expect(table.querySelector("caption")?.textContent).toMatch(
      /Three-day weather forecast/,
    );
    const weatherToggle = screen.getByRole("button", {
      name: "Weather",
    });
    const weatherBodyId = weatherToggle.getAttribute("aria-controls")!;
    const weatherBody = document.getElementById(weatherBodyId)!;
    expect(weatherBody.querySelector("table")).toBeNull();
    expect(
      within(weatherBody).getByRole("list", { name: "24-hour hourly strip" }),
    ).toBeInTheDocument();
    expect(weatherBody.querySelector(".weather-block__fetched")).not.toBeNull();
    expect(
      weatherBody.querySelector(".weather-block__attribution"),
    ).not.toBeNull();

    // Nothing duplicates: one fetched-at line, one attribution, one daily table.
    expect(document.querySelectorAll(".weather-block__fetched")).toHaveLength(
      1,
    );
    expect(
      document.querySelectorAll(".weather-block__attribution"),
    ).toHaveLength(1);
    expect(screen.getAllByRole("table")).toHaveLength(1);
  });

  it("groups daylight plus external maps left and Weather plus Three-day weather forecast right", async () => {
    renderPage();

    await screen.findByRole("table");
    const left = document.querySelector(".conditions__col--left")!;
    const right = document.querySelector(".conditions__col--right")!;
    const toggleNames = (scope: Element): string[] =>
      Array.from(scope.querySelectorAll(".collapsible-panel__toggle")).map(
        (button) => button.textContent ?? "",
      );
    // Column membership is the contract; the narrow-width visual stack
    // order (daylight, Weather, 3-day, external maps) rides on CSS order
    // and is asserted by the Playwright layout spec, which sees layout.
    expect(toggleNames(left)).toEqual([
      expect.stringContaining("Today's daylight chart"),
      expect.stringContaining("External maps"),
    ]);
    expect(toggleNames(right)).toEqual([
      expect.stringContaining("Weather"),
      expect.stringContaining("Three-day weather forecast"),
    ]);
  });

  it("collapses Weather and the Three-day weather forecast independently", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();

    await screen.findByRole("table");
    const weatherToggle = screen.getByRole("button", {
      name: "Weather",
    });
    const threeDayToggle = screen.getByRole("button", {
      name: "Three-day weather forecast",
    });

    await user.click(weatherToggle);
    expect(weatherToggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("table")).toBeInTheDocument();

    await user.click(threeDayToggle);
    expect(threeDayToggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    await user.click(weatherToggle);
    expect(weatherToggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows its own stale-data notice while the saved 3-day table survives a failed refetch", async () => {
    saveWeather(localStorage, 67.8558, 20.2253, savedWeather());
    mockFetch.mockRejectedValue(new TypeError("failed to fetch"));
    renderPage();

    expect(
      await screen.findByText(
        "Couldn't refresh the Three-day weather forecast – showing the last data.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });
});
